// src/lib/decode.ts – Decode base64 Int16 little-endian to Int16Array

/**
 * Decode base64-encoded int16 LE array to Int16Array.
 * @param base64 Base64 string (as returned by API in ignition_time.data)
 * @param height Number of rows (H)
 * @param width Number of columns (W)
 * @returns Int16Array of length height * width
 * @throws Error if decoded byte length !== height * width * 2
 */
export function decodeIgnitionTime(
  base64: string,
  height: number,
  width: number
): Int16Array {
  const binary = atob(base64);
  const expectedBytes = height * width * 2;
  if (binary.length !== expectedBytes) {
    throw new Error(
      `Invalid ignition_time length: expected ${expectedBytes} bytes, got ${binary.length}`
    );
  }
  const buffer = new ArrayBuffer(expectedBytes);
  const view = new DataView(buffer);
  for (let i = 0; i < expectedBytes; i++) {
    view.setUint8(i, binary.charCodeAt(i));
  }
  const result = new Int16Array(height * width);
  for (let i = 0; i < height * width; i++) {
    result[i] = view.getInt16(i * 2, true); // little-endian
  }
  return result;
}