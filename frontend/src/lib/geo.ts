/** Bounding box as [west, south, east, north] in degrees WGS84 */
export type BBox = [west: number, south: number, east: number, north: number];
/** Check if lat/lon inside bbox (west, south, east, north) */
export function isInsideBbox(lat: number, lon: number, bbox: BBox): boolean {
  const [west, south, east, north] = bbox;
  return lon >= west && lon <= east && lat >= south && lat <= north;
}

/**
 * Convert a [west, south, east, north] bbox to [[south, west], [north, east]] format.
 * Used for image overlay bounds without Leaflet dependency.
 */
export function bboxToBounds(bbox: BBox): [[number, number], [number, number]] {
  const [west, south, east, north] = bbox;
  return [
    [south, west],
    [north, east],
  ];
}