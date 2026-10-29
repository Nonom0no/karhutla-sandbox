// src/components/FPSMonitor.tsx - Simple FPS monitoring component

import { useEffect, useRef, useState } from 'react';

interface FPSMonitorProps {
  enabled?: boolean;
  onUpdate?: (fps: number) => void;
}

export function FPSMonitor({ enabled = true, onUpdate }: FPSMonitorProps) {
  const framesRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const fpsRef = useRef(0);
  const [fps, setFps] = useState(0);
  const animationRef = useRef<number | null>(null);

  // FPS counter loop
  useEffect(() => {
    if (!enabled) return;

    function tick(now: number) {
      framesRef.current++;
      if (now - lastTimeRef.current >= 1000) {
        const currentFps = Math.round((framesRef.current * 1000) / (now - lastTimeRef.current));
        fpsRef.current = currentFps;
        setFps(currentFps);
        onUpdate?.(currentFps);
        framesRef.current = 0;
        lastTimeRef.current = now;
      }
      animationRef.current = requestAnimationFrame(tick);
    }

    animationRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [enabled, onUpdate]);

  // Display FPS in development
  if (import.meta.env.DEV) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 10,
          right: 10,
          background: 'rgba(0,0,0,0.7)',
          color: fps < 30 ? '#ff4444' : '#44ff44',
          padding: '4px 8px',
          borderRadius: 4,
          fontSize: '12px',
          fontFamily: 'monospace',
          zIndex: 1000,
          pointerEvents: 'none',
        }}
      >
        {fps} FPS
      </div>
    );
  }

  return null;
}