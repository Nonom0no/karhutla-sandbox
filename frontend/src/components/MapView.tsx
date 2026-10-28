import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BBox, bboxToLatLngBounds } from '../lib/geo';

interface MapViewProps {
  bbox: BBox;
  children?: React.ReactNode;
}

/**
 * Basic Leaflet map with OSM tiles and a visible bbox rectangle.
 * Cleans up the map instance on unmount.
 */
export function MapView({ bbox, children }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const rectangleRef = useRef<L.Rectangle | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initialize map
    const map = L.map(container, {
      zoomControl: true,
      attributionControl: true,
    });
    mapRef.current = map;

    // OSM tile layer with proper attribution
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Bbox rectangle overlay (thin, non-interactive)
    const bounds = bboxToLatLngBounds(bbox);
    const rectangle = L.rectangle(bounds, {
      color: '#3388ff',
      weight: 2,
      fill: false,
      interactive: false,
    }).addTo(map);
    rectangleRef.current = rectangle;

    // Fit map to bbox with a small padding
    map.fitBounds(bounds, { padding: [20, 20] });

    // Cleanup function
    return () => {
      if (rectangleRef.current) {
        map.removeLayer(rectangleRef.current);
        rectangleRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, [bbox]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: '400px' }}
      role="application"
      aria-label="Peta simulasi kebakaran hutan"
    >
      {children}
    </div>
  );
}