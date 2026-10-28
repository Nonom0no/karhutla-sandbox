# FRONTEND_SPEC — React + Vite + TypeScript + three.js (react-three-fiber)

> Menggantikan versi Leaflet 2D. Gaya visual: diorama low-poly seperti mainan (ala TABS): bentuk tebal, flat shading, warna cerah-hangat, bayangan lembut.

## 1. Prinsip
- Render lewat `@react-three/fiber` + `drei` (`OrbitControls`, dsb.). Tidak ada peta/tile nyata; dunia = diorama sintetis.
- `InstancedMesh` untuk semua sel; **tidak** ada satu elemen React per sel.
- State via `useReducer` (tanpa library state). Nama field API snake_case di `src/api/types.ts`.
- Logika (koordinat, state visual, bucketing) = fungsi murni di `src/lib/` + unit test; komponen scene tipis.
- Teks UI Bahasa Indonesia.

## 2. Komponen
| Komponen | Isi |
|----------|-----|
| `App` | layout, provider state, memuat region via `getRegions()` (client API) |
| `scene/SceneView` | `<Canvas>`, kamera, cahaya, kabut/latar langit, `OrbitControls`, overlay HTML |
| `scene/Ground` | alas diorama (kotak tebal berwarna) + bidang raycast untuk klik |
| `scene/Vegetation` | `InstancedMesh` pohon/rumput dari `fuel`, juga ubin air dan tepi |
| `scene/FireLayer` | menerapkan state api/arang ke instance + `InstancedMesh` api |
| `scene/IgnitionMarkers` | obor kecil beranimasi di titik api |
| `scene/WindFx` | indikator angin (aliran panah/serpihan) dan asap (fase polesan) |
| `ControlPanel` | pilih region; slider `fire_intensity`, `wind_speed`, `fuel_moisture`, `steps`; `Compass`; tombol Jalankan/Reset |
| `Compass` | kompas SVG (tetap, lihat §7) |
| `TimeControls`, `StatsPanel` | slider waktu/play/kecepatan; statistik |
| `LimitationsBanner` | teks batasan domain |

## 3. State (`src/state/`)
Bidang yang ada tetap: `regions, regionId, params, ignitionPoints, status, result, ignition, t, playing, speed, error`. Tambahan:
```
fuel: Uint8Array | null          // hasil decode GET /api/regions/{id}/fuel, nilai = round(fuel*255)
quality: 'high' | 'low'          // default: 'low' jika layar ≤ 768 px atau perangkat sentuh, selain itu 'high'
```
Aksi baru: `SET_FUEL`, `SET_QUALITY`. Ganti `regionId` → kosongkan `fuel`, titik, hasil, `t`, lalu muat fuel region baru (batalkan request lama dengan `AbortController`).

## 4. Koordinat dunia (kanonik; wajib identik di kode dan tes)
- 1 sel = 1 satuan dunia. Grid `H x W` dipusatkan di origin.
- `x = col − W/2 + 0.5` (timur = +x); `z = row − H/2 + 0.5` (selatan = +z, **utara = −z**); `y` = atas.
- Kamera default menghadap utara (melihat ke −z) dari selatan, sudut pandang miring ±45°.
- Sel dari titik dunia: `col = floor(x + W/2)`, `row = floor(z + H/2)` (di luar [0,W)/[0,H) → di luar diorama).
- lat/lon dikirim ke API dari **pusat sel**: `lon = west + (col + 0.5)/W × (east − west)`, `lat = north − (row + 0.5)/H × (north − south)` (server memetakan balik ke sel yang sama; ada tes bolak-balik).
- Arah angin di dunia: vektor tujuan = `(sin(h), cos(h))` dalam (timur, utara) dengan `h = (wind_from_deg + 180) mod 360` → dunia `(x, z) = (sin h, −cos h)`.

## 5. Alur render
1. Saat region dipilih: `GET /api/regions/{id}/fuel` → decode base64 uint8 → `fuel`.
2. `Vegetation` (statis per region/fuel): satu `InstancedMesh` untuk vegetasi, satu untuk ubin air (`fuel == 0` di dalam grid), satu untuk tepi (cincin 1 sel). Sel dengan `fuel > 0` dapat instance dengan skala tinggi `∝ fuel`, jitter posisi/rotasi/skala deterministik dari hash indeks sel (bukan `Math.random`), warna per-instance dari tema region (§6) dan sedikit digeser kering/basah oleh slider `fuel_moisture` (hanya warna, murni klien).
3. Setelah `POST /api/simulate`: decode `ignition_time` → `Int16Array`; bangun **bucket**: untuk tiap nilai `v ≥ 0`, daftar indeks sel (counting sort, O(H·W) sekali).
4. Untuk frame `t`, status sel ditentukan oleh `cellVisualState(v, t)`:
   - `v < 0` atau `v > t` → `unburned`
   - `0 ≤ t − v < BURNING_DISPLAY_STEPS` (=3, hanya visual) → `burning`
   - selainnya → `burned`
5. Pembaruan instance **hanya saat `t` berubah**:
   - maju `t → t+1`: ubah sel pada bucket `t+1` (→ burning) dan bucket `t+1−3` (→ burned); biaya O(sel berubah).
   - mundur/loncat/ganti hasil: hitung ulang penuh sekali (O(H·W)).
   - setelah mengubah: `instanceMatrix.needsUpdate = true`, `instanceColor.needsUpdate = true` (VERIFIKASI nama properti di dokumentasi three.js `InstancedMesh`).
6. `burning`: vegetasi diwarnai merah-oranye + `InstancedMesh` api (kerucut/ikosahedron kecil) dengan skala berdenyut (berdasarkan waktu global di satu `useFrame`, tanpa alokasi). `burned`: vegetasi mengecil (skala ×0,35) dan berwarna arang. Batas kapasitas api `MAX_FLAMES` = 8000 (VERIFIKASI saat profiling); jika bucket aktif lebih banyak, tampilkan sampel merata.
7. Target: ≥ 30 fps pada grid 200x200 di laptop biasa untuk `quality='high'` (VERIFIKASI; angka diputuskan pemilik proyek). `quality='low'`: tanpa bayangan, DPR ≤ 1,5, tanpa asap, tanpa goyang.

## 6. Gaya visual dan tema region
| `region_id` | Alas | Vegetasi | Karakter |
|-------------|------|----------|----------|
| `tropical_rainforest` | hijau tua | pohon bulat/ikosahedron kanopi besar, rapat, tinggi | lebat, lembap |
| `dry_forest` | cokelat-oranye pucat | pohon kerucut ramping, warna zaitun/kuning | kering, jarang |
| `grassland` | kuning-hijau | rumput rumpun pendek (kerucut kecil berkelompok) | terbuka, cepat menyala |
- Ubin air: biru cerah, sedikit lebih rendah dari alas. Tepi: dinding/batas berwarna netral, menegaskan "diorama".
- Pencahayaan: `hemisphereLight` + satu `directionalLight` hangat (bayangan di `high`), latar langit gradasi hangat, kabut ringan. Semua material `flatShading`.
- Palet didefinisikan di satu berkas konstanta (`src/scene/theme.ts`); jangan tulis warna tersebar. Kontras api vs vegetasi harus jelas.
- Polesan (tugas 3D-07): goyang pohon oleh angin dan serpihan/asap yang hanyut searah angin; keduanya mati pada `prefers-reduced-motion` dan di `quality='low'`. VERIFIKASI: teknik goyang (shader via `onBeforeCompile` vs transformasi per-instance) sebelum diimplementasi.

## 7. Kompas SVG (tidak berubah)
- 0° = atas (utara), searah jarum jam; nilai = `wind_from_deg` (arah DATANGnya angin). Handle di sudut `wind_from_deg`, panah ke arah tujuan, teks "Angin dari {deg}° ({mata angin})".
- Pointer Events + `setPointerCapture`; `touch-action: none`; sudut = `(atan2(dx, −dy)·180/π + 360) mod 360`.
- `role="slider"`, `aria-valuemin=0`, `aria-valuemax=359`, `aria-valuenow`, `aria-valuetext`; panah keyboard ±1°, Shift ±15°.
- Fungsi murni di `src/lib/angle.ts`.

## 8. Interaksi
- **Kamera**: `OrbitControls`: rotasi (satu jari/klik kiri), zoom (cubit/gulir), geser terbatas; batas `minPolarAngle`/`maxPolarAngle` agar tidak tembus tanah, `minDistance`/`maxDistance` wajar. Tombol "Reset kamera".
- **Titik api**: klik/ketuk alas → raycast ke bidang tanah → sel → titik (maks 5). Bedakan klik dari drag kamera: perpindahan pointer < 5 px dan durasi < 300 ms. Klik obor → hapus.
- Sel `fuel == 0` (air) atau di luar diorama: tampilkan petunjuk "Tidak bisa menyulut api di sini"; server tetap memvalidasi (`IGNITION_ON_NON_FUEL`).
- **Slider waktu/play**: slider `t` 0..`steps_run`; menggeser = jeda. Play: `requestAnimationFrame`, kecepatan dasar 10 langkah/detik × `speed` (0,5/1/2/4); berhenti di `steps_run` (tombol jadi "Ulang"). `prefers-reduced-motion`: tidak auto-play. Loop animasi memakai referensi (ref) untuk status putar; tidak bergantung pada `state.playing` di dependency effect.
- Tombol "Jalankan" nonaktif jika titik = 0 atau `fuel` belum dimuat.

## 9. Batasan Domain (teks kanonik, `LIMITATIONS_TEXT_ID`)
> Model ini hanya menyimulasikan penyebaran api permukaan. Kebakaran gambut (membara di bawah tanah) tidak dimodelkan. Hasil bersifat kualitatif dan edukatif, bukan prediksi operasional.

`LimitationsBanner` = elemen HTML di atas `<Canvas>` (bukan di dalam scene) dan selalu terlihat. Teks yang sama diulang di `StatsPanel`. Konstanta tunggal di `src/lib/text.ts`; uji komponen memastikan teksnya ada.

## 10. Tampilan mobile (≤ 768 px)
- Satu kolom: scene di atas (±60vh), kontrol di bawah (panel lipat); `TimeControls` menempel di bawah scene.
- Target sentuh ≥ 44×44 px; kompas ≥ 160 px; tanpa scroll horizontal pada lebar ≥ 360 px.
- `OrbitControls` memakai gestur sentuh; `touch-action: none` hanya pada canvas. `quality` otomatis `'low'` di sini; pengguna dapat mengubahnya (toggle "Mode performa rendah").
- Desktop (> 768 px): panel kontrol kiri (±340 px), scene mengisi sisanya.

## 11. Error, loading, konfigurasi
- Loading: indikator saat memuat fuel dan saat simulasi; tombol nonaktif. Pemetaan `error.code` → pesan Indonesia untuk semua kode di API_SPEC §6 (+ `REGION_NOT_FOUND`); gagal jaringan → "Tidak dapat terhubung ke server".
- WebGL tidak tersedia → pesan "Peramban Anda tidak mendukung WebGL" (tidak crash).
- `VITE_API_BASE_URL` (default `http://localhost:8000`) hanya dibaca di `src/api/client.ts`; `.env.example` mendokumentasikannya.
- Aset 3D: semua prosedural (geometri bawaan three); tanpa file model eksternal di MVP.

## 12. Pengujian
- Unit (vitest, tanpa WebGL): `gridToWorld`, `worldToCell`, `cellToLatLon` (bolak-balik dengan konversi server), `decodeFuel`, `cellVisualState`, `bucketByIgnition`, `diffCells(tPrev, tNext)`, `windVectorWorld`, `hashJitter` (deterministik).
- Komponen: render `App` dengan `Canvas` di-mock (jsdom tidak punya WebGL): banner batasan ada, kontrol bekerja. VERIFIKASI: perlu tidaknya `@react-three/test-renderer` (jangan menambah dependensi tanpa izin).