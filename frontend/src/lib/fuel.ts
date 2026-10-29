// src/lib/fuel.ts – Decode base64-uint8 fuel grid from API

/**
 * Decode base64-encoded uint8 fuel grid to Uint8Array (row-major, 200x200).
 * Per API_SPEC §3b: values = round(fuel * 255), scale = 255.
 * @param b64 Base64 string from GET /api/regions/{id}/fuel
 * @param expectedLength Expected length (default 40000 for 200x200)
 * @returns Uint8Array
 */
export function decodeFuel(b64: string, expectedLength = 40000): Uint8Array {
  // Decode base64 to binary string
  const binary = atob(b64);
  const len = binary.length;
  if (len !== expectedLength) {
    throw new Error(`Expected ${expectedLength} bytes, got ${len}`);
  }
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return arr;
}

/**
 * Convert uint8 fuel value back to float fuel (0-1).
 * @param value Uint8 value (0-255)
 * @returns float fuel in [0, 1]
 */
export function fuelUint8ToFloat(value: number): number {
  return value / 255;
}

/**
 * Get fuel float array from base64 string.
 * @param b64 Base64 string
 * @param expectedLength Expected length (default 40000)
 * @returns Float32Array
 */
export function decodeFuelFloat(b64: string, expectedLength = 40000): Float32Array {
  const uint8 = decodeFuel(b64, expectedLength);
  const float = new Float32Array(uint8.length);
  for (let i = 0; i < uint8.length; i++) {
    float[i] = uint8[i] / 255;
  }
  return float;
}