# ML_PHASE — Fase 4 (DITUNDA, opsional, hanya didokumentasikan)

**Status: DITUNDA.** Tidak ada kode ML di MVP; jangan menambah dependensi PyTorch ke `pyproject.toml` sebelum fase ini dimulai dengan izin pengguna.

## Tujuan
Surrogate ML yang meniru ensemble CA agar menghasilkan peta probabilitas penyebaran lebih cepat.

## Rencana
1. **Pembangkit data**: jalankan CA (docs/SIMULATION_SPEC.md) dengan parameter diacak (region, titik api, `fire_intensity`, `wind_speed`, `wind_from_deg`, `fuel_moisture`) dan K run per konfigurasi (seed berbeda).
2. **Target**: rata-rata K run dari indikator terbakar (peta probabilitas `H x W` per konfigurasi, atau per langkah waktu jika memakai ConvLSTM).
3. **Model**: U-Net atau ConvLSTM kecil di PyTorch. Input: fuel_eff, peta titik api, kanal konstanta angin (sin/cos, kecepatan), intensitas.
4. **Evaluasi**: IoU terhadap ensemble CA (ambang probabilitas ditentukan di validasi), serta kecepatan inferensi vs CA.
5. **Deploy**: TorchScript atau ONNX di FastAPI; flag `engine=ca|ml` pada `POST /simulate` (perubahan kontrak: perbarui API_SPEC lebih dulu). VERIFIKASI: format keluaran `ml` (probabilitas vs `ignition_time`) harus diputuskan karena `ml` tidak menghasilkan satu realisasi.

## Pembanding dan referensi
- PyTorchFire (`pip install pytorchfire`; arXiv:2502.18738) — pembanding/opsi.
- SimFire, ForeFire — pembanding/opsi.
- NHESS 26(6) 2026: surrogate ConvLSTM dari data CA; EGU26-22628. VERIFIKASI: judul, DOI, dan klaim yang akan dirujuk sebelum dikutip.

## Kriteria masuk fase ini
MVP rilis; ada kebutuhan nyata (mis. kecepatan atau peta probabilitas); pengguna menyetujui dependensi torch.