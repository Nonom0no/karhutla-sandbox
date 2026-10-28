# ROADMAP

Konvensi: tiap tugas muat dalam satu sesi agent. Centang `- [x]` setelah **Cara uji** lulus. Urutan wajib berurutan kecuali disebut. Perintah ada di AGENTS.md. Agent yang cocok: `@sim-engineer` (P1), `@frontend-engineer` (P2, P3 kecuali disebut).

## Fase 1 — Simulator dan API backend (minggu 1–3)

- [x] **P1-01 — Scaffold backend**
  - Tujuan: proyek FastAPI minimal dengan `GET /health`, pytest, ruff.
  - File: `backend/pyproject.toml`, `backend/app/{__init__,main,config}.py`, `backend/tests/test_api.py`.
  - Acceptance: `uvicorn app.main:app` jalan; `/health` → `{"status":"ok","version":"0.1.0"}`; `pip install -e ".[dev]"` berhasil.
  - Uji: `pytest -q` dan `ruff check .` lulus.

- [x] **P1-02 — Parameter dan mapping**
  - Tujuan: konstanta/rentang dan fungsi `intensity_to_p_base`, `dryness_multiplier`.
  - File: `backend/app/sim/params.py`, `backend/tests/test_params.py`.
  - Acceptance: nilai sesuai SIMULATION_SPEC §5 (T-SIM-10).
  - Uji: `pytest -q tests/test_params.py`.

- [x] **P1-03 — Inti CA**
  - Tujuan: `step()` (sesuai referensi) dan `run_simulation()` yang menghasilkan `ignition_time` dan `steps_run`.
  - File: `backend/app/sim/ca.py`, `backend/tests/test_ca.py`.
  - Acceptance: T-SIM-01…T-SIM-09 lulus; tanpa loop per sel.
  - Uji: `pytest -q tests/test_ca.py`.

- [x] **P1-04 — Fuel grid preset**
  - Tujuan: generator deterministik + 3 file `.npy` + loader region.
  - File: `backend/scripts/generate_fuel_grids.py`, `backend/app/data/fuel/*.npy`, `backend/app/sim/regions.py`, `backend/tests/test_regions.py`.
  - Acceptance: T-SIM-12 lulus; menjalankan generator dua kali menghasilkan file identik; registri memuat id, nama, bbox, default_params sesuai SIMULATION_SPEC §6.
  - Uji: `python scripts/generate_fuel_grids.py && pytest -q tests/test_regions.py`.

- [x] **P1-05 — Encoding**
  - Tujuan: encode/decode base64 int16 LE.
  - File: `backend/app/sim/encoding.py`, `backend/tests/test_encoding.py`.
  - Acceptance: T-SIM-11 lulus; nilai −1 dan 0 dan 500 terjaga.
  - Uji: `pytest -q tests/test_encoding.py`.

- [x] **P1-06 — Result store**
  - Tujuan: store in-memory dengan TTL dan batas entri.
  - File: `backend/app/store.py`, `backend/tests/test_store.py`.
  - Acceptance: TTL 1800 s, maks 100 entri, buang terlama; fungsi waktu dapat disuntik (jam palsu) untuk tes.
  - Uji: `pytest -q tests/test_store.py`.

- [x] **P1-07 — Endpoint, error, CORS**
  - Tujuan: `POST /simulate`, `GET /simulation/{id}`, `GET /regions`, envelope error, CORS.
  - File: `backend/app/api/{routes,schemas,errors}.py`, `backend/app/main.py`, `backend/tests/{test_api,test_api_contract}.py`.
  - Acceptance: skema dan kode error persis API_SPEC; konversi lat/lon→sel; T-SIM-13; `test_api_contract.py` memeriksa kunci respons terhadap contoh di API_SPEC.
  - Uji: `pytest -q` dan `ruff check .`.

- [x] **P1-08 — Profiling dan performa**
  - Tujuan: ukur `POST /simulate` default (dry_forest, steps=200); optimasi NumPy bila p95 > 2 s.
  - File: `backend/scripts/bench.py` (baru), `backend/app/sim/ca.py` (jika perlu).
  - Acceptance: p95 < 2 s dan respons < 200 KB (KS-01, KS-02); Numba hanya jika optimasi NumPy tidak cukup dan **setelah izin pengguna**; jika urutan rng berubah, perbarui tes dan SIMULATION_SPEC §3.
  - Uji: `python scripts/bench.py` mencetak p50/p95; `pytest -q`.

## Fase 2 — Frontend inti (minggu 3–5)

- [x] **P2-01 — Scaffold frontend**
  - Tujuan: Vite + React + TS strict, eslint, vitest, `.env.example`.
  - File: `frontend/package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/{main,App}.tsx`, `.env.example`.
  - Acceptance: `npm run dev` menampilkan halaman; skrip `dev`, `build`, `test`, `lint`, `typecheck` ada dan jalan.
  - Uji: `npm run typecheck && npm run lint && npm run test && npm run build`.

- [x] **P2-02 — Klien API, tipe, decode**
  - Tujuan: `src/api/{client,types}.ts`, `src/lib/decode.ts`.
  - Acceptance: tipe sama dengan API_SPEC; decode base64→`Int16Array` memakai `DataView` little-endian; error envelope diparse.
  - Uji: vitest dengan vektor uji (nilai −1, 0, 500) dan fetch yang di-mock.

- [x] **P2-03 — MapView dasar**
  - Tujuan: peta Leaflet dengan tile OSM + atribusi, `fitBounds` ke bbox region.
  - File: `src/components/MapView.tsx`, `src/lib/geo.ts`.
  - Acceptance: peta tampil, bbox terlihat sebagai batas persegi tipis, tanpa kebocoran instance peta saat unmount.
  - Uji: `npm run test`; cek manual di `npm run dev`.

- [x] **P2-04 — State dan pemilih region**
  - Tujuan: reducer/context; muat `/regions`; ganti region mereset state.
  - File: `src/state/{reducer,context}.tsx`, `ControlPanel.tsx`.
  - Acceptance: sesuai FRONTEND_SPEC §3; default_params terisi.
  - Uji: vitest reducer (ganti region, tambah/hapus titik, batas 5).

- [x] **P2-05 — Slider parameter**
  - Tujuan: slider `fire_intensity`, `wind_speed`, `fuel_moisture`, `steps`.
  - Acceptance: rentang, langkah, dan default = API_SPEC §4; label Indonesia dengan satuan.
  - Uji: vitest render + perubahan nilai; `npm run lint`.

- [ ] **P2-06 — Kompas SVG**
  - Tujuan: `Compass.tsx` + `lib/angle.ts` sesuai FRONTEND_SPEC §5.
  - Acceptance: drag mouse/sentuh; keyboard ±1°/±15°; 270° = handle di kiri, panah ke kanan.
  - Uji: vitest untuk `pointerToDeg` (0,90,180,270), `degToCompassLabel`, `normalizeDeg`.

- [ ] **P2-07 — Titik api via klik peta**
  - Tujuan: tambah/hapus marker, maks 5, hanya di dalam bbox.
  - Acceptance: tombol "Jalankan" nonaktif tanpa titik; petunjuk di luar bbox.
  - Uji: vitest logika `isInsideBbox`; cek manual.

- [ ] **P2-08 — Jalankan simulasi dan render overlay**
  - Tujuan: `POST /simulate`, decode, `lib/render.ts`, `imageOverlay` dengan `pixelated`.
  - Acceptance: FRONTEND_SPEC §4 terpenuhi; titik awal tampil di `t=0`.
  - Uji: vitest `render.ts` (sel −1 transparan, `v>t` transparan, `t−v<3` warna api, selain itu abu); cek manual dengan backend jalan.

- [ ] **P2-09 — Slider waktu, play/pause, statistik**
  - Tujuan: `TimeControls`, `StatsPanel`.
  - Acceptance: FRONTEND_SPEC §6; statistik sama dengan respons.
  - Uji: vitest logika maju-frame (clamp, berhenti di `steps_run`); cek manual.

## Fase 3 — Pengerasan dan polesan (minggu 6–8)

- [ ] **P3-01 — Banner batasan domain**
  - Tujuan: `LimitationsBanner` + konstanta `text.ts` + ulang di `StatsPanel`.
  - Acceptance: teks identik `LIMITATIONS_TEXT_ID`; selalu terlihat (KS-07).
  - Uji: vitest memeriksa teks pada `App`.

- [ ] **P3-02 — UX error dan loading**
  - Tujuan: pemetaan `error.code` → pesan Indonesia, `AbortController`, state loading.
  - Acceptance: tiap kode di API_SPEC §6 punya pesan; request basi diabaikan.
  - Uji: vitest dengan respons error ter-mock.

- [ ] **P3-03 — Layout mobile**
  - Tujuan: layout ≤ 768 px sesuai FRONTEND_SPEC §9.
  - Acceptance: KS-08; target sentuh ≥ 44 px.
  - Uji: cek manual di emulasi 360×640; `npm run build`.

- [ ] **P3-04 — Tuning default preset**
  - Tujuan: sesuaikan `base_mean`/`amp`/default kelembapan agar demo default `burned_fraction` ≈ 0,10–0,80 (kualitatif).
  - File: `docs/SIMULATION_SPEC.md` (lebih dulu), `generate_fuel_grids.py`, `.npy`, `regions.py`, tes terkait.
  - Acceptance: dokumen dan kode konsisten; semua tes lulus; urutan: rainforest < dry_forest < grassland pada kondisi default yang sama (rata-rata ≥ 10 seed).
  - Uji: skrip tuning sementara + `pytest -q`.

- [ ] **P3-05 — Aksesibilitas**
  - Tujuan: label, fokus, kontras, `prefers-reduced-motion`.
  - Acceptance: semua kontrol dapat dioperasikan keyboard; kompas `role="slider"`.
  - Uji: vitest atribut ARIA; cek manual tab-order.

- [ ] **P3-06 — Dokumentasi pakai dan smoke test manual**
  - Tujuan: `README.md` (quickstart) + daftar periksa smoke manual.
  - Acceptance: orang baru dapat menjalankan backend+frontend hanya dari README.
  - Uji: ikuti README di lingkungan bersih.

- [ ] **P3-07 — Rilis MVP**
  - Tujuan: verifikasi penuh, versi 0.1.0, daftar masalah yang diketahui.
  - Acceptance: KS-01…KS-10 diperiksa; `/verify` bersih.
  - Uji: `/verify` dan `/review`.

## Fase 4 — ML (DITUNDA, ringkas)
Lihat docs/ML_PHASE.md. Tidak dikerjakan di MVP.
- [ ] **P4-01** Generator dataset dari CA (parameter diacak, rata-rata K run).
- [ ] **P4-02** Latih model kecil (U-Net/ConvLSTM, PyTorch) dan evaluasi IoU vs ensemble CA.
- [ ] **P4-03** Ekspor TorchScript/ONNX dan flag `engine=ca|ml` di API.