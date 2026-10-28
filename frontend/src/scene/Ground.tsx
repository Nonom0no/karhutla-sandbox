// src/scene/Ground.tsx - Ground plane for the diorama
/* eslint-disable react/no-unknown-property */

import { useMemo } from 'react';
import { MeshStandardMaterial, PlaneGeometry } from 'three';
import { theme } from './theme';

interface GroundProps {
  regionId?: string;
  /** Optional fuel grid to color ground by fuel type (water/edge/land) */
  fuelGrid?: Uint8Array | null;
  width?: number;
  height?: number;
}

export function Ground({ regionId = 'dry_forest', width = 200, height = 200 }: GroundProps) {
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

  return <mesh geometry={geometry} material={material} receiveShadow />;
}