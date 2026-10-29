// src/scene/IgnitionMarkers.tsx - Animated torch markers for ignition points
/* eslint-disable react/no-unknown-property */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Group,
  Mesh,
  ConeGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
} from 'three';
import { useAppState, useAppDispatch } from '../state/context';
import { gridToWorld, latLonToCell } from '../lib/world';

interface MarkerData {
  row: number;
  col: number;
  lat: number;
  lon: number;
  index: number;
}

function Torch({ index, row, col, onRemove }: { index: number; row: number; col: number; onRemove: () => void }) {
  // Position from row/col (world coords)
  const [x, z] = gridToWorld(row, col);

  const groupRef = useRef<Group>(null);

  // Build torch geometry once
  useMemo(() => {
    if (!groupRef.current) return;
    const group = groupRef.current;
    // Handle
    const handleGeo = new CylinderGeometry(0.15, 0.15, 1.5, 6);
    const handleMat = new MeshStandardMaterial({
      color: 0x3d2b1f,
      roughness: 0.8,
      metalness: 0.1,
    });
    const handle = new Mesh(handleGeo, handleMat);
    handle.position.y = 0.75;
    group.add(handle);
    // Flame
    const flameGeo = new ConeGeometry(0.3, 0.8, 6);
    const flameMat = new MeshStandardMaterial({
      color: 0xff4500,
      emissive: 0xff8c00,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.9,
    });
    const flame = new Mesh(flameGeo, flameMat);
    flame.position.y = 1.5 + 0.4;
    group.add(flame);
  }, []);

  // Animation: pulse
  useFrame((_, delta) => {
    if (groupRef.current) {
      const time = performance.now() * 0.001;
      groupRef.current.scale.y = 1 + Math.sin(time * 3 + index) * 0.1;
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  const handlePointerDown = () => {
    onRemove();
  };


  return (
    <group
      ref={groupRef}
      position={[x, 1.5, z]}
      onPointerDown={handlePointerDown}
    />
  );
}

export function IgnitionMarkers() {
  const dispatch = useAppDispatch();
  const { ignitionPoints, regionId, regions } = useAppState();

  // Convert ignitionPoints (lat/lon) to grid cells for positioning
  const markers = useMemo((): MarkerData[] => {
    if (!ignitionPoints.length) return [];
    const region = regions.find((r) => r.id === regionId);
    const bbox = region?.grid.bbox ?? [0, 0, 1, 1];
    return ignitionPoints.map(({ lat, lon }, index) => {
      const cell = latLonToCell(lat, lon, bbox);
      if (!cell) return null;
      const [row, col] = cell;
      return { row, col, lat, lon, index };
    }).filter(Boolean) as MarkerData[];
  }, [ignitionPoints, regionId, regions]);

  return (
    <group>
      {markers.map(({ row, col, index }) => (
        <Torch
          key={index}
          index={index}
          row={row}
          col={col}
          onRemove={() => dispatch({ type: 'REMOVE_IGNITION_POINT', payload: index })}
        />
      ))}
    </group>
  );
}