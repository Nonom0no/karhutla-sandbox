// src/scene/Ground.tsx - Ground plane for the diorama with click handling
/* eslint-disable react/no-unknown-property */

import { useMemo, useState } from 'react';
import { MeshStandardMaterial, PlaneGeometry, Raycaster, Vector2 } from 'three';
import { theme } from './theme';
import { worldToCell } from '../lib/world';
import { fuelUint8ToFloat } from '../lib/fuel';
import { useAppDispatch, useAppState } from '../state/context';
import { cellToLatLon, latLonToCell } from '../lib/world';
import { Html } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';

interface GroundProps {
  regionId?: string;
  /** Optional fuel grid to color ground by fuel type (water/edge/land) */
  fuelGrid?: Uint8Array | null;
  width?: number;
  height?: number;
}

export function Ground({ regionId = 'dry_forest', fuelGrid, width = 200, height = 200 }: GroundProps) {
  const dispatch = useAppDispatch();
  const { ignitionPoints, status, regions } = useAppState();
  const [pointerDown, setPointerDown] = useState<{ x: number; y: number; time: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Base ground color for region
  const baseColor = theme.groundColors[regionId as keyof typeof theme.groundColors] ?? theme.groundColors.dry_forest;

  const geometry = useMemo(() => new PlaneGeometry(width, height, 1, 1), [width, height]);
  geometry.rotateX(-Math.PI / 2);

  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: baseColor,
        roughness: 0.9,
        metalness: 0,
      }),
    [baseColor]
  );

  const raycaster = useMemo(() => new Raycaster(), []);
  const pointer = useMemo(() => new Vector2(), []);

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    // Don't interfere with OrbitControls drag (right/middle click)
    if (event.button !== 0) return;
    setPointerDown({ x: event.clientX, y: event.clientY, time: Date.now() });
  };

  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => {
    if (event.button !== 0 || !pointerDown) return;

    const dx = event.clientX - pointerDown.x;
    const dy = event.clientY - pointerDown.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const duration = Date.now() - pointerDown.time;

    // Click criteria: movement < 5px and duration < 300ms
    if (distance < 5 && duration < 300) {
      handleClick(event);
    }
    setPointerDown(null);
  };

  const handleClick = (event: ThreeEvent<PointerEvent>) => {
    if (status === 'loading' || status === 'done') return;
    if (ignitionPoints.length >= 5) {
      showToast('Maksimal 5 titik api');
      return;
    }

    const rect = (event.target as HTMLCanvasElement).getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast against ground plane
    raycaster.setFromCamera(pointer, event.camera);
    const intersects = raycaster.intersectObject(event.object);

    if (intersects.length === 0) return;

    const point = intersects[0].point;
    const cell = worldToCell(point.x, point.z);

    if (!cell) {
      showToast('Tidak bisa menyulut api di sini');
      return;
    }

    const [row, col] = cell;

    // Check if cell is water (fuel == 0)
    if (fuelGrid && row >= 0 && row < 200 && col >= 0 && col < 200) {
      const fuelValue = fuelUint8ToFloat(fuelGrid[row * 200 + col]);
      if (fuelValue === 0) {
        showToast('Tidak bisa menyulut api di sini');
        return;
      }
    }

    // Check if ignition point already exists at this cell
    const region = regions.find((r) => r.id === regionId);
    const bbox = region?.grid.bbox ?? [0, 0, 1, 1];

    const existingIdx = ignitionPoints.findIndex((p) => {
      const cell2 = latLonToCell(p.lat, p.lon, bbox);
      return cell2 && cell2[0] === row && cell2[1] === col;
    });
    if (existingIdx >= 0) return;

    // Convert cell center to lat/lon
    const { lat, lon } = cellToLatLon(row, col, bbox);

    dispatch({ type: 'ADD_IGNITION_POINT', payload: { lat, lon } });
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <>
      <mesh
        geometry={geometry}
        material={material}
        receiveShadow
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      />
      {toast && (
        <Html
          as="div"
          style={{
            position: 'fixed',
            bottom: 100,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: 4,
            fontSize: '14px',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          {toast}
        </Html>
      )}
    </>
  );
}