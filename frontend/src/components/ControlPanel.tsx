// src/components/ControlPanel.tsx - Region selection, parameter controls, simulation triggers

import React, { useEffect } from "react";
import { getRegions, simulate } from "../api/client";
import { decodeIgnitionTime } from "../lib/decode";
import { useAppDispatch, useAppState } from "../state/context";
import type { SimulationParams } from "../state/types";
import { Slider } from "./Slider";

export const ControlPanel: React.FC = () => {
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

  const handleSimulate = async () => {
    if (state.ignitionPoints.length === 0 || state.status === "loading") return;

    const region = state.regions.find((r) => r.id === state.regionId);
    if (!region) return;

    dispatch({ type: "SET_STATUS", payload: "loading" });
    dispatch({ type: "SET_ERROR", payload: null });

    try {
      const request = {
        region_id: state.regionId,
        ignition_points: state.ignitionPoints,
        fire_intensity: state.params.fire_intensity,
        wind_speed: state.params.wind_speed,
        wind_from_deg: state.params.wind_from_deg,
        fuel_moisture: state.params.fuel_moisture,
        steps: state.params.steps,
        seed: state.params.seed,
      };

      const response = await simulate(request);

      // Decode ignition_time base64 to Int16Array
      const ignition = decodeIgnitionTime(
        response.ignition_time.data,
        response.grid.height,
        response.grid.width
      );

      dispatch({
        type: "SET_RESULT",
        payload: { result: response, ignition },
      });
    } catch (err) {
      const error = err as Error & { code?: string; details?: unknown };
      dispatch({
        type: "SET_ERROR",
        payload: {
          code: error.code ?? "UNKNOWN_ERROR",
          message: error.message ?? "Terjadi kesalahan tidak diketahui",
        },
      });
      dispatch({ type: "SET_STATUS", payload: "error" });
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
        {/* Intensitas Api slider */}
        <Slider
          label="Intensitas Api (1–100)"
          min={1}
          max={100}
          step={1}
          value={state.params.fire_intensity}
          onChange={(v) => handleParamChange("fire_intensity", String(v))}
        />

        {/* Kecepatan Angin slider */}
        <Slider
          label="Kecepatan Angin (0–20 m/s)"
          min={0}
          max={20}
          step={0.1}
          value={state.params.wind_speed}
          onChange={(v) => handleParamChange("wind_speed", String(v))}
        />

        {/* Wind from degree input retained */}
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

        {/* Kelembapan Bahan Bakar slider */}
        <Slider
          label="Kelembapan Bahan Bakar (0–1)"
          min={0}
          max={1}
          step={0.01}
          value={state.params.fuel_moisture}
          onChange={(v) => handleParamChange("fuel_moisture", String(v))}
        />

        {/* Langkah Simulasi slider */}
        <Slider
          label="Jumlah Langkah (1–500)"
          min={1}
          max={500}
          step={1}
          value={state.params.steps}
          onChange={(v) => handleParamChange("steps", String(v))}
        />

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
