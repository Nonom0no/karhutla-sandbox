// src/scene/Vegetation.tsx - Vegetation layer with InstancedMesh, including burning/burned state updates

import { useMemo, useRef, useEffect } from 'react';
import {
  InstancedMesh,
  Object3D,
  Color,
  InstancedBufferAttribute,
  MeshStandardMaterial,
  IcosahedronGeometry,
  ConeGeometry,
  BoxGeometry,
  DynamicDrawUsage,
} from 'three';
import { useAppState } from '../state/context';
import { fuelUint8ToFloat } from '../lib/fuel';
import { gridToWorld } from '../lib/world';
import { hashJitter, hashJitter3, hashRotation, hashScale, bucketByIgnition, diffCells } from '../lib/cells';
import { theme, type RegionId } from './theme';

const GRID_W = 200;
const GRID_H = 200;
const TOTAL = GRID_W * GRID_H;

function getRegionType(regionId: string): RegionId {
  if (regionId.includes('rainforest')) return 'tropical_rainforest';
  if (regionId.includes('dry')) return 'dry_forest';
  if (regionId.includes('grass')) return 'grassland';
  return 'dry_forest';
}

// Adjust vegetation color based on fuel_moisture (0-1)
function adjustColorForMoisture(baseColor: number, moisture: number): number {
  const r = (baseColor >> 16) & 0xff;
  const g = (baseColor >> 8) & 0xff;
  const b = baseColor & 0xff;
  const newR = Math.round(r * (1 - moisture * 0.3));
  const newG = Math.min(255, Math.round(g * (1 + moisture * 0.2)));
  const newB = b;
  return (newR << 16) | (newG << 8) | newB;
}

export function Vegetation() {
  const { fuel, regionId, params, quality, ignition, t } = useAppState();
  const regionType = getRegionType(regionId);
  const fuelMoisture = params.fuel_moisture ?? 0.1;

  // InstancedMesh refs
  const vegMeshRef = useRef<InstancedMesh | null>(null);
  const waterMeshRef = useRef<InstancedMesh | null>(null);
  const edgeMeshRef = useRef<InstancedMesh | null>(null);
  const cellToVegIndexRef = useRef<number[]>([]);

  // Build instance data when fuel or region changes
  useMemo(() => {
    if (!fuel || fuel.length !== TOTAL) return;

    const vegColors = theme.treeColors[regionType] ?? theme.treeColors.dry_forest;
    const waterColor = theme.waterColor;
    const edgeColor = theme.groundColors.edge;

    // Count instances
    let vegCount = 0;
    let waterCount = 0;
    let edgeCount = 0;
    for (let i = 0; i < TOTAL; i++) {
      const f = fuelUint8ToFloat(fuel[i]);
      if (f > 0) vegCount++; else waterCount++;
    }
    edgeCount = GRID_W * 2 + (GRID_H - 2) * 2;

    // Geometries
    const treeGeo = regionType === 'tropical_rainforest' ? new IcosahedronGeometry(1, 0) : new ConeGeometry(1, 2, 4);
    const grassGeo = new ConeGeometry(0.5, 0.8, 3);
    const waterGeo = new BoxGeometry(1, 0.1, 1);
    const edgeGeo = new BoxGeometry(1, 0.5, 1);

    // Materials
    const vegMat = new MeshStandardMaterial({ flatShading: true, vertexColors: false });
    const waterMat = new MeshStandardMaterial({ color: waterColor, flatShading: true });
    const edgeMat = new MeshStandardMaterial({ color: edgeColor, flatShading: true });

    // InstancedMeshes
    const vegMesh = new InstancedMesh(regionType === 'grassland' ? grassGeo : treeGeo, vegMat, vegCount);
    vegMesh.instanceColor = new InstancedBufferAttribute(new Float32Array(vegCount * 3), 3);
    vegMesh.instanceMatrix.setUsage(DynamicDrawUsage);
    if (vegMesh.instanceColor) vegMesh.instanceColor.setUsage(DynamicDrawUsage);

    const waterMesh = new InstancedMesh(waterGeo, waterMat, waterCount);
    waterMesh.instanceMatrix.setUsage(DynamicDrawUsage);

    const edgeMesh = new InstancedMesh(edgeGeo, edgeMat, edgeCount);
    edgeMesh.instanceMatrix.setUsage(DynamicDrawUsage);

    // Fill instances
    let vegIdx = 0;
    let waterIdx = 0;
    const dummy = new Object3D();
    const color = new Color();
    cellToVegIndexRef.current = new Array(TOTAL).fill(-1);

    for (let row = 0; row < GRID_H; row++) {
      for (let col = 0; col < GRID_W; col++) {
        const idx = row * GRID_W + col;
        const f = fuelUint8ToFloat(fuel[idx]);
        const [x, z] = gridToWorld(row, col);
        if (f > 0) {
          const [jx, jy, jz] = hashJitter3(idx);
          const posX = x + jx * 0.4;
          const posY = jy * 0.1;
          const posZ = z + jz * 0.4;
          const rotY = hashRotation(idx);
          const baseScale = 0.5 + f * 1.5;
          const scale = baseScale * hashScale(idx);
          dummy.position.set(posX, posY, posZ);
          dummy.rotation.y = rotY;
          dummy.scale.set(scale, scale, scale);
          dummy.updateMatrix();
          vegMesh.setMatrixAt(vegIdx, dummy.matrix);
          const baseColor = vegColors[Math.floor(hashJitter(idx) * vegColors.length)];
          const moistColor = adjustColorForMoisture(baseColor, fuelMoisture);
          color.setHex(moistColor);
          if (vegMesh.instanceColor) vegMesh.instanceColor.setXYZ(vegIdx, color.r, color.g, color.b);
          cellToVegIndexRef.current[idx] = vegIdx;
          vegIdx++;
        } else {
          const [jx, , jz] = hashJitter3(idx);
          const posX = x + jx * 0.1;
          const posZ = z + jz * 0.1;
          dummy.position.set(posX, -0.05, posZ);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          waterMesh.setMatrixAt(waterIdx, dummy.matrix);
          waterIdx++;
        }
      }
    }

    // Edge ring
    let edgeIdx = 0;
    for (let row = 0; row < GRID_H; row++) {
      const [x, z] = gridToWorld(row, -1);
      dummy.position.set(x, 0.25, z);
      dummy.scale.set(1, 0.5, 1);
      dummy.updateMatrix();
      edgeMesh.setMatrixAt(edgeIdx, dummy.matrix);
      edgeIdx++;
    }
    for (let row = 0; row < GRID_H; row++) {
      const [x, z] = gridToWorld(row, GRID_W);
      dummy.position.set(x, 0.25, z);
      dummy.scale.set(1, 0.5, 1);
      dummy.updateMatrix();
      edgeMesh.setMatrixAt(edgeIdx, dummy.matrix);
      edgeIdx++;
    }
    for (let col = 1; col < GRID_W - 1; col++) {
      const [x, z] = gridToWorld(-1, col);
      dummy.position.set(x, 0.25, z);
      dummy.scale.set(1, 0.5, 1);
      dummy.updateMatrix();
      edgeMesh.setMatrixAt(edgeIdx, dummy.matrix);
      edgeIdx++;
    }
    for (let col = 1; col < GRID_W - 1; col++) {
      const [x, z] = gridToWorld(GRID_H, col);
      dummy.position.set(x, 0.25, z);
      dummy.scale.set(1, 0.5, 1);
      dummy.updateMatrix();
      edgeMesh.setMatrixAt(edgeIdx, dummy.matrix);
      edgeIdx++;
    }

    vegMesh.instanceMatrix.needsUpdate = true;
    if (vegMesh.instanceColor) vegMesh.instanceColor.needsUpdate = true;
    waterMesh.instanceMatrix.needsUpdate = true;
    edgeMesh.instanceMatrix.needsUpdate = true;
    vegMeshRef.current = vegMesh;
    waterMeshRef.current = waterMesh;
    edgeMeshRef.current = edgeMesh;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fuel, regionId, fuelMoisture, quality, regionType]);

  // Update burning/burned states when t changes
  useEffect(() => {
    const vegMesh = vegMeshRef.current;
    const vegInstanceColor = vegMesh?.instanceColor as InstancedBufferAttribute | null;
    const cellToVegIdx = cellToVegIndexRef.current;
    if (!vegMesh || !vegInstanceColor || !ignition) return;

    // Build buckets from ignition
    const buckets = bucketByIgnition(ignition);
    const { toBurning, toBurned } = diffCells(buckets, t - 1, t);
    const burningColor = new Color(0xff3300);
    const burnedColor = new Color(0x221100);
    const dummy = new Object3D();
    // Update burning cells
    toBurning.forEach((linearIdx) => {
      const vegIdx = cellToVegIdx[linearIdx];
      if (vegIdx >= 0) {
        vegInstanceColor.setXYZ(vegIdx, burningColor.r, burningColor.g, burningColor.b);
        dummy.position.set(0, 0, 0);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1.1, 1.1, 1.1);
        dummy.updateMatrix();
        vegMesh.setMatrixAt(vegIdx, dummy.matrix);
      }
    });
    // Update burned cells
    toBurned.forEach((linearIdx) => {
      const vegIdx = cellToVegIdx[linearIdx];
      if (vegIdx >= 0) {
        vegInstanceColor.setXYZ(vegIdx, burnedColor.r, burnedColor.g, burnedColor.b);
        dummy.position.set(0, 0, 0);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(0.35, 0.35, 0.35);
        dummy.updateMatrix();
        vegMesh.setMatrixAt(vegIdx, dummy.matrix);
      }
    });
    vegMesh.instanceMatrix.needsUpdate = true;
    vegInstanceColor.needsUpdate = true;
  }, [ignition, t]);

  // Render meshes
  return (
    <>
      {/* eslint-disable-next-line react/no-unknown-property */}
      {vegMeshRef.current && <primitive object={vegMeshRef.current} />}
      {/* eslint-disable-next-line react/no-unknown-property */}
      {waterMeshRef.current && <primitive object={waterMeshRef.current} />}
      {/* eslint-disable-next-line react/no-unknown-property */}
      {edgeMeshRef.current && <primitive object={edgeMeshRef.current} />}
    </>
  );
}