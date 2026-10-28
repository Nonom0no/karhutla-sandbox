# FRONTEND_SPEC — React + Vite + TypeScript + Leaflet

## 1. Prinsip
Plain Leaflet (tanpa react-leaflet), `useReducer` (tanpa library state), kompas SVG buatan sendiri. Teks UI Bahasa Indonesia. Nama field API tetap snake_case di `src/api/types.ts`.

## 2. Komponen
| Komponen | Isi |
|----------|-----|
| `App` | layout, provider state, memuat `/regions` saat mount |
| `MapView` | peta Leaflet, tile dasar, overlay hasil, marker titik api, klik peta |
| `ControlPanel` | pilih region; slider `fire_intensity`, `wind_speed`, `fuel_moisture`, `steps`; `Compass`; tombol "Jalankan simulasi" dan "Reset" |
| `Compass` | kompas SVG interaktif untuk `wind_from_deg` |
| `TimeControls` | slider waktu `t`, tombol play/pause, kecepatan putar |
| `StatsPanel` | `burned_cells`, `burned_fraction`, `burned_area_ha`, `steps_run`, `seed` |
| `LimitationsBanner` | teks batasan domain (selalu terlihat) |

## 3. State (`src/state/reducer.ts`)
```
regions: Region[]                    regionId: string
params: { fire_intensity, wind_speed, wind_from_deg, fuel_moisture, steps, seed?: number }
ignitionPoints: {lat, lon}[]         (maks 5)
status: 'idle' | 'loading' | 'done' | 'error'
result: SimulationResult | null      ignition: Int16Array | null  (hasil decode)
t: number (0..steps_run)             playing: boolean   speed: 0.5 | 1 | 2 | 4
error: { code, message } | null
```
Ganti `regionId` → set `params` ke `default_params` region, kosongkan titik, hasil, dan `t`. Respons lama yang tiba setelah request baru dibatalkan (`AbortController`) diabaikan.

## 4. Alur render canvas → imageOverlay
1. Setelah `POST /simulate`: decode `ignition_time.data` (base64 → bytes → `Int16Array` via `DataView.getInt16(i*2, true)`; jangan mengandalkan endianness host).
2. Buat `<canvas>` offscreen berukuran `W x H` (piksel = sel); simpan `ImageData` (`Uint32Array` view) yang dipakai ulang.
3. Untuk frame `t`, untuk tiap sel dengan nilai `v = ignition[i]`:
   - `v < 0` atau `v > t` → transparan.
   - `t - v < BURNING_DISPLAY_STEPS` (=3, hanya visual, bukan bagian model) → warna "terbakar" (oranye-merah).
   - selainnya → warna "bekas terbakar" (abu gelap, alfa ~0,7).
4. `ctx.putImageData` → `canvas.toDataURL('image/png')` → `overlay.setUrl(dataUrl)`.
5. Overlay dibuat sekali per hasil: `L.imageOverlay(url, [[south, west], [north, east]], { opacity: 0.85, interactive: false, className: 'fire-overlay' })`; CSS `.fire-overlay { image-rendering: pixelated; }`. VERIFIKASI: opsi `className` pada `L.imageOverlay` di Leaflet 1.9.x (https://leafletjs.com/reference.html#imageoverlay).
6. Peta di-`fitBounds` ke bbox region saat region berubah. Tile dasar OpenStreetMap dengan atribusi yang benar. VERIFIKASI: kebijakan pemakaian tile OSM (https://operations.osmfoundation.org/policies/tiles/) untuk penggunaan non-dev.
7. Target: ganti frame < 50 ms pada 200x200.

## 5. Kompas SVG
- Konvensi: 0° = atas (utara), searah jarum jam; nilai yang disimpan = `wind_from_deg` (arah DATANGnya angin).
- Visual: cincin dengan label U/T/S/B; **handle** (lingkaran) di sudut `wind_from_deg` pada cincin; **panah** dari handle menembus pusat menuju sisi seberang (arah tujuan angin); teks "Angin dari {deg}° ({mata angin})".
- Interaksi: Pointer Events (`pointerdown/move/up` + `setPointerCapture`), sudut = `(atan2(dx, -dy) × 180/π + 360) % 360` dengan `dx, dy` relatif pusat SVG; `touch-action: none`.
- Aksesibilitas: `role="slider"`, `aria-valuemin=0`, `aria-valuemax=359`, `aria-valuenow`, `aria-valuetext` (mis. "270 derajat, dari barat"); panah keyboard ±1°, Shift+panah ±15°.
- Fungsi murni di `src/lib/angle.ts` (diuji): `pointerToDeg`, `degToCompassLabel` (8 arah), `normalizeDeg`.

## 6. Slider waktu dan putar
- Slider `t` rentang `0..steps_run`, langkah 1. Menggeser slider menjeda pemutaran.
- Play/pause: loop `requestAnimationFrame`; maju `speed × 10` langkah/detik (kecepatan dasar 10 langkah/detik); berhenti di `steps_run` (tombol berubah jadi "ulang"). `prefers-reduced-motion`: tidak auto-play setelah simulasi selesai.

## 7. Pemilihan titik api
- Klik peta di dalam bbox → tambah titik (maks 5); klik marker → hapus. Di luar bbox: abaikan dan tampilkan petunjuk "Klik di dalam area".
- Tombol "Jalankan" nonaktif jika titik = 0.
- Konversi lat/lon ke sel tidak dilakukan di klien (server yang menentukan); klien hanya mengirim `lat`, `lon`.
- Error `IGNITION_ON_NON_FUEL` → pesan "Titik jatuh di area tanpa bahan bakar (mis. sungai). Pilih titik lain."

## 8. Batasan Domain (teks kanonik, `LIMITATIONS_TEXT_ID`)
> Model ini hanya menyimulasikan penyebaran api permukaan. Kebakaran gambut (membara di bawah tanah) tidak dimodelkan. Hasil bersifat kualitatif dan edukatif, bukan prediksi operasional.

`LimitationsBanner` selalu terlihat (tidak dapat ditutup permanen) di bawah header, dan teks yang sama diulang di `StatsPanel`. Konstanta tunggal di `src/lib/text.ts`; uji komponen memastikan teksnya ada.

## 9. Tampilan mobile (≤ 768 px)
- Layout satu kolom: peta di atas (±60vh), `ControlPanel` di bawah sebagai panel yang dapat dilipat; `TimeControls` menempel di bawah peta.
- Target sentuh ≥ 44×44 px; kompas ≥ 160 px; tanpa scroll horizontal pada lebar ≥ 360 px.
- Desktop (> 768 px): panel kontrol di sisi kiri (±340 px), peta mengisi sisanya.

## 10. Penanganan error dan loading
Indikator loading saat request; tombol dinonaktifkan. Pemetaan `error.code` → pesan Indonesia: `VALIDATION_ERROR`, `UNKNOWN_REGION`, `IGNITION_OUT_OF_BOUNDS`, `IGNITION_ON_NON_FUEL`, `SIMULATION_NOT_FOUND`, `INTERNAL_ERROR`; gagal jaringan → "Tidak dapat terhubung ke server".

## 11. Konfigurasi
`VITE_API_BASE_URL` (default `http://localhost:8000`), didokumentasikan di `frontend/.env.example`.