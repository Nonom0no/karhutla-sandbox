// src/components/Compass.tsx - Interactive SVG compass for wind_from_deg

import React, { useRef, useCallback } from "react";
import { normalizeDeg, degToCompassLabel } from "../lib/angle";

export interface CompassProps {
  value: number; // wind_from_deg in [0, 360)
  onChange: (value: number) => void;
  size?: number; // SVG size in pixels (default 200)
}

export const Compass: React.FC<CompassProps> = ({
  value,
  onChange,
  size = 200,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);

  const center = size / 2;
  const radius = size * 0.45; // ring radius
  const handleRadius = 10;

  // Convert angle to handle position
  const angleToPoint = useCallback(
    (deg: number) => {
      const rad = (deg * Math.PI) / 180;
      const x = center + radius * Math.sin(rad);
      const y = center - radius * Math.cos(rad);
      return { x, y };
    },
    [center, radius]
  );

  // Handle pointer move
  const handlePointerMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const centerX = rect.left + center;
      const centerY = rect.top + center;
      // Use angle lib
      const deg = normalizeDeg(
        // We replicate logic inline to avoid importing pointerToDeg with client coords
        // but we can import it; however it expects center in client space.
        // We'll compute directly:
        (() => {
          const dx = clientX - centerX;
          const dy = clientY - centerY;
          const rad = Math.atan2(dx, -dy);
          const d = (rad * 180) / Math.PI;
          return d;
        })()
      );
      onChange(deg);
    },
    [center, onChange]
  );

  const onWindowPointerMove = useCallback(
    (e: PointerEvent) => {
      if (draggingRef.current) {
        handlePointerMove(e.clientX, e.clientY);
      }
    },
    [handlePointerMove]
  );

  const handlePointerUp = useCallback(
    () => {
      draggingRef.current = false;
      if (svgRef.current) {
        svgRef.current.releasePointerCapture?.(0);
      }
      window.removeEventListener("pointermove", onWindowPointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    },
    [onWindowPointerMove]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      draggingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      window.addEventListener("pointermove", onWindowPointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      handlePointerMove(e.clientX, e.clientY);
    },
    [handlePointerMove, handlePointerUp, onWindowPointerMove]
  );

  // Keyboard handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? 15 : 1;
      let newValue: number | null = null;
      if (e.key === "ArrowLeft") {
        newValue = normalizeDeg(value - step);
      } else if (e.key === "ArrowRight") {
        newValue = normalizeDeg(value + step);
      }
      if (newValue !== null) {
        e.preventDefault();
        onChange(newValue);
      }
    },
    [value, onChange]
  );

  // Computed positions
  const { x: handleX, y: handleY } = angleToPoint(value);
  // Arrow points to opposite direction (wind TO direction)
  const oppositeDeg = normalizeDeg(value + 180);
  const { x: arrowX, y: arrowY } = angleToPoint(oppositeDeg);

  const compassLabel = degToCompassLabel(value);
  const ariaValueText = `${value} derajat, dari ${compassLabel.toLowerCase()}`;

  return (
    <div
      tabIndex={0}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={359}
      aria-valuenow={value}
      aria-valuetext={ariaValueText}
      aria-label="Arah angin"
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      style={{
        touchAction: "none",
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        userSelect: "none",
      }}
    >
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ touchAction: "none" }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth={10}
            markerHeight={7}
            refX={9}
            refY={3.5}
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L10,3.5 L0,7 Z" fill="#333" />
          </marker>
        </defs>

        {/* Outer ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#666"
          strokeWidth={2}
        />

        {/* Cardinal labels */}
        <g fontSize={14} fontFamily="system-ui, sans-serif" fill="#333" textAnchor="middle" dominantBaseline="middle">
          <text x={center} y={center - radius - 16}>U</text>
          <text x={center + radius + 16} y={center}>T</text>
          <text x={center} y={center + radius + 16}>S</text>
          <text x={center - radius - 16} y={center}>B</text>
        </g>

        {/* Arrow from handle through center to opposite side (wind TO) */}
        <line
          x1={handleX}
          y1={handleY}
          x2={arrowX}
          y2={arrowY}
          stroke="#333"
          strokeWidth={3}
          markerEnd="url(#arrowhead)"
        />

        {/* Center dot */}
        <circle cx={center} cy={center} r={4} fill="#333" />

        {/* Handle (wind FROM) */}
        <circle
          cx={handleX}
          cy={handleY}
          r={handleRadius}
          fill="#e03"
          stroke="#fff"
          strokeWidth={2}
          style={{ cursor: "grab", pointerEvents: "all" }}
        />
      </svg>

      <div style={{ fontSize: 14, fontWeight: 500, textAlign: "center" }}>
        Angin dari {value}° ({compassLabel})
      </div>
    </div>
  );
};