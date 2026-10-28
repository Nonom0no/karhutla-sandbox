// src/components/FireOverlay.tsx – Leaflet image overlay rendered from ignition_time array

import { useEffect, useRef } from "react";
import L from "leaflet";
import { renderFrame } from "../lib/render";
import type { BBox } from "../lib/geo";

interface FireOverlayProps {
  map: L.Map | null;
  ignition: Int16Array | null;
  t: number;
  width: number;
  height: number;
  bbox: BBox;
}

export function FireOverlay({
  map,
  ignition,
  t,
  width,
  height,
  bbox,
}: FireOverlayProps) {
  const overlayRef = useRef<L.ImageOverlay | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageDataRef = useRef<ImageData | null>(null);

  // Initialize offscreen canvas and ImageData once
  useEffect(() => {
    if (!canvasRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvasRef.current = canvas;
      const ctx = canvas.getContext("2d")!;
      imageDataRef.current = ctx.createImageData(width, height);
    }
  }, [width, height]);

  // Render frame and update overlay when ignition or t changes
  useEffect(() => {
    if (!map) return;
    if (!ignition || !imageDataRef.current || !canvasRef.current) {
      // Remove overlay if no data
      if (overlayRef.current) {
        map.removeLayer(overlayRef.current);
        overlayRef.current = null;
      }
      return;
    }

    const imageData = imageDataRef.current;
    renderFrame(ignition, width, height, t, imageData);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(imageData, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");

    // Convert bbox [west, south, east, north] to Leaflet bounds [[south, west], [north, east]]
    const bounds: L.LatLngBoundsExpression = [
      [bbox[1], bbox[0]],
      [bbox[3], bbox[2]],
    ];

    if (overlayRef.current) {
      overlayRef.current.setUrl(dataUrl);
    } else {
      const overlay = L.imageOverlay(dataUrl, bounds, {
        opacity: 0.85,
        interactive: false,
        className: "fire-overlay",
      }).addTo(map);
      overlayRef.current = overlay;
    }
  }, [map, ignition, t, width, height, bbox]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (overlayRef.current && map) {
        map.removeLayer(overlayRef.current);
        overlayRef.current = null;
      }
    };
  }, [map]);

  // This component renders nothing (overlay is added to Leaflet map directly)
  return null;
}