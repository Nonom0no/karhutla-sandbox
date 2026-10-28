# PRD — Karhutla Sandbox

## 1. Tujuan
Menyediakan web sandbox edukatif agar pengguna memahami secara kualitatif bagaimana intensitas api, arah dan kecepatan angin, jenis vegetasi, dan kelembapan bahan bakar memengaruhi penyebaran kebakaran hutan dan lahan (karhutla). Proyek ini **bukan** alat prediksi operasional. Pengalaman utama: diorama 3D low-poly yang interaktif dan menyenangkan, seperti mainan simulasi.

## 2. Pengguna
- **Pelajar/mahasiswa**: ingin eksperimen cepat "bagaimana jika" tanpa instalasi.
- **Pengajar/penyuluh**: butuh demo visual di kelas (laptop dan ponsel).
- **Pengembang (1 orang)**: butuh basis kode kecil, deterministik, dan mudah diuji.

## 3. User stories (MVP)
- US-01: Sebagai pengguna, saya memilih wilayah preset (hutan hujan tropis, hutan mengering, padang rumput) agar karakter bahan bakar berbeda.
- US-02: Sebagai pengguna, saya mengklik tanah pada diorama 3D untuk menaruh 1–5 titik api.
- US-03: Sebagai pengguna, saya mengatur intensitas api (slider 1–100%).
- US-04: Sebagai pengguna, saya mengatur arah angin lewat kompas interaktif dan kecepatan angin (0–20 m/s).
- US-05: Sebagai pengguna, saya mengatur kelembapan bahan bakar (0–1) untuk melihat efek kekeringan.
- US-06: Sebagai pengguna, saya menjalankan simulasi dan melihat animasi penyebaran api 3D (pohon/rumput terbakar jadi arang) di atas diorama.
- US-07: Sebagai pengguna, saya menggeser slider waktu, memutar/menjeda animasi, dan mengubah kecepatan putar.
- US-08: Sebagai pengguna, saya melihat statistik ringkas (jumlah sel terbakar, fraksi, luas ha).
- US-09: Sebagai pengguna, saya selalu melihat batasan model (lihat §6).
- US-10: Sebagai pengguna ponsel, saya dapat memakai semua kontrol dengan layar sentuh.
- US-11: Sebagai pengajar, saya memakai `seed` yang sama untuk mengulang hasil persis yang sama.

## 4. MVP vs Non-goals
**MVP**: simulator CA stokastik (NumPy), 3 preset wilayah (grid fuel `.npy` di repo), API FastAPI (`POST /simulate`, `GET /simulation/{id}`, `GET /regions`, `GET /health`), UI React+Leaflet (peta, kompas SVG, slider, animasi time-step), penyimpanan hasil in-memory dengan TTL.

**Ditunda (non-goals MVP)**: data nyata per wilayah (ESA WorldCover/DEM), slope dari DEM, spotting, cuaca real-time (OpenWeatherMap/Open-Meteo), overlay hotspot NASA FIRMS, kalibrasi terhadap kejadian nyata, ML/surrogate (fase 4), akun pengguna, pemadaman/sekat bakar buatan pengguna, medan 3D dari DEM, peta/tile nyata, model 3D eksternal (glTF).

## 5. Kriteria sukses (terukur)
| ID | Kriteria | Target |
|----|----------|--------|
| KS-01 | Waktu respons `POST /simulate` (preset 200x200, steps=200) | p95 < 2 s di laptop dev (VERIFIKASI setelah P1-08) |
| KS-02 | Ukuran body respons `POST /simulate` default | < 200 KB |
| KS-03 | Determinisme: request identik termasuk `seed` | `ignition_time` identik byte-per-byte |
| KS-04 | Uji arah angin: angin dari barat (270°), grid seragam | jangkauan ke timur > jangkauan ke barat (lulus tes otomatis) |
| KS-05 | Sel `fuel=0` | tidak pernah terbakar (lulus tes otomatis, ≥5 seed) |
| KS-06 | Animasi 3D | ≥ 30 fps pada grid 200x200 di laptop biasa (mode `high`), ≥ 30 fps pada ponsel kelas menengah mode `low` (VERIFIKASI; pemilik proyek menentukan perangkat uji). |
| KS-07 | Teks batasan model terlihat | selalu tampil di UI tanpa interaksi tambahan (uji komponen) |
| KS-08 | Layar ≥ 360 px lebar | semua kontrol dapat dipakai tanpa scroll horizontal |
| KS-09 | Kualitas | `pytest`, `ruff`, `vitest`, `eslint`, `tsc` semuanya lulus |
| KS-10 | Jadwal | MVP selesai dalam 6–8 minggu (lihat docs/ROADMAP.md) |

## 6. Batasan domain (wajib tampil di UI dan dokumen)
Teks kanonik (`LIMITATIONS_TEXT_ID`):
> Model ini hanya menyimulasikan penyebaran api permukaan. Kebakaran gambut (membara di bawah tanah) tidak dimodelkan. Hasil bersifat kualitatif dan edukatif, bukan prediksi operasional.

## 7. Risiko
- Hasil default tidak "menarik" (api padam/meluas berlebihan): mitigasi lewat tuning default (ROADMAP P3-04).
- Performa simulasi: mitigasi vektorisasi NumPy, profiling (P1-08).
- Salah tafsir sebagai prediksi: mitigasi teks batasan permanen.