// src/scene/Ground.tsx - Ground plane for the diorama with click-to-ignite handling
/* eslint-disable react/no-unknown-property */

import { useEffect, useMemo, useRef, useState } from "react";
import { MeshStandardMaterial, PlaneGeometry } from "three";
import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { theme } from "./theme";
import { fuelUint8ToFloat } from "../lib/fuel";
import {
  cellToLatLon,
  latLonToCell,
  worldToCell,
  GRID_WIDTH,
  GRID_HEIGHT,
} from "../lib/world";
import { useAppDispatch, useAppState } from "../state/context";

const MAX_IGNITION_POINTS = 5;
const CLICK_MAX_DISTANCE_PX = 5;
const CLICK_MAX_DURATION_MS = 300;
const TOAST_DURATION_MS = 2000;

interface GroundProps {
  regionId?: string;
  /** Fuel grid (uint8, row-major) used to reject clicks on water/edge cells */
  fuelGrid?: Uint8Array | null;
  width?: number;
  height?: number;
}

export function Ground({
  regionId = "dry_forest",
  fuelGrid,
  width = GRID_WIDTH,
  height = GRID_HEIGHT,
}: GroundProps) {
  const dispatch = useAppDispatch();
  const { ignitionPoints, status, regions } = useAppState();

  const pointerDownRef = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );
  const toastTimerRef = useRef<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const baseColor =
    theme.groundColors[regionId as keyof typeof theme.groundColors] ??
    theme.groundColors.dry_forest;

  // Plane lies flat on XZ (rotation applied once, inside the memo)
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(width, height, 1, 1);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [width, height]);

  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: baseColor,
        roughness: 0.9,
        metalness: 0,
      }),
    [baseColor],
  );

  // Cleanup GPU resources and pending timer
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, TOAST_DURATION_MS);
  };

  const handleClick = (event: ThreeEvent<PointerEvent>) => {
    // Ignition points can only be placed before a simulation exists
    if (status === "loading" || status === "done") return;

    if (ignitionPoints.length >= MAX_IGNITION_POINTS) {
      showToast("Maksimal 5 titik api");
      return;
    }

    // R3F already gives us the world-space hit point on the ground plane
    const cell = worldToCell(event.point.x, event.point.z);
    if (!cell) {
      showToast("Tidak bisa menyulut api di sini");
      return;
    }
    const [row, col] = cell;

    // Reject water / border cells (fuel == 0)
    if (fuelGrid && fuelGrid.length === GRID_WIDTH * GRID_HEIGHT) {
      const fuelValue = fuelUint8ToFloat(fuelGrid[row * GRID_WIDTH + col]);
      if (fuelValue === 0) {
        showToast("Tidak bisa menyulut api di sini");
        return;
      }
    }

    const region = regions.find((r) => r.id === regionId);
    if (!region) return;
    const bbox = region.grid.bbox;

    // Ignore duplicate point on the same cell
    const alreadyExists = ignitionPoints.some((p) => {
      const c = latLonToCell(p.lat, p.lon, bbox);
      return c !== null && c[0] === row && c[1] === col;
    });
    if (alreadyExists) return;

    // Send the cell CENTER as lat/lon (server maps it back to the same cell)
    const { lat, lon } = cellToLatLon(row, col, bbox);
    dispatch({ type: "ADD_IGNITION_POINT", payload: { lat, lon } });
  };

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    // Left button / primary touch only; other buttons belong to OrbitControls
    if (event.button !== 0) return;
    pointerDownRef.current = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
    };
  };

  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => {
    const down = pointerDownRef.current;
    pointerDownRef.current = null;
    if (event.button !== 0 || !down) return;

    const dx = event.clientX - down.x;
    const dy = event.clientY - down.y;
    const distance = Math.hypot(dx, dy);
    const duration = performance.now() - down.time;

    // Distinguish a click from a camera drag
    if (distance < CLICK_MAX_DISTANCE_PX && duration < CLICK_MAX_DURATION_MS) {
      handleClick(event);
    }
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
        <Html center position={[0, 8, 0]} style={{ pointerEvents: "none" }}>
          <div
            role="status"
            aria-live="polite"
            style={{
              background: "rgba(0,0,0,0.75)",
              color: "#fff",
              padding: "8px 16px",
              borderRadius: 4,
              fontSize: "14px",
              whiteSpace: "nowrap",
              userSelect: "none",
            }}
          >
            {toast}
          </div>
        </Html>
      )}
    </>
  );
}
