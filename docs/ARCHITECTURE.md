# ARCHITECTURE — Karhutla Sandbox

## 1. Alur data (teks)
```
[Browser: React + Leaflet]
   │ 1. GET /regions                      → daftar preset, bbox, default_params
   │ 2. user: pilih region, klik titik api (lat/lon), atur slider & kompas
   │ 3. POST /simulate  (JSON request)
   ▼
[FastAPI: app/api/routes.py]
   │ validasi (Pydantic v2) → konversi lat/lon → (row, col) memakai bbox region
   │ muat fuel grid .npy (cache di memori) → fuel_eff = fuel * dryness_multiplier(m)
   │ p_base = intensity_to_p_base(fire_intensity)
   ▼
[app/sim/ca.py: run_simulation(...)]   (NumPy, np.roll, rng = default_rng(seed))
   │ hasil: ignition_time int16 (H x W), steps_run
   ▼
[app/sim/encoding.py] → base64(int16 little-endian)
   │ simpan di [app/store.py] (in-memory, TTL 1800 s, maks 100 entri)
   ▼
JSON response (satu array ignition_time + metadata)
   ▼
[Browser] decode base64 → Int16Array
   │ slider waktu t → state sel: ignition_time ∈ [0, t] → warna
   │ gambar ke <canvas> H x W → canvas.toDataURL() → L.imageOverlay.setUrl()
   │ CSS image-rendering: pixelated
```
`GET /simulation/{id}` mengembalikan body yang sama selama belum kedaluwarsa.

## 2. Komponen
| Komponen | Tanggung jawab |
|----------|----------------|
| `app/sim/params.py` | konstanta, rentang, mapping slider → parameter model |
| `app/sim/ca.py` | `step()` (referensi di SIMULATION_SPEC) dan `run_simulation()` |
| `app/sim/regions.py` | registri preset, memuat `.npy`, bbox, default |
| `app/sim/encoding.py` | encode/decode `ignition_time` (base64 int16 LE) |
| `app/store.py` | penyimpanan hasil in-memory + TTL + batas entri |
| `app/api/schemas.py` | model Pydantic request/response |
| `app/api/routes.py` | endpoint |
| `app/api/errors.py` | envelope error seragam |
| `frontend/src/lib/decode.ts` | base64 → `Int16Array` |
| `frontend/src/lib/render.ts` | `ignition_time` + t → `ImageData` |
| `frontend/src/components/*` | MapView, Compass, ControlPanel, TimeControls, StatsPanel, LimitationsBanner |

## 3. Struktur repo
```
karhutla-sandbox/
├── AGENTS.md
├── opencode.json
├── .opencode/
│   ├── agents/{sim-engineer.md, frontend-engineer.md, reviewer.md}
│   └── commands/{next-task.md, verify.md, review.md}
├── docs/
│   ├── PRD.md  ARCHITECTURE.md  SIMULATION_SPEC.md  API_SPEC.md
│   ├── FRONTEND_SPEC.md  DATA_SOURCES.md  ROADMAP.md  ML_PHASE.md
├── backend/
│   ├── pyproject.toml
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI app, CORS, error handlers
│   │   ├── config.py          # env: CORS_ORIGINS, RESULT_TTL_SECONDS, RESULT_MAX_ENTRIES
│   │   ├── store.py
│   │   ├── api/{__init__.py, routes.py, schemas.py, errors.py}
│   │   ├── sim/{__init__.py, ca.py, params.py, regions.py, encoding.py}
│   │   └── data/fuel/{tropical_rainforest.npy, dry_forest.npy, grassland.npy}
│   ├── scripts/generate_fuel_grids.py
│   └── tests/{test_params.py, test_ca.py, test_regions.py, test_encoding.py,
│              test_store.py, test_api.py, test_api_contract.py}
└── frontend/
    ├── package.json  vite.config.ts  tsconfig.json  index.html  .env.example
    └── src/
        ├── main.tsx  App.tsx  styles.css
        ├── api/{client.ts, types.ts}
        ├── lib/{decode.ts, render.ts, geo.ts, angle.ts}
        ├── state/{reducer.ts, context.tsx}
        └── components/{MapView.tsx, Compass.tsx, ControlPanel.tsx,
                        TimeControls.tsx, StatsPanel.tsx, LimitationsBanner.tsx}
```

## 4. Keputusan arsitektur
| # | Keputusan | Alasan |
|---|-----------|--------|
| A1 | Simulator CA buatan sendiri (NumPy, `np.roll`) | DisSModel hanya Rook tanpa angin/fuel; PROPAGATOR tidak terverifikasi; kontrol penuh, mudah diuji |
| A2 | API mengembalikan satu `ignition_time` | Payload kecil (~107 KB untuk 200x200), slider klien tinggal memfilter, tanpa permintaan per frame |
| A3 | int16 LE + base64 | Ringkas, mudah didekode di browser (`DataView`), cukup untuk steps ≤ 500 |
| A4 | Hasil in-memory + TTL | MVP tanpa DB, 1 pengguna/demo; kehilangan data saat restart dapat diterima |
| A5 | `POST /simulate` sinkron | Simulasi < 2 s; menghindari antrean/worker |
| A6 | Fuel grid `.npy` di repo | Demo tanpa jaringan ke API data; deterministik; LANDFIRE tidak mencakup Indonesia |
| A7 | Plain Leaflet + `imageOverlay` | Grid raster kecil; `pixelated` menjaga sel tajam; tanpa dependensi tambahan |
| A8 | Kompas SVG buatan sendiri | Tanpa library; kontrol penuh konvensi sudut |
| A9 | `seed` dipantulkan di respons | Reproduksibilitas untuk pengajaran dan pengujian |
| A10 | Konversi lat/lon → sel di server | Satu sumber kebenaran untuk bbox dan validasi |