// src/lib/render.ts – Pure rendering functions for fire overlay

import { BURNING_DISPLAY_STEPS } from "../state/types";

// Colors in RGBA packed as 32-bit values (little-endian: R, G, B, A order in Uint8ClampedArray)
// We use Uint32Array view on ImageData.data for fast writes.
// Transparent: 0x00000000
// Burning (orange-red): rgb(255, 69, 0), alpha=255 -> 0xFF0045FF? Wait Uint32 little-endian: bytes are R,G,B,A => value = (A<<24)|(B<<16)|(G<<8)|R
// Actually Uint8ClampedArray is [R, G, B, A, R, G, B, A, ...]
// Uint32Array reads 4 bytes as little-endian: byte0=R, byte1=G, byte2=B, byte3=A => value = A<<24 | B<<16 | G<<8 | R
// So for RGBA(255,69,0,255): R=255, G=69, B=0, A=255 => value = 0xFF0000FF? Let's compute: A=255<<24=0xFF000000, B=0<<16=0, G=69<<8=0x00004500, R=255=0x000000FF => 0xFF0045FF
// Burned (dark gray, alpha~0.7): rgb(50,50,50), alpha=179 (0.7*255≈179) => value = 0xB3323232? A=179=0xB3, B=50=0x32, G=50=0x32, R=50=0x32 => 0xB3323232

const TRANSPARENT = 0x00000000;
const BURNING_COLOR = 0xff0045ff; // orange-red, full opacity
const BURNED_COLOR = 0xb3323232; // dark gray, alpha ~0.7

/**
 * Render a single frame into the provided ImageData.
 * Mutates imageData.data in place via Uint32Array view for performance.
 *
 * @param ignition Flat Int16Array of length width*height (row-major)
 * @param width Grid width (columns)
 * @param height Grid height (rows)
 * @param t Current time step (0..steps_run)
 * @param imageData ImageData object (width x height) to fill
 */
export function renderFrame(
  ignition: Int16Array,
  width: number,
  height: number,
  t: number,
  imageData: ImageData
): void {
  const data32 = new Uint32Array(imageData.data.buffer);
  const total = width * height;
  for (let i = 0; i < total; i++) {
    const v = ignition[i];
    if (v < 0 || v > t) {
      data32[i] = TRANSPARENT;
    } else if (t - v < BURNING_DISPLAY_STEPS) {
      data32[i] = BURNING_COLOR;
    } else {
      data32[i] = BURNED_COLOR;
    }
  }
}