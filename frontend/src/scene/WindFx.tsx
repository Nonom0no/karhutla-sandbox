/* eslint-disable react/no-unknown-property */
// src/scene/WindFx.tsx - Simple wind visual effects: direction arrow, drifting smoke particles, optional tree sway


import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Mesh,
  SphereGeometry,
  InstancedMesh,
  Object3D,
  MeshStandardMaterial,
  DynamicDrawUsage,
} from 'three';
import { useAppState } from '../state/context';
import { windVectorWorld } from '../lib/world';

// Maximum particles for smoke effect – reasonable default
const MAX_SMOKE_PARTICLES = 200;

export function WindFx() {
  const { params, quality } = useAppState();
  const { wind_speed: windSpeed = 0, wind_from_deg: windFromDeg = 0 } = params;

  // Respect quality and reduced‑motion preference – compute after hooks
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Compute wind direction vector (unit length) in world coordinates
  const windVector = useMemo(() => windVectorWorld(windFromDeg), [windFromDeg]);

  // Arrow mesh – points toward wind direction (wind TO)
  const arrowRef = useRef<Mesh | null>(null);

  // Instanced smoke particles
  const smokeRef = useRef<InstancedMesh | null>(null);
  const dummy = useRef(new Object3D());

  // Initialise smoke particles once
  useEffect(() => {
    const geometry = new SphereGeometry(0.15, 6, 6);
    const material = new MeshStandardMaterial({ color: 0xcccccc, transparent: true, opacity: 0.7 });
    const mesh = new InstancedMesh(geometry, material, MAX_SMOKE_PARTICLES);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    const rand = Math.random;
    for (let i = 0; i < MAX_SMOKE_PARTICLES; i++) {
      const x = (rand() - 0.5) * 200; // spread across whole ground
      const y = 0.5 + rand() * 2; // slight height above ground
      const z = (rand() - 0.5) * 200;
      dummy.current.position.set(x, y, z);
      dummy.current.scale.set(0.5, 0.5, 0.5);
      dummy.current.updateMatrix();
      mesh.setMatrixAt(i, dummy.current.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    smokeRef.current = mesh;
  }, []);

  // Animate arrow and smoke each frame
  useFrame((_, delta) => {
    // Arrow points to wind TO direction (opposite of wind FROM)
    if (arrowRef.current) {
      const [x, z] = windVector;
      const angle = Math.atan2(x, -z); // rotate around Y axis
      arrowRef.current.rotation.y = angle;
    }

    // Drift smoke particles along wind vector, wrap around bounds
    if (smokeRef.current) {
      const mesh = smokeRef.current;
      const speed = windSpeed * 0.02; // empirical scaling
      const [dx, dz] = windVector;
      for (let i = 0; i < MAX_SMOKE_PARTICLES; i++) {
        mesh.getMatrixAt(i, dummy.current.matrix);
        dummy.current.matrix.decompose(dummy.current.position, dummy.current.quaternion, dummy.current.scale);
        dummy.current.position.x += dx * speed * delta;
        dummy.current.position.z += dz * speed * delta;
        // wrap around 200‑unit grid
        if (dummy.current.position.x < -100) dummy.current.position.x = 100;
        if (dummy.current.position.x > 100) dummy.current.position.x = -100;
        if (dummy.current.position.z < -100) dummy.current.position.z = 100;
        if (dummy.current.position.z > 100) dummy.current.position.z = -100;
        dummy.current.updateMatrix();
        mesh.setMatrixAt(i, dummy.current.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  // Early exit – respect quality, reduced motion, no wind
  if (quality === 'low' || reduced || windSpeed === 0) return null;

  // Render arrow and smoke
  return (
    <>
      {/* Arrow – simple cone + cylinder shaft */}
      <mesh ref={arrowRef} position={[0, 2, 0]}>
        {/* Shaft */}
        <cylinderGeometry args={[0.05, 0.05, 3, 8]} />
        <meshStandardMaterial color={0xdddddd} />
        {/* Head */}
        <mesh position={[0, 1.5, 0]}>
          <coneGeometry args={[0.2, 0.5, 8]} />
          <meshStandardMaterial color={0xdddddd} />
        </mesh>
      </mesh>
      {/* Smoke particles */}
      {smokeRef.current && <primitive object={smokeRef.current} />}
    </>
  );
}
