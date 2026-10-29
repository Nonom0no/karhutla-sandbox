// src/lib/cells.ts – Cell visual state and bucketing functions

import { GRID_WIDTH, GRID_HEIGHT } from './world';

export const BURNING_DISPLAY_STEPS = 3;

/**
 * Visual state of a cell at time t.
 */
export type CellVisualState = 'unburned' | 'burning' | 'burned';

/**
 * Determine visual state of a cell given its ignition_time value v and current time t.
 * v = -1 (never burns) or v > t (not yet ignited) → unburned
 * 0 ≤ t - v < BURNING_DISPLAY_STEPS → burning
 * otherwise → burned
 * @param v Ignition time value from simulation (int16)
 * @param t Current time step
 * @returns Visual state
 */
export function cellVisualState(v: number, t: number): CellVisualState {
  if (v < 0 || v > t) {
    return 'unburned';
  }
  if (t - v < BURNING_DISPLAY_STEPS) {
    return 'burning';
  }
  return 'burned';
}

/**
 * Build buckets: for each ignition_time value v ≥ 0, collect linear indices of cells.
 * Uses counting sort approach: O(H*W) single pass.
 * Returns array where index = v, value = array of linear indices (row * W + col).
 * @param ignitionTime Int16Array of length H*W (row-major)
 * @returns Array of index arrays, length = max(v)+1, or empty if no v >= 0
 */
export function bucketByIgnition(ignitionTime: Int16Array): number[][] {
  const total = GRID_WIDTH * GRID_HEIGHT;
  let maxV = -1;
  // First pass: find max ignition time
  for (let i = 0; i < total; i++) {
    const v = ignitionTime[i];
    if (v >= 0 && v > maxV) maxV = v;
  }
  if (maxV < 0) return [];
  const buckets: number[][] = Array.from({ length: maxV + 1 }, () => []);
  // Second pass: fill buckets
  for (let i = 0; i < total; i++) {
    const v = ignitionTime[i];
    if (v >= 0) {
      buckets[v].push(i);
    }
  }
  return buckets;
}

/**
 * Compute cells that change state between tPrev and tNext.
 * Returns { toBurning: number[], toBurned: number[] } (linear indices).
 * For incremental updates:
 * - Advancing forward by 1: toBurning = bucket[tNext], toBurned = bucket[tNext - BURNING_DISPLAY_STEPS]
 * - Jumping/backwards: recompute all (handled by caller via full recompute)
 * @param buckets Buckets from bucketByIgnition
 * @param tPrev Previous time step
 * @param tNext New time step
 * @returns Object with indices to update
 */
export function diffCells(
  buckets: number[][],
  tPrev: number,
  tNext: number
): { toBurning: number[]; toBurned: number[] } {
  const toBurning: number[] = [];
  const toBurned: number[] = [];

  if (tNext === tPrev + 1) {
    // Incremental forward by 1
    if (tNext < buckets.length) {
      toBurning.push(...buckets[tNext]);
    }
    const burnedIdx = tNext - BURNING_DISPLAY_STEPS;
    if (burnedIdx >= 0 && burnedIdx < buckets.length) {
      toBurned.push(...buckets[burnedIdx]);
    }
  } else {
    // Full recompute needed (handled by caller)
    // This function returns empty for non-incremental; caller should do full pass
  }
  return { toBurning, toBurned };
}

/**
 * Deterministic pseudo-random hash from integer seed.
 * Used for jitter (position/rotation/scale) without Math.random.
 * Based on splitmix32 / murmur-style.
 * @param x Input integer (e.g., linear cell index)
 * @returns Float in [0, 1)
 */
export function hashJitter(x: number): number {
  let h = x >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 13), 0x297a2d39);
  h = h ^ (h >>> 16);
  // Convert to [0, 1)
  return (h >>> 0) / 0x100000000;
}

/**
 * Deterministic 3D jitter vector from index.
 * @param index Linear cell index
 * @returns [x, y, z] each in [-0.5, 0.5)
 */
export function hashJitter3(index: number): [number, number, number] {
  return [
    hashJitter(index * 3 + 1) - 0.5,
    hashJitter(index * 3 + 2) - 0.5,
    hashJitter(index * 3 + 3) - 0.5,
  ];
}

/**
 * Deterministic rotation jitter (y-axis) in radians.
 * @param index Linear cell index
 * @returns Rotation in [0, 2π)
 */
export function hashRotation(index: number): number {
  return hashJitter(index * 7 + 5) * Math.PI * 2;
}

/**
 * Deterministic scale jitter factor.
 * @param index Linear cell index
 * @returns Scale multiplier in [0.8, 1.2)
 */
export function hashScale(index: number): number {
  return 0.8 + hashJitter(index * 11 + 7) * 0.4;
}