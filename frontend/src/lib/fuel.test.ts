// src/lib/fuel.test.ts – Tests for fuel decoding

import { describe, it, expect } from "vitest";
import { decodeFuel, fuelUint8ToFloat, decodeFuelFloat } from "./fuel";

describe("decodeFuel", () => {
  it("decodes base64 uint8 array", () => {
    // Create a simple test: 4 bytes = [0, 128, 255, 100]
    const arr = new Uint8Array([0, 128, 255, 100]);
    // Convert to base64 manually
    let binary = "";
    for (let i = 0; i < arr.length; i++) {
      binary += String.fromCharCode(arr[i]);
    }
    const b64 = btoa(binary);

    const result = decodeFuel(b64, 4);
    expect(result).toEqual(arr);
  });

  it("throws on wrong length", () => {
    const arr = new Uint8Array([1, 2, 3]);
    let binary = "";
    for (let i = 0; i < arr.length; i++) {
      binary += String.fromCharCode(arr[i]);
    }
    const b64 = btoa(binary);

    expect(() => decodeFuel(b64, 4)).toThrow(/Expected 4 bytes/);
  });
});

describe("fuelUint8ToFloat", () => {
  it("converts 0 to 0.0", () => {
    expect(fuelUint8ToFloat(0)).toBe(0);
  });

  it("converts 255 to 1.0", () => {
    expect(fuelUint8ToFloat(255)).toBe(1);
  });

  it("converts 128 to ~0.5", () => {
    expect(fuelUint8ToFloat(128)).toBeCloseTo(128 / 255, 5);
  });
});

describe("decodeFuelFloat", () => {
  it("decodes to Float32Array with correct values", () => {
    const arr = new Uint8Array([0, 128, 255, 64]);
    let binary = "";
    for (let i = 0; i < arr.length; i++) {
      binary += String.fromCharCode(arr[i]);
    }
    const b64 = btoa(binary);

    const result = decodeFuelFloat(b64, 4);
    expect(result[0]).toBe(0);
    expect(result[1]).toBeCloseTo(128 / 255, 5);
    expect(result[2]).toBe(1);
    expect(result[3]).toBeCloseTo(64 / 255, 5);
  });
});