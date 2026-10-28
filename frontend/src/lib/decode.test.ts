// src/lib/decode.test.ts – Vitest tests for decodeIgnitionTime

import { describe, it, expect } from "vitest";
import { decodeIgnitionTime } from "./decode";

function toBase64(int16Array: Int16Array): string {
  const buffer = new ArrayBuffer(int16Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < int16Array.length; i++) {
    view.setInt16(i * 2, int16Array[i], true); // little-endian
  }
  let binary = "";
  for (let i = 0; i < int16Array.length * 2; i++) {
    binary += String.fromCharCode(view.getUint8(i));
  }
  return btoa(binary);
}

describe("decodeIgnitionTime", () => {
  it("decodes vector with -1, 0, 500", () => {
    const original = new Int16Array([-1, 0, 500]);
    const base64 = toBase64(original);
    const decoded = decodeIgnitionTime(base64, 1, 3);
    expect(decoded).toEqual(original);
  });
});
