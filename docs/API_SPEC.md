# API_SPEC — Karhutla Sandbox API

Base URL dev: `http://localhost:8000`. Format: JSON (UTF-8). Tanpa autentikasi. Dokumen OpenAPI otomatis FastAPI (`/docs`) tidak menggantikan dokumen ini; dokumen ini kontrak resmi.

## 1. Endpoint ringkas
| Method | Path | Fungsi | Sukses |
|--------|------|--------|--------|
| GET | `/health` | status layanan | 200 |
| GET | `/regions` | daftar preset wilayah | 200 |
| POST | `/simulate` | jalankan simulasi (sinkron) | 200 |
| GET | `/simulation/{id}` | ambil hasil tersimpan | 200 |

## 2. `GET /health`
```json
{ "status": "ok", "version": "0.1.0" }
```

## 3. `GET /regions`
```json
{
  "regions": [
    {
      "id": "dry_forest",
      "name": "Hutan Mengering",
      "description": "Vegetasi hutan dengan fuel sedang-tinggi dan kelembapan rendah.",
      "grid": { "height": 200, "width": 200, "cell_size_m": 30, "bbox": [101.500, 0.500, 101.554, 0.554] },
      "default_params": {
        "fire_intensity": 60, "wind_speed": 5.0, "wind_from_deg": 270,
        "fuel_moisture": 0.4, "steps": 200
      }
    }
  ]
}
```
`bbox` = `[west, south, east, north]` (derajat, WGS84). Id yang valid: `tropical_rainforest`, `dry_forest`, `grassland`.

## 4. `POST /simulate`
### Request
```json
{
  "region_id": "dry_forest",
  "ignition_points": [ { "lat": 0.527, "lon": 101.527 } ],
  "fire_intensity": 60,
  "wind_speed": 5.0,
  "wind_from_deg": 270,
  "fuel_moisture": 0.4,
  "steps": 200,
  "seed": 42
}
```
| Field | Tipe | Wajib | Batas |
|-------|------|-------|-------|
| `region_id` | string | ya | salah satu id di `/regions` |
| `ignition_points` | array of `{lat, lon}` | ya | 1–5 titik; di dalam bbox; sel fuel > 0 |
| `fire_intensity` | integer | tidak (60) | 1–100 |
| `wind_speed` | number | tidak (5.0) | 0–20 (m/s) |
| `wind_from_deg` | number | tidak (270) | 0 ≤ x < 360 |
| `fuel_moisture` | number | tidak (default region) | 0–1 |
| `steps` | integer | tidak (200) | 1–500 |
| `seed` | integer | tidak (acak) | 0–4294967295 |

Field tak dikenal ditolak (`extra="forbid"`).

### Response 200
```json
{
  "id": "b3f1c2d4e5a64f0f9c1d2e3a4b5c6d7e",
  "status": "done",
  "created_at": "2026-10-28T02:19:00Z",
  "expires_at": "2026-10-28T02:49:00Z",
  "region_id": "dry_forest",
  "seed": 42,
  "params": {
    "ignition_points": [ { "lat": 0.527, "lon": 101.527 } ],
    "fire_intensity": 60,
    "wind_speed": 5.0,
    "wind_from_deg": 270,
    "fuel_moisture": 0.4
  },
  "derived": { "p_base": 0.3783, "dryness_multiplier": 0.94, "k": 0.1 },
  "grid": { "height": 200, "width": 200, "cell_size_m": 30, "bbox": [101.500, 0.500, 101.554, 0.554] },
  "steps": 200,
  "steps_run": 143,
  "ignition_time": {
    "encoding": "base64-int16-le",
    "dtype": "int16",
    "order": "row-major",
    "data": "//////////8AAP//...(80.000 byte mentah, base64)"
  },
  "stats": { "burned_cells": 9876, "burned_fraction": 0.2469, "burned_area_ha": 888.84 }
}
```
- `ignition_time`: lihat docs/SIMULATION_SPEC.md §7 (`-1` = tidak terbakar; titik awal = `0`).
- `burned_cells` = jumlah sel dengan `ignition_time >= 0` (termasuk titik awal). `burned_fraction` = `burned_cells / (H·W)` dibulatkan 4 desimal. `burned_area_ha` = `burned_cells × 0.09`, dibulatkan 2 desimal.
- `steps` = nilai yang diminta; `steps_run` = yang benar-benar dijalankan.
- Ukuran tipikal: `H·W·2` = 80.000 byte mentah ≈ 106,7 KB base64.

## 5. `GET /simulation/{id}`
Mengembalikan body identik dengan respons `POST /simulate`. `404 SIMULATION_NOT_FOUND` jika id tak ada atau sudah kedaluwarsa.

## 6. Validasi, batas, kode error
Envelope error seragam (semua error, termasuk validasi FastAPI/Pydantic yang harus dipetakan):
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "wind_speed must be <= 20",
             "details": [ { "field": "wind_speed", "issue": "less_than_equal" } ] } }
```
| HTTP | `code` | Kondisi |
|------|--------|---------|
| 422 | `VALIDATION_ERROR` | skema/rentang tidak valid, field asing, `ignition_points` kosong atau > 5 |
| 422 | `UNKNOWN_REGION` | `region_id` tidak dikenal |
| 422 | `IGNITION_OUT_OF_BOUNDS` | titik di luar bbox region |
| 422 | `IGNITION_ON_NON_FUEL` | titik jatuh pada sel `fuel_eff == 0` |
| 404 | `SIMULATION_NOT_FOUND` | id tak ada/kedaluwarsa |
| 500 | `INTERNAL_ERROR` | kesalahan tak terduga (pesan generik, tanpa stack trace) |
Batas keras: `H·W ≤ 65.536`, `steps ≤ 500`, `ignition_points ≤ 5`. Tanpa rate-limit di MVP (VERIFIKASI jika di-deploy publik).

## 7. Penyimpanan hasil
In-memory (dict) di `app/store.py`: TTL **1800 detik** (`RESULT_TTL_SECONDS`), maksimum **100** entri (`RESULT_MAX_ENTRIES`), buang yang terlama (FIFO/LRU) saat penuh; kedaluwarsa dibersihkan secara malas (saat akses/tulis). `id` = `uuid4().hex`. Hasil hilang saat server restart (diterima untuk MVP). Satu proses worker saja (VERIFIKASI: jangan jalankan `--workers >1` karena store tidak dibagi).

## 8. CORS
`CORSMiddleware`: `allow_origins` dari env `CORS_ORIGINS` (default `http://localhost:5173,http://127.0.0.1:5173`, dipisah koma), `allow_methods=["GET","POST","OPTIONS"]`, `allow_headers=["Content-Type"]`, `allow_credentials=False`.

## 9. Perubahan kontrak
Perubahan field/semantik harus diperbarui di dokumen ini **terlebih dahulu**, lalu `schemas.py`, `frontend/src/api/types.ts`, dan `backend/tests/test_api_contract.py` dalam perubahan yang sama.