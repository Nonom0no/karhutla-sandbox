// src/components/ControlPanel.tsx - Region selection, parameter controls, simulation triggers

import React, { useRef } from "react";
import { simulate } from "../api/client";
import { decodeIgnitionTime } from "../lib/decode";
import { useAppDispatch, useAppState } from "../state/context";
import type { SimulationParams } from "../state/types";
import { Slider } from "./Slider";
import { getErrorMessage } from "../lib/text";

export const ControlPanel: React.FC = () => {
  const state = useAppState();
  const dispatch = useAppDispatch();

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

  const abortRef = useRef<AbortController | null>(null);

  const handleReset = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    dispatch({ type: "RESET" });
  };

  const handleSimulate = async () => {
    if (state.ignitionPoints.length === 0 || state.status === "loading") return;

    const region = state.regions.find((r) => r.id === state.regionId);
    if (!region) return;

    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

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

      const response = await simulate(request, abortRef.current.signal);

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
      // Ignore abort errors
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      const error = err as Error & { code?: string; details?: unknown };
      const code = error.code ?? "UNKNOWN_ERROR";
      dispatch({
        type: "SET_ERROR",
        payload: {
          code,
          message: getErrorMessage(code),
        },
      });
      dispatch({ type: "SET_STATUS", payload: "error" });
    }
  };

  return (
    <div className="control-panel" style={{ padding: "16px" }}>
      <h2>Kontrol Simulasi</h2>

      {/* Error display */}
      {state.error && (
        <div
          style={{
            marginBottom: "12px",
            padding: "8px 12px",
            background: "#ffebee",
            border: "1px solid #ef9a9a",
            borderRadius: "4px",
            color: "#c62828",
            fontSize: "0.875rem",
          }}
          role="alert"
          aria-live="assertive"
        >
          {state.error.message}
        </div>
      )}

      {/* Loading indicator */}
      {state.status === "loading" && (
        <div
          style={{
            marginBottom: "12px",
            padding: "8px 12px",
            background: "#e3f2fd",
            border: "1px solid #90caf9",
            borderRadius: "4px",
            color: "#1565c0",
            fontSize: "0.875rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
          role="status"
          aria-live="polite"
        >
          <span style={{ width: "16px", height: "16px", border: "2px solid #1565c0", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} aria-hidden="true" />
          Memproses simulasi...
        </div>
      )}

      {/* Region Selector */}
      <div style={{ marginBottom: "12px" }}>
        <label htmlFor="region-select" style={{ display: "block", marginBottom: "4px" }}>
          Wilayah
        </label>
        <select
          id="region-select"
          value={state.regionId}
          onChange={handleRegionChange}
          aria-label="Pilih wilayah simulasi"
          style={{ width: "100%", padding: "8px", minHeight: "44px" }}
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
          <label htmlFor="wind_from_deg" style={{ display: "block", marginBottom: "4px" }}>
            Arah Angin (°)
          </label>
          <input
            id="wind_from_deg"
            type="number"
            step="1"
            value={state.params.wind_from_deg}
            onChange={(e) => handleParamChange("wind_from_deg", e.target.value)}
            aria-label="Arah angin dalam derajat (0-359)"
            style={{ width: "100%", padding: "8px", minHeight: "44px" }}
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
          <label htmlFor="seed" style={{ display: "block", marginBottom: "4px" }}>
            Seed
          </label>
          <input
            id="seed"
            type="number"
            step="1"
            value={state.params.seed ?? ""}
            onChange={(e) => handleParamChange("seed", e.target.value)}
            aria-label="Seed untuk generator acak (kosong = acak)"
            style={{ width: "100%", padding: "8px", minHeight: "44px" }}
            placeholder="Acak (opsional)"
          />
        </div>

        {/* Quality toggle */}
        <div style={{ marginTop: "8px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", minHeight: "44px", padding: "4px 0" }}>
            <input
              type="checkbox"
              id="quality-toggle"
              checked={state.quality === "low"}
              onChange={(e) => dispatch({ type: "SET_QUALITY", payload: e.target.checked ? "low" : "high" })}
              style={{ width: "20px", height: "20px" }}
            />
            <span>Mode performa rendah</span>
          </label>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          type="button"
          onClick={handleSimulate}
          disabled={state.ignitionPoints.length === 0 || state.status === "loading"}
          aria-disabled={state.ignitionPoints.length === 0 || state.status === "loading"}
          aria-label={state.status === "loading" ? "Sedang memproses" : undefined}
          style={{ flex: 1, padding: "12px 16px", minHeight: "44px" }}
        >
          {state.status === "loading" ? "Memproses..." : "Jalankan Simulasi"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          aria-label="Reset simulasi"
          style={{ padding: "12px 16px", minHeight: "44px" }}
        >
          Reset
        </button>
      </div>
    </div>
  );
};
