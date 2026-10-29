// src/api/client.ts – Simple fetch client handling success and error envelopes

import type {
  SimulateRequest,
  SimulateResponse,
  GetRegionsResponse,
  FuelData,
  ErrorEnvelope,
} from "./types";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "");

// Define a custom error interface with code property
interface ApiError extends Error {
  code: string;
  details?: Array<{ field: string; issue: string }>;
}

function createApiError(message: string, code: string, details?: ApiError['details']): ApiError {
  const err = new Error(message) as ApiError;
  err.code = code;
  err.details = details;
  return err;
}

async function handleResponse<T>(resp: Response): Promise<T> {
  const json = await resp.json();
  if (resp.ok) {
    return json as T;
  }
  // Assume error envelope shape
  const err = (json as ErrorEnvelope).error;
  throw createApiError(err.message, err.code, err.details);
}

function fetchWithTimeout<T>(url: string, options: RequestInit = {}, timeout = 30000): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...options, signal: controller.signal })
    .then((resp) => {
      clearTimeout(id);
      return handleResponse<T>(resp);
    })
    .catch((e) => {
      clearTimeout(id);
      if (e instanceof DOMException && (e.name === 'AbortError' || e.name === 'TimeoutError')) {
        throw createApiError('Permintaan timeout', 'TIMEOUT_ERROR');
      }
      if (e instanceof TypeError && e.message.includes('fetch')) {
        throw createApiError('Tidak dapat terhubung ke server', 'NETWORK_ERROR');
      }
      throw e;
    });
}

export async function getRegions(): Promise<GetRegionsResponse> {
  return fetchWithTimeout<GetRegionsResponse>(`${API_BASE}/api/regions`);
}

export async function getFuel(regionId: string, signal?: AbortSignal): Promise<FuelData> {
  const resp = await fetch(`${API_BASE}/api/regions/${encodeURIComponent(regionId)}/fuel`, { signal });
  return handleResponse<FuelData>(resp);
}

export async function simulate(request: SimulateRequest, signal?: AbortSignal): Promise<SimulateResponse> {
  const resp = await fetch(`${API_BASE}/api/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  return handleResponse<SimulateResponse>(resp);
}

export async function getSimulation(id: string, signal?: AbortSignal): Promise<SimulateResponse> {
  const resp = await fetch(`${API_BASE}/api/simulation/${encodeURIComponent(id)}`, { signal });
  return handleResponse<SimulateResponse>(resp);
}
