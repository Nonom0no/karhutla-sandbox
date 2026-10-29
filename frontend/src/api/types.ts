// src/api/types.ts – Types matching API_SPEC exactly (snake_case fields)

// Request types
export interface SimulateRequest {
  region_id: string;
  ignition_points: Array<{ lat: number; lon: number }>;
  fire_intensity?: number;
  wind_speed?: number;
  wind_from_deg?: number;
  fuel_moisture?: number;
  steps?: number;
  seed?: number;
}

export interface GetRegionsResponse {
  regions: RegionInfo[];
}

export interface RegionInfo {
  id: string;
  name: string;
  description: string;
  grid: GridInfo;
  default_params: DefaultParams;
}

export interface GridInfo {
  height: number;
  width: number;
  cell_size_m: number;
  // bbox order: [west, south, east, north]
  bbox: [number, number, number, number];
}

export interface DefaultParams {
  fire_intensity: number;
  wind_speed: number;
  wind_from_deg: number;
  fuel_moisture: number;
  steps: number;
}

// Response types
export interface SimulateResponse {
  id: string;
  status: string;
  created_at: string;
  expires_at: string;
  region_id: string;
  seed: number;
  params: SimulationParams;
  derived: DerivedParams;
  grid: GridInfo;
  steps: number;
  steps_run: number;
  ignition_time: IgnitionTimeData;
  stats: Stats;
}

export interface IgnitionTimeData {
  encoding: string; // e.g., "base64-int16-le"
  dtype: string; // "int16"
  order: string; // "row-major"
  data: string; // base64‑encoded Int16Array
}

export interface DerivedParams {
  p_base: number;
  dryness_multiplier: number;
  k: number;
}

export interface SimulationParams {
  ignition_points: Array<{ lat: number; lon: number }>;
  fire_intensity: number;
  wind_speed: number;
  wind_from_deg: number;
  fuel_moisture: number;
}

export interface Stats {
  burned_cells: number;
  burned_fraction: number;
  burned_area_ha: number;
}

// Fuel grid response (GET /api/regions/{id}/fuel)
export interface FuelData {
  region_id: string;
  height: number;
  width: number;
  encoding: string; // "base64-uint8"
  dtype: string; // "uint8"
  order: string; // "row-major"
  scale: number; // 255
  data: string; // base64-encoded Uint8Array
}

// Error envelope
export interface ApiError {
  code: string;
  message: string;
  details?: Array<{ field: string; issue: string }>;
}

export interface ErrorEnvelope {
  error: ApiError;
}
