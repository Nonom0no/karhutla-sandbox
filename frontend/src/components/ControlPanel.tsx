// src/components/ControlPanel.tsx - Region selection, parameter controls, simulation triggers

import React, { useEffect } from "react";
import { getRegions } from "../api/client";
import { useAppDispatch, useAppState } from "../state/context";
import type { SimulationParams } from "../state/types";

export interface ControlPanelProps {
  onSimulate?: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ onSimulate }) => {
  const state = useAppState();
  const dispatch = useAppDispatch();

  useEffect(() => {
    let active = true;
    if (state.regions.length === 0) {
      getRegions()
        .then((data) => {
          if (active) {
            dispatch({ type: "SET_REGIONS", payload: data.regions });
          }
        })
        .catch((err) => {
          if (active) {
            dispatch({
              type: "SET_ERROR",
              payload: {
                code: "NETWORK_ERROR",
                message: err instanceof Error ? err.message : "Gagal memuat region",
              },
            });
          }
        });
    }
    return () => {
      active = false;
    };
  }, [dispatch, state.regions.length]);

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch({ type: "SET_REGION_ID", payload: e.target.value });
  };

  const handleParamChange = (
    key: keyof SimulationParams,
    value: string
  ) => {
    const numValue = value === "" ? undefined : Number(value);
    dispatch({
      type: "SET_PARAM",
      payload: { key, value: numValue },
    });
  };

  const handleReset = () => {
    dispatch({ type: "RESET" });
  };

  const handleSimulate = () => {
    if (onSimulate) {
      onSimulate();
    }
  };

  return (
    <div className="control-panel" style={{ padding: "16px" }}>
      <h2>Kontrol Simulasi</h2>

      {/* Region Selector */}
      <div style={{ marginBottom: "12px" }}>
        <label htmlFor="region-select" style={{ display: "block", marginBottom: "4px" }}>
          Wilayah
        </label>
        <select
          id="region-select"
          value={state.regionId}
          onChange={handleRegionChange}
          style={{ width: "100%", padding: "8px" }}
        >
          {state.regions.map((region) => (
            <option key={region.id} value={region.id}>
              {region.name}
            </option>
          ))}
        </select>
      </div>

      {/* Parameters */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
        <div>
          <label htmlFor="fire_intensity" style={{ display: "block" }}>
            Intensitas Api
          </label>
          <input
            id="fire_intensity"
            type="number"
            step="0.1"
            value={state.params.fire_intensity}
            onChange={(e) => handleParamChange("fire_intensity", e.target.value)}
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <label htmlFor="wind_speed" style={{ display: "block" }}>
            Kecepatan Angin (m/s)
          </label>
          <input
            id="wind_speed"
            type="number"
            step="0.5"
            value={state.params.wind_speed}
            onChange={(e) => handleParamChange("wind_speed", e.target.value)}
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <label htmlFor="wind_from_deg" style={{ display: "block" }}>
            Arah Angin (°)
          </label>
          <input
            id="wind_from_deg"
            type="number"
            step="1"
            value={state.params.wind_from_deg}
            onChange={(e) => handleParamChange("wind_from_deg", e.target.value)}
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <label htmlFor="fuel_moisture" style={{ display: "block" }}>
            Kelembapan Bahan Bakar
          </label>
          <input
            id="fuel_moisture"
            type="number"
            step="0.01"
            value={state.params.fuel_moisture}
            onChange={(e) => handleParamChange("fuel_moisture", e.target.value)}
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <label htmlFor="steps" style={{ display: "block" }}>
            Langkah Simulasi
          </label>
          <input
            id="steps"
            type="number"
            step="1"
            value={state.params.steps}
            onChange={(e) => handleParamChange("steps", e.target.value)}
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <label htmlFor="seed" style={{ display: "block" }}>
            Seed
          </label>
          <input
            id="seed"
            type="number"
            step="1"
            value={state.params.seed ?? ""}
            onChange={(e) => handleParamChange("seed", e.target.value)}
            style={{ width: "100%" }}
            placeholder="Acak (opsional)"
          />
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          type="button"
          onClick={handleSimulate}
          disabled={state.ignitionPoints.length === 0 || state.status === "loading"}
          style={{ flex: 1, padding: "8px 16px" }}
        >
          {state.status === "loading" ? "Memproses..." : "Jalankan Simulasi"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          style={{ padding: "8px 16px" }}
        >
          Reset
        </button>
      </div>
    </div>
  );
};
