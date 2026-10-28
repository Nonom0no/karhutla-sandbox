// src/api/client.ts – Simple fetch client handling success and error envelopes

import type {
  SimulateRequest,
  SimulateResponse,
  GetRegionsResponse,
  ErrorEnvelope,
} from "./types";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "");

async function handleResponse<T>(resp: Response): Promise<T> {
  const json = await resp.json();
  if (resp.ok) {
    return json as T;
  }
  // Assume error envelope shape
  const err = (json as ErrorEnvelope).error;
  const error = new Error(err.message);
  // Attach code and details for downstream handling
  (error as unknown as { code: string; details?: Array<{ field: string; issue: string }> }).code = err.code;
  (error as unknown as { code: string; details?: Array<{ field: string; issue: string }> }).details = err.details;
  throw error;
}

export async function getRegions(): Promise<GetRegionsResponse> {
  const resp = await fetch(`${API_BASE}/api/regions`);
  return handleResponse<GetRegionsResponse>(resp);
}

export async function simulate(request: SimulateRequest): Promise<SimulateResponse> {
  const resp = await fetch(`${API_BASE}/api/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return handleResponse<SimulateResponse>(resp);
}

export async function getSimulation(id: string): Promise<SimulateResponse> {
  const resp = await fetch(`${API_BASE}/api/simulation/${encodeURIComponent(id)}`);
  return handleResponse<SimulateResponse>(resp);
}
