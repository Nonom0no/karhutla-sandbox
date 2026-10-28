// src/scene/SceneView.tsx - Main 3D scene with orbit camera, lights, and ground
/* eslint-disable react/no-unknown-property */

import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Environment } from '@react-three/drei';
import { theme } from './theme';
import { Ground } from './Ground';

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
function SceneContent({ regionId }: { regionId: string }) {
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
      <Ground regionId={regionId} />

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
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      enableDamping={true}
      dampingFactor={0.05}
      minDistance={10}
      maxDistance={500}
      minPolarAngle={0.1}
      maxPolarAngle={Math.PI / 2 - 0.05}
      target={[100, 0, 100]}
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
  return (
    <div className={className} style={{ width: '100%', height: '100%', minHeight: '400px', ...style }}>
      <Canvas
        camera={{
          position: theme.cameraPosition,
          fov: theme.cameraFov,
          near: theme.cameraNear,
          far: theme.cameraFar,
        }}
        shadows
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor(theme.backgroundColor, 1);
        }}
        fallback={<WebGLFallback />}
      >
        <SceneContent regionId={regionId} />
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