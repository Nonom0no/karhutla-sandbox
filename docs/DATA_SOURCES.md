# DATA_SOURCES

Semua sumber di bawah, kecuali grid preset buatan sendiri, **tidak dipakai di MVP**. Detail yang ditandai VERIFIKASI harus dicek di dokumentasi resmi sebelum dipakai.

| Sumber | Fungsi | Link resmi | Status | Catatan |
|--------|--------|-----------|--------|---------|
| Grid preset `.npy` (buatan sendiri) | Peta fuel 200x200 untuk 3 preset | `backend/scripts/generate_fuel_grids.py` | **Dipakai MVP** | Sintetis, bukan data lapangan |
| LANDFIRE (LFPS) | Peta fuel/vegetasi (AS) | https://lfps.usgs.gov/api/job/submit | Referensi saja | Hanya CONUS, AK, HI; **tidak** mencakup Indonesia. VERIFIKASI: cakupan terkini di https://landfire.gov |
| ESA WorldCover (10 m) | Tutupan lahan Indonesia → fuel factor | https://esa-worldcover.org | Ditunda | VERIFIKASI: versi (2020/2021), kode kelas (mis. 10 pohon, 20 semak, 30 rumput, 40 lahan pertanian, 50 terbangun, 60 lahan terbuka, 80 air, 90 lahan basah herba, 95 mangrove), dan lisensi (CC BY 4.0?) |
| Copernicus DEM GLO-30 / SRTM | Slope dari elevasi | https://dataspace.copernicus.eu (GLO-30); https://earthexplorer.usgs.gov (SRTM) | Ditunda | VERIFIKASI: lisensi, tata cara akses, resolusi, vertikal datum |
| OpenWeatherMap | Cuaca real-time (angin) | https://openweathermap.org/api | Ditunda | Current Weather API: `wind.speed`, `wind.deg` (arah DATANG, derajat meteorologis). Free: 60 panggilan/menit, 1 juta/bulan. VERIFIKASI: kuota, satuan default, syarat atribusi |
| Open-Meteo | Alternatif cuaca tanpa kunci | https://open-meteo.com | Ditunda | Variabel mis. `wind_speed_10m`, `wind_direction_10m`. VERIFIKASI: satuan default kecepatan (mungkin km/jam; konversi ke m/s), ketentuan penggunaan non-komersial, batas panggilan |
| NASA FIRMS | Hotspot api aktif sebagai overlay | https://firms.modaps.eosdis.nasa.gov/api/ | Ditunda | Lihat di bawah |

## NASA FIRMS (ditunda)
Endpoint area CSV: `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{SOURCE}/{west,south,east,north}/{day_range}`. `MAP_KEY` didapat gratis dengan registrasi.

Kolom CSV yang umum (bergantung sumber; VERIFIKASI per sumber):
| Kolom | Arti |
|-------|------|
| `latitude`, `longitude` | posisi pusat piksel hotspot |
| `acq_date`, `acq_time` | tanggal & jam (UTC) akuisisi |
| `satellite`, `instrument` | satelit & sensor |
| `confidence` | keyakinan deteksi (MODIS numerik %, VIIRS kategori l/n/h) |
| `frp` | Fire Radiative Power (MW) |
| `daynight` | siang/malam |
| `bright_ti4`, `bright_ti5` (VIIRS) / `brightness`, `bright_t31` (MODIS) | suhu kecerahan |
| `scan`, `track` | ukuran piksel di arah sapuan/lintasan |
| `version` | versi produk |

**PERINGATAN:** batas `day_range` (jumlah hari maksimum per permintaan), daftar `SOURCE` yang tersedia (mis. `VIIRS_SNPP_NRT`, `MODIS_NRT`), dan kuota transaksi per interval harus dicek di dokumentasi resmi FIRMS sebelum implementasi; jangan memakai angka dari dokumen ini tanpa verifikasi.

## Rencana pemetaan data nyata (pasca-MVP, ditunda)
WorldCover (kelas) → tabel lookup → `fuel` ∈ [0,1]; air/terbangun → 0. DEM → slope → pengali arah penjalaran. Semua tabel dan koefisien dibuat di dokumen baru dan diverifikasi manusia.