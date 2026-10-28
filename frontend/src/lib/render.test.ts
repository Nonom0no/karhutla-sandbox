// src/lib/render.test.ts – Tests for renderFrame

import { describe, it, expect } from "vitest";
import { renderFrame } from "./render";

function createImageData(w: number, h: number): ImageData {
  // Create a minimal ImageData-like object compatible with jsdom (no real ImageData constructor)
  const data = new Uint8ClampedArray(w * h * 4);
  return { data, width: w, height: h } as unknown as ImageData;
}

describe("renderFrame", () => {
  it("v = -1 → transparent", () => {
    const ignition = new Int16Array([-1]);
    const img = createImageData(1, 1);
    renderFrame(ignition, 1, 1, 0, img);
    // Uint32Array view
    const view = new Uint32Array(img.data.buffer);
    expect(view[0]).toBe(0x00000000);
  });

  it("v = 0, t = 0 → burning (t-v=0<3)", () => {
    const ignition = new Int16Array([0]);
    const img = createImageData(1, 1);
    renderFrame(ignition, 1, 1, 0, img);
    const view = new Uint32Array(img.data.buffer);
    expect(view[0]).toBe(0xff0045ff); // BURNING_COLOR
  });

  it("v = 0, t = 2 → burning (t-v=2<3)", () => {
    const ignition = new Int16Array([0]);
    const img = createImageData(1, 1);
    renderFrame(ignition, 1, 1, 2, img);
    const view = new Uint32Array(img.data.buffer);
    expect(view[0]).toBe(0xff0045ff);
  });

  it("v = 0, t = 3 → ash (t-v=3 not <3)", () => {
    const ignition = new Int16Array([0]);
    const img = createImageData(1, 1);
    renderFrame(ignition, 1, 1, 3, img);
    const view = new Uint32Array(img.data.buffer);
    expect(view[0]).toBe(0xb3323232); // BURNED_COLOR
  });

  it("v = 5, t = 3 → transparent (v>t)", () => {
    const ignition = new Int16Array([5]);
    const img = createImageData(1, 1);
    renderFrame(ignition, 1, 1, 3, img);
    const view = new Uint32Array(img.data.buffer);
    expect(view[0]).toBe(0x00000000);
  });
});