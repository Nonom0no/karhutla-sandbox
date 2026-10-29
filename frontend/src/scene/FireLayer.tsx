// src/scene/FireLayer.tsx - Fire animation layer with InstancedMesh for flames
// Vegetation state updates (burning/burned colors) are handled in Vegetation component

import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  InstancedMesh,
  Object3D,
  MeshBasicMaterial,
  ConeGeometry,
  DynamicDrawUsage,
} from 'three';
import { useAppState } from '../state/context';
import { gridToWorld } from '../lib/world';
import { bucketByIgnition, BURNING_DISPLAY_STEPS, hashJitter, hashJitter3 } from '../lib/cells';

const GRID_W = 200;
const MAX_FLAMES = 8000;

interface FireLayerProps {
  /** Pre-computed buckets from ignition_time */
  buckets: number[][];
  /** Current time step */
  t: number;
}

/** Core flame rendering component */
function FireLayerCore({ buckets, t }: FireLayerProps) {
  const flameMeshRef = useRef<InstancedMesh | null>(null);
  const dummy = useRef(new Object3D());

  // Build or update flame mesh when t or buckets change
  useEffect(() => {
    if (!buckets.length) {
      if (flameMeshRef.current) {
        flameMeshRef.current.count = 0;
        flameMeshRef.current.instanceMatrix.needsUpdate = true;
      }
      return;
    }

    // Determine which cells are burning at current t
    const burningIndices: number[] = [];
    for (let v = 0; v < buckets.length; v++) {
      if (t >= v && t - v < BURNING_DISPLAY_STEPS) {
        burningIndices.push(...buckets[v]);
      }
    }

    // Limit to MAX_FLAMES - take evenly distributed sample if too many
    let flameIndices: number[];
    if (burningIndices.length > MAX_FLAMES) {
      const step = burningIndices.length / MAX_FLAMES;
      flameIndices = Array.from({ length: MAX_FLAMES }, (_, i) =>
        burningIndices[Math.floor(i * step)]
      );
    } else {
      flameIndices = burningIndices;
    }

    // Create or resize flame mesh
    if (!flameMeshRef.current) {
      const flameGeo = new ConeGeometry(0.3, 0.8, 6);
      const flameMat = new MeshBasicMaterial({
        color: 0xff4500,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      });
      flameMeshRef.current = new InstancedMesh(flameGeo, flameMat, flameIndices.length);
      flameMeshRef.current.instanceMatrix.setUsage(DynamicDrawUsage);
    } else if (flameMeshRef.current.count !== flameIndices.length) {
      flameMeshRef.current.geometry.dispose();
      const flameGeo = new ConeGeometry(0.3, 0.8, 6);
      const flameMat = new MeshBasicMaterial({
        color: 0xff4500,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      });
      flameMeshRef.current = new InstancedMesh(flameGeo, flameMat, flameIndices.length);
      flameMeshRef.current.instanceMatrix.setUsage(DynamicDrawUsage);
    }

    // Position flames at burning cells
    flameIndices.forEach((linearIdx, instanceIdx) => {
      const row = Math.floor(linearIdx / GRID_W);
      const col = linearIdx % GRID_W;
      const [x, z] = gridToWorld(row, col);
      const [jx, jy, jz] = hashJitter3(linearIdx);
      dummy.current.position.set(x + jx * 0.2, 1.5 + jy * 0.1, z + jz * 0.2);
      dummy.current.rotation.y = hashJitter(linearIdx * 7 + 5) * Math.PI * 2;
      const scale = 0.5 + hashJitter(linearIdx * 11 + 7) * 0.5;
      dummy.current.scale.set(scale, scale, scale);
      dummy.current.updateMatrix();
      flameMeshRef.current!.setMatrixAt(instanceIdx, dummy.current.matrix);
    });

    flameMeshRef.current.count = flameIndices.length;
    flameMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [buckets, t]);

  // Flame pulsing animation - runs every frame, no allocations
  useFrame((_, delta) => {
    if (!flameMeshRef.current || flameMeshRef.current.count === 0) return;

    const time = performance.now() * 0.001;
    const count = flameMeshRef.current.count;
    const mesh = flameMeshRef.current;

    for (let i = 0; i < count; i++) {
      mesh.getMatrixAt(i, dummy.current.matrix);
      const pulseScale = 1 + Math.sin(time * 4 + i * 0.1) * 0.15;
      dummy.current.matrix.scale(dummy.current.scale.clone().setScalar(pulseScale));
      dummy.current.matrix.makeRotationY(dummy.current.rotation.y + delta * 0.5);
      mesh.setMatrixAt(i, dummy.current.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return flameMeshRef.current ? (
    // eslint-disable-next-line react/no-unknown-property
    <primitive object={flameMeshRef.current} />
  ) : null;
}

/** Wrapper that computes buckets from ignition time and renders FireLayerCore */
export function FireLayer() {
  const { ignition, t, result, fuel } = useAppState();

  // Build buckets once when ignition changes (always call useMemo)
  const buckets = useMemo(() => {
    if (!ignition) return [] as number[][];
    return bucketByIgnition(ignition);
  }, [ignition]);

  if (!ignition || !result || !fuel || !buckets.length) return null;

  return <FireLayerCore buckets={buckets} t={t} />;
}