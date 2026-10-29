// src/lib/text.ts - Canonical text constants for the application

/**
 * Canonical domain limitation text (LIMITATIONS_TEXT_ID)
 * Must be identical in LimitationsBanner and StatsPanel.
 */
export const LIMITATIONS_TEXT_ID =
  'Model ini hanya menyimulasikan penyebaran api permukaan. Kebakaran gambut (membara di bawah tanah) tidak dimodelkan. Hasil bersifat kualitatif dan edukatif, bukan prediksi operasional.';

/**
 * Error code to Indonesian message mapping.
 * Covers all API_SPEC §6 error codes + REGION_NOT_FOUND + network error.
 */
export const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'Data masukan tidak valid. Periksa kembali parameter yang dimasukkan.',
  UNKNOWN_REGION: 'Wilayah tidak dikenal. Pilih wilayah dari daftar.',
  IGNITION_OUT_OF_BOUNDS: 'Titik penyulutan di luar batas wilayah. Klik pada area diorama.',
  IGNITION_ON_NON_FUEL: 'Tidak bisa menyulut api di sini. Sel tersebut tidak memiliki bahan bakar (air/tepi).',
  SIMULATION_NOT_FOUND: 'Hasil simulasi tidak ditemukan atau sudah kedaluwarsa.',
  REGION_NOT_FOUND: 'Wilayah tidak ditemukan.',
  INTERNAL_ERROR: 'Terjadi kesalahan internal server. Coba lagi nanti.',
  NETWORK_ERROR: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
};

/**
 * Get user-friendly Indonesian error message for a given error code.
 */
export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.UNKNOWN_ERROR ?? 'Terjadi kesalahan tidak diketahui';
}