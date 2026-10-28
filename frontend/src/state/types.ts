// src/state/types.ts - Types for app state and actions

import type { RegionInfo, SimulateResponse } from "../api/types";

export interface SimulationParams {
  fire_intensity: number;
  wind_speed: number;
  wind_from_deg: number;
  fuel_moisture: number;
  steps: number;
  seed?: number;
}

export interface IgnitionPoint {
  lat: number;
  lon: number;
}

export type Status = "idle" | "loading" | "done" | "error";
export type Speed = 0.5 | 1 | 2 | 4;

export interface AppError {
  code: string;
  message: string;
}

export interface AppState {
  regions: RegionInfo[];
  regionId: string;
  params: SimulationParams;
  ignitionPoints: IgnitionPoint[];
  status: Status;
  result: SimulateResponse | null;
  ignition: Int16Array | null;
  t: number;
  playing: boolean;
  speed: Speed;
  error: AppError | null;
}

export type Action =
  | { type: "SET_REGIONS"; payload: RegionInfo[] }
  | { type: "SET_REGION_ID"; payload: string }
  | {
      type: "SET_PARAM";
      payload: { key: keyof SimulationParams; value: number | undefined };
    }
  | { type: "ADD_IGNITION_POINT"; payload: IgnitionPoint }
  | { type: "REMOVE_IGNITION_POINT"; payload: number | IgnitionPoint }
  | { type: "CLEAR_IGNITION_POINTS" }
  | { type: "SET_STATUS"; payload: Status }
  | {
      type: "SET_RESULT";
      payload: { result: SimulateResponse; ignition: Int16Array } | null;
    }
  | { type: "SET_T"; payload: number }
  | { type: "SET_PLAYING"; payload: boolean }
  | { type: "SET_SPEED"; payload: Speed }
  | { type: "SET_ERROR"; payload: AppError | null }
  | { type: "RESET" };
