import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BBox, bboxToLatLngBounds, isInsideBbox } from '../lib/geo';

interface IgnitionPoint {
  lat: number;
  lon: number;
}

interface MapViewProps {
  bbox: BBox;
  ignitionPoints: IgnitionPoint[];
  onAddIgnitionPoint: (point: IgnitionPoint) => void;
  onRemoveIgnitionPoint: (point: IgnitionPoint) => void;
  children?: React.ReactNode;
}

/**
 * Leaflet map with OSM tiles, bbox rectangle, and ignition point markers.
 * Click inside bbox to add point (max 5 handled by parent), click marker to remove.
 */
export function MapView({
  bbox,
  ignitionPoints,
  onAddIgnitionPoint,
  onRemoveIgnitionPoint,
  children,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const rectangleRef = useRef<L.Rectangle | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [hint, setHint] = useState<string | null>(null);

  // Initialize map once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = L.map(container, {
      zoomControl: true,
      attributionControl: true,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const bounds = bboxToLatLngBounds(bbox);
    const rectangle = L.rectangle(bounds, {
      color: '#3388ff',
      weight: 2,
      fill: false,
      interactive: false,
    }).addTo(map);
    rectangleRef.current = rectangle;

    map.fitBounds(bounds, { padding: [20, 20] });

    // Map click handler
    function onMapClick(e: L.LeafletMouseEvent) {
      const { lat, lng } = e.latlng;
      if (isInsideBbox(lat, lng, bbox)) {
        onAddIgnitionPoint({ lat, lon: lng });
        setHint(null);
      } else {
        setHint('Klik di dalam area');
        setTimeout(() => setHint(null), 2000);
      }
    }
    map.on('click', onMapClick);

    return () => {
      map.off('click', onMapClick);
      if (rectangleRef.current) {
        map.removeLayer(rectangleRef.current);
        rectangleRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, [bbox, onAddIgnitionPoint]);

  // Sync markers with ignitionPoints
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old markers
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    // Add new markers
    ignitionPoints.forEach((pt, idx) => {
      const marker = L.marker([pt.lat, pt.lon], {
        title: `Titik api ${idx + 1}`,
        draggable: false,
      })
        .addTo(map)
        .on('click', (e) => {
          e.originalEvent.stopPropagation();
          onRemoveIgnitionPoint(pt);
        });
      markersRef.current.push(marker);
    });
  }, [ignitionPoints, onRemoveIgnitionPoint]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: '400px', position: 'relative' }}
      role="application"
      aria-label="Peta simulasi kebakaran hutan"
    >
      {hint && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 50,
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            padding: '4px 10px',
            borderRadius: 4,
            fontSize: '13px',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
          role="alert"
          aria-live="polite"
        >
          {hint}
        </div>
      )}
      {children}
    </div>
  );
}