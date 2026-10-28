// src/lib/angle.ts - Pure angle utilities for compass

/**
 * Normalize degrees to [0, 360)
 */
export function normalizeDeg(deg: number): number {
  // Use double modulo to map -0 to 0 and handle any integer
  return ((deg % 360) + 360) % 360;
}

/**
 * Calculate angle from pointer coordinates relative to SVG center.
 * Convention: 0° = up (north), clockwise.
 * Formula: (atan2(dx, -dy) * 180/π + 360) % 360
 * @param clientX - pointer client X coordinate
 * @param clientY - pointer client Y coordinate
 * @param centerX - SVG center X coordinate (client space)
 * @param centerY - SVG center Y coordinate (client space)
 * @returns angle in degrees [0, 360)
 */
export function pointerToDeg(
  clientX: number,
  clientY: number,
  centerX: number,
  centerY: number
): number {
  const dx = clientX - centerX;
  const dy = clientY - centerY;
  // atan2(dx, -dy) gives angle from north, clockwise
  const rad = Math.atan2(dx, -dy);
  const deg = (rad * 180) / Math.PI;
  return normalizeDeg(deg);
}

/**
 * Convert degree to 8-point compass label.
 * Boundaries at 22.5° offsets: N centered at 0°, NE at 45°, etc.
 * @param deg - angle in degrees [0, 360)
 * @returns compass direction label (N, NE, E, SE, S, SW, W, NW)
 */
export function degToCompassLabel(deg: number): string {
  const normalized = normalizeDeg(deg);
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
  // Each sector is 45°, centered on multiples of 45.
  // Round to nearest sector index.
  const index = Math.round(normalized / 45) % 8;
  return directions[index];
}