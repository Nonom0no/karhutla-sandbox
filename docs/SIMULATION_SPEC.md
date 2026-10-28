# SIMULATION_SPEC — Cellular Automaton Karhutla

## 1. Ruang lingkup dan batasan
Model menyimulasikan **penyebaran api permukaan** pada grid 2D. Teks batasan kanonik (`LIMITATIONS_TEXT_ID`):
> Model ini hanya menyimulasikan penyebaran api permukaan. Kebakaran gambut (membara di bawah tanah) tidak dimodelkan. Hasil bersifat kualitatif dan edukatif, bukan prediksi operasional.

## 2. State dan grid
- State sel: `U=0` (belum terbakar), `B=1` (sedang terbakar), `X=2` (sudah terbakar). Tipe `np.uint8`.
- Grid preset: **H = W = 200**, ukuran sel **30 m** (0.09 ha/sel). Batas keras server: H·W ≤ 65.536 (256x256) untuk grid masa depan.
- Tetangga: Moore 8-arah. Sel `B` membakar **tepat 1 langkah** lalu menjadi `X`.
- Tepi grid **harus** `fuel = 0` (karena `np.roll` membungkus). Dijamin oleh `generate_fuel_grids.py` dan diuji.
- Indeks: `row` 0 = utara (atas), `col` 0 = barat (kiri). `dr>0` = ke selatan, `dc>0` = ke timur.

## 3. Referensi perilaku (apa adanya, sudah diuji jalan)
```python
import numpy as np
rng = np.random.default_rng(0)
U, B, X = 0, 1, 2  # unburned, burning, burned

def step(state, fuel, wind_speed, wind_from_deg, p_base=0.3, k=0.1):
    head = np.deg2rad((wind_from_deg + 180) % 360)   # arah tujuan angin
    wx, wy = np.sin(head), np.cos(head)               # (timur, utara)
    burning = state == B
    ignite = np.zeros_like(burning)
    for dr in (-1, 0, 1):
        for dc in (-1, 0, 1):
            if dr == dc == 0:
                continue
            cos = (dc * wx - dr * wy) / np.hypot(dr, dc)
            p = np.minimum(1, p_base * fuel * np.exp(k * wind_speed * cos))
            src = np.roll(burning, (dr, dc), axis=(0, 1))
            ignite |= src & (state == U) & (rng.random(state.shape) < p)
    new = state.copy()
    new[burning] = X
    new[ignite] = B
    return new
```
Catatan perilaku:
- Loop `dr, dc` hanya 8 iterasi per langkah (bukan per sel); vektorisasi dilakukan oleh NumPy.
- Angin "dari" 270° = angin dari barat, api menjalar ke timur.
- Implementasi produksi (`app/sim/ca.py`) **boleh** menerima `rng: np.random.Generator` sebagai argumen alih-alih global; urutan pemanggilan `rng.random` (8 kali per langkah, urutan `dr` lalu `dc`) dipertahankan agar perilaku identik dengan referensi. VERIFIKASI: jika urutan diubah saat optimasi (P1-08), perbarui tes yang bergantung pada seed.

## 4. Konvensi angin
- `wind_from_deg` ∈ [0, 360): arah **datangnya** angin, meteorologis, 0° = dari utara, searah jarum jam (90° = dari timur, 180° = dari selatan, 270° = dari barat).
- `wind_speed` dalam m/s, rentang 0–20.
- Arah tujuan = `(wind_from_deg + 180) % 360`. Faktor angin per arah tetangga = `exp(k · wind_speed · cos θ)`, θ = sudut antara arah penjalaran dan arah tujuan angin.
- `k = 0.1` (konstanta, tidak diekspos). Alasan: pada 20 m/s faktor hembusan searah ≈ e² ≈ 7,4 dan lawan arah ≈ 0,135, cukup dramatis untuk edukasi namun tidak saturasi pada 5–10 m/s.

## 5. Parameter, rentang, mapping slider
| Parameter API | Rentang | Default | Dipakai sebagai |
|---------------|---------|---------|-----------------|
| `fire_intensity` | integer 1–100 | 60 | `p_base` |
| `wind_speed` | float 0–20 (m/s) | 5.0 | `wind_speed` |
| `wind_from_deg` | float [0, 360) | 270 | `wind_from_deg` |
| `fuel_moisture` | float 0–1 (0 = sangat kering, 1 = basah) | default region | pengali fuel |
| `steps` | integer 1–500 | 200 | batas langkah |
| `seed` | integer 0–4.294.967.295 | acak (dipantulkan di respons) | `np.random.default_rng(seed)` |
| `ignition_points` | 1–5 titik `{lat, lon}` | wajib | sel `B` awal |

Mapping:
- `p_base = 0.05 + (fire_intensity − 1) / 99 × 0.55` → rentang 0,05 … 0,60. Alasan: 0,05 hampir subkritis di fuel sedang; 0,60 sudah sangat agresif; linear agar slider terasa proporsional.
- `dryness_multiplier = 1.3 − 0.9 × fuel_moisture` → 1,3 (kering) … 0,4 (basah). Alasan: kering meningkatkan peluang 30%, basah menurunkan 60%; tidak pernah 0 sehingga fuel>0 selalu mungkin terbakar.
- `fuel_eff = fuel_grid × dryness_multiplier` (float32). `fuel_grid == 0` tetap 0.
- Peluang per pasangan sel: `p = min(1, p_base × fuel_eff[target] × exp(k × wind_speed × cos θ))`. Catatan: referensi memakai `fuel` milik sel **target** (indeks pada `state.shape`).
- `k = 0.1`.

## 6. Preset wilayah (nilai fuel konkret)
Semua grid 200x200 `float32`, disimpan di `backend/app/data/fuel/<region_id>.npy`, dibangkitkan deterministik oleh `backend/scripts/generate_fuel_grids.py`:
1. Dasar = `base_mean + amp × noise`, noise = derau acak seed tetap dihaluskan (blur Gaussian/box sederhana NumPy), dinormalisasi ke [−1, 1].
2. Satu **sungai** berkelok (lebar 3 sel, `fuel = 0`) melintasi grid sebagai penghalang alami.
3. Cincin tepi 1 sel `fuel = 0`.
4. `clip` ke [0, 1].

| `region_id` | Nama (UI) | `base_mean` | `amp` | `seed` generator | `fuel_moisture` default | bbox `[west,south,east,north]` (ilustratif) |
|-------------|-----------|-------------|-------|------------------|-------------------------|-----------------------------------------------|
| `tropical_rainforest` | Hutan Hujan Tropis | 0.40 | 0.10 | 101 | 0.7 | [113.900, -2.254, 113.954, -2.200] |
| `dry_forest` | Hutan Mengering | 0.70 | 0.10 | 102 | 0.4 | [101.500, 0.500, 101.554, 0.554] |
| `grassland` | Padang Rumput | 0.90 | 0.07 | 103 | 0.5 | [120.000, -9.700, 120.054, -9.646] |

Alasan: hutan hujan sulit terbakar (kelembapan tinggi, fuel rendah) dan baru menyala jika kering/berangin; padang rumput paling cepat menyala; hutan mengering di antaranya. Bbox hanya penempatan peta ilustratif (±6 km), **bukan** data lokasi nyata. VERIFIKASI: nilai default dikalibrasi ulang di ROADMAP P3-04 agar demo default menghasilkan `burned_fraction` kualitatif 0,10–0,80; jika berubah, perbarui dokumen ini lebih dulu.

## 7. Kontrak `ignition_time`
- Array 2D `H x W`, tipe `int16`, urutan row-major.
- Nilai = langkah saat sel mulai menyala; sel titik api awal = `0`; `-1` = tidak pernah terbakar.
- Prosedur `run_simulation`: `ignition_time[:] = -1`; titik awal → state `B`, `ignition_time = 0`. Untuk langkah `t = 1..steps`: `new = step(state, ...)`; `newly = (new == B) & (state == U)`; `ignition_time[newly] = t`; `state = new`; berhenti lebih awal jika tidak ada sel `B`. `steps_run` = langkah terakhir yang dieksekusi (≤ `steps`).
- Serialisasi: `np.ascontiguousarray(a, dtype="<i2").tobytes()` → base64 (standar, dengan padding).
- Titik awal pada sel `fuel_eff == 0` ditolak (error `IGNITION_ON_NON_FUEL`).
- Konversi lat/lon: `col = floor((lon − west)/(east − west) × W)`, `row = floor((north − lat)/(north − south) × H)`; di luar `[0, W)`/`[0, H)` → `IGNITION_OUT_OF_BOUNDS`.

## 8. Determinisme
`rng = np.random.default_rng(seed)` dibuat **sekali per simulasi**. Input identik (region, titik, parameter, steps, seed) → `ignition_time` identik byte-per-byte. Tidak boleh ada sumber acak lain (tanpa `random`, tanpa waktu).

## 9. Kriteria uji (otomatis, `backend/tests/test_ca.py` dkk.)
| ID | Uji | Kriteria lulus |
|----|-----|----------------|
| T-SIM-01 | Arah angin: grid seragam `fuel=1` (tepi 0) 101x101, titik di tengah, `wind_from_deg=270`, `wind_speed=10`, `p_base=0.3`, steps=40, seed=0 | jangkauan timur > jangkauan barat |
| T-SIM-02 | Sama, `wind_from_deg=0` | jangkauan selatan > jangkauan utara |
| T-SIM-03 | `wind_speed=0`, rata-rata 20 seed | selisih jangkauan timur-barat ≤ 15% dari rata-rata keduanya (VERIFIKASI toleransi setelah implementasi) |
| T-SIM-04 | Fuel acak dengan petak `fuel=0`, 5 seed | `ignition_time[fuel==0] == -1` |
| T-SIM-05 | Seed sama dua kali | array identik |
| T-SIM-06 | Seed berbeda | array berbeda (pada skenario p tinggi) |
| T-SIM-07 | Tepi grid | sel tepi tidak pernah terbakar |
| T-SIM-08 | Kausalitas | setiap sel dengan `ignition_time = n > 0` punya tetangga Moore dengan `ignition_time = n−1` |
| T-SIM-09 | Rentang | `ignition_time ∈ [-1, steps_run]` |
| T-SIM-10 | Mapping | `intensity_to_p_base(1)=0.05`, `(100)=0.60`; `dryness_multiplier(0)=1.3`, `(1)=0.4` |
| T-SIM-11 | Encoding | encode → decode mengembalikan array asal; panjang bytes = `H*W*2` |
| T-SIM-12 | Preset | tiap `.npy`: shape (200,200), float32, nilai ∈ [0,1], tepi = 0, ada sel fuel=0 di dalam (sungai) |
| T-SIM-13 | Titik api di `fuel=0` | ditolak dengan `IGNITION_ON_NON_FUEL` (tingkat API) |