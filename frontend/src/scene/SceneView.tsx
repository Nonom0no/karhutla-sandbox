// src/scene/SceneView.tsx - Main 3D scene with orbit camera, lights, and ground
/* eslint-disable react/no-unknown-property */

import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Environment } from '@react-three/drei';
import { theme } from './theme';
import { Ground } from './Ground';
import { Vegetation } from './Vegetation';
import { IgnitionMarkers } from './IgnitionMarkers';
import { FireLayer } from './FireLayer';
import { WindFx } from './WindFx';
import { useAppState } from '../state/context';
import { useMemo } from 'react';

// Fallback component when WebGL is not available
function WebGLFallback() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f0f0',
        color: '#666',
        fontFamily: 'system-ui, sans-serif',
        border: '1px dashed #ccc',
        borderRadius: '8px',
        padding: '2rem',
        textAlign: 'center',
      }}
      role="alert"
    >
      <div>
        <h3 style={{ margin: '0 0 0.5rem' }}>WebGL tidak tersedia</h3>
        <p style={{ margin: 0 }}>
          Browser Anda tidak mendukung WebGL. Visualisasi 3D tidak dapat ditampilkan.
        </p>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
          Coba gunakan browser modern (Chrome, Firefox, Edge, Safari) dengan akselerasi hardware aktif.
        </p>
      </div>
    </div>
  );
}

// Inner scene content (lights, ground, etc.)
function SceneContent() {
  const { regionId, fuel, ignitionPoints, result } = useAppState();

  return (
    <>
      {/* Ambient light */}
      <ambientLight
        color={theme.ambientLightColor}
        intensity={theme.ambientLightIntensity}
      />

      {/* Directional light (sun) */}
      <directionalLight
        color={theme.directionalLightColor}
        intensity={theme.directionalLightIntensity}
        position={theme.directionalLightPosition}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={500}
        shadow-camera-left={-300}
        shadow-camera-right={300}
        shadow-camera-top={300}
        shadow-camera-bottom={-300}
        shadow-bias={-0.001}
      />

      {/* Environment for better lighting */}
      <Environment preset="dawn" background={false} />

      {/* Ground plane */}
      <Ground regionId={regionId} fuelGrid={fuel} />

      {/* Vegetation layer (trees, grass, water, edges) */}
      {fuel && <Vegetation />}

      {/* Fire layer (flames + burning/burned vegetation updates) */}
      {fuel && result && <FireLayer />}

      {/* Wind visual effects (arrow, drifting smoke, tree sway) */}
      {fuel && <WindFx />}

      {/* Ignition markers (torches) */}
      {ignitionPoints.length > 0 && <IgnitionMarkers />}

      {/* Coordinate axes helper (for debugging) */}
      {/* <axesHelper args={[50]} /> */}
    </>
  );
}

// Camera controls setup
function CameraControls() {
  useThree();

  return (
    <OrbitControls
      makeDefault
      enablePan
      enableZoom
      enableRotate
      enableDamping
      dampingFactor={0.05}
      zoomToCursor
      minDistance={10}
      maxDistance={500}
      minPolarAngle={0.1}
      maxPolarAngle={Math.PI / 2 - 0.05}
      target={[0, 0, 0]}
    />
  );
}

interface SceneViewProps {
  regionId: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Main 3D scene view component.
 * Renders a Canvas with orbit controls, lights, ground plane.
 * Shows fallback message if WebGL is not available.
 */
export function SceneView({ regionId = 'dry_forest', className = '', style }: SceneViewProps) {
  const { quality } = useAppState();

  // Quality-based canvas settings
  const canvasProps = useMemo(() => {
    const isLow = quality === 'low';
    return {
      shadows: !isLow, // no shadows in low quality
      dpr: isLow ? Math.min(window.devicePixelRatio, 1.5) : undefined, // cap DPR at 1.5 in low quality
      camera: {
        position: theme.cameraPosition,
        fov: theme.cameraFov,
        near: theme.cameraNear,
        far: theme.cameraFar,
      },
      gl: { antialias: !isLow, alpha: false }, // disable antialias in low quality
      onCreated: ({ gl }: { gl: import('three').WebGLRenderer }) => {
        gl.setClearColor(theme.backgroundColor, 1);
      },
    };
  }, [quality]);

  return (
    <div className={className} style={{ width: '100%', height: '100%', minHeight: '400px', ...style }}>
      <Canvas
        {...canvasProps}
        style={{ touchAction: 'none', width: '100%', height: '100%' }}
        fallback={<WebGLFallback />}
      >
        <SceneContent />
        <CameraControls />
        <Html
          as="div"
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            pointerEvents: 'none',
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: '12px',
              fontFamily: 'monospace',
            }}
          >
            {regionId}
          </div>
        </Html>
      </Canvas>
    </div>
  );
}