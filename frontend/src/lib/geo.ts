import L from 'leaflet';

/** Bounding box as [west, south, east, north] in degrees WGS84 */
export type BBox = [west: number, south: number, east: number, north: number];

/**
 * Convert a [west, south, east, north] bbox to a Leaflet LatLngBounds.
 * Leaflet expects bounds as [[south, west], [north, east]].
 */
export function bboxToLatLngBounds(bbox: BBox): L.LatLngBounds {
  const [west, south, east, north] = bbox;
  return L.latLngBounds([
    [south, west],
    [north, east],
  ]);
}