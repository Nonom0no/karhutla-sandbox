// src/lib/world.ts – Pure coordinate conversion functions (no dependencies)

import type { BBox } from './geo';

// Grid dimensions are fixed per SIMULATION_SPEC
export const GRID_WIDTH = 200;
export const GRID_HEIGHT = 200;

/**
 * Convert grid cell (row, col) to world coordinates (x, z).
 * Origin is at center of grid.
 * - x = col - W/2 + 0.5 (east = +x)
 * - z = row - H/2 + 0.5 (south = +z, north = -z)
 * @param row Grid row (0 = north)
 * @param col Grid column (0 = west)
 * @returns [x, z] world coordinates (1 unit = 1 cell)
 */
export function gridToWorld(row: number, col: number): [number, number] {
  const x = col - GRID_WIDTH / 2 + 0.5;
  const z = row - GRID_HEIGHT / 2 + 0.5;
  return [x, z];
}

/**
 * Convert world coordinates (x, z) to grid cell (row, col).
 * @param x World x coordinate (east = +x)
 * @param z World z coordinate (south = +z)
 * @returns [row, col] or null if outside grid
 */
export function worldToCell(x: number, z: number): [number, number] | null {
  const col = Math.floor(x + GRID_WIDTH / 2);
  const row = Math.floor(z + GRID_HEIGHT / 2);
  if (col < 0 || col >= GRID_WIDTH || row < 0 || row >= GRID_HEIGHT) {
    return null;
  }
  return [row, col];
}

/**
 * Convert grid cell (row, col) to lat/lon (center of cell).
 * Uses SIMULATION_SPEC §7 formula:
 * lon = west + (col + 0.5) / W * (east - west)
 * lat = north - (row + 0.5) / H * (north - south)
 * @param row Grid row
 * @param col Grid column
 * @param bbox Region bbox [west, south, east, north]
 * @returns { lat, lon }
 */
export function cellToLatLon(
  row: number,
  col: number,
  bbox: BBox
): { lat: number; lon: number } {
  const [west, south, east, north] = bbox;
  const lon = west + (col + 0.5) / GRID_WIDTH * (east - west);
  const lat = north - (row + 0.5) / GRID_HEIGHT * (north - south);
  return { lat, lon };
}

/**
 * Compute wind vector in world coordinates (x, z).
 * wind_from_deg: meteorological convention (0° = from north, clockwise).
 * Wind direction TOWARD = (wind_from_deg + 180) % 360.
 * World vector: (sin h, -cos h) where h is heading in radians.
 * x = east, z = north => but north = -z in world, so z component = -cos(h).
 * @param windFromDeg Wind direction from degrees
 * @returns [x, z] world vector (east, north direction)
 */
export function windVectorWorld(windFromDeg: number): [number, number] {
  const headingDeg = (windFromDeg + 180) % 360;
  const headingRad = (headingDeg * Math.PI) / 180;
  const x = Math.sin(headingRad); // east
  const z = -Math.cos(headingRad); // north (world z is south-positive)
  return [x, z];
}

/**
 * Convert lat/lon to grid cell (row, col) - inverse of cellToLatLon.
 * Matches SIMULATION_SPEC §7:
 * col = floor((lon - west) / (east - west) * W)
 * row = floor((north - lat) / (north - south) * H)
 */
export function latLonToCell(
  lat: number,
  lon: number,
  bbox: BBox
): [number, number] | null {
  const [west, south, east, north] = bbox;
  if (east <= west || north <= south) return null;
  const col = Math.floor((lon - west) / (east - west) * GRID_WIDTH);
  const row = Math.floor((north - lat) / (north - south) * GRID_HEIGHT);
  if (col < 0 || col >= GRID_WIDTH || row < 0 || row >= GRID_HEIGHT) {
    return null;
  }
  return [row, col];
}