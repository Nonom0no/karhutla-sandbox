// src/api/client.test.ts – Vitest tests for API client with mocked fetch

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getRegions, simulate, getSimulation } from "./client";
import type { GetRegionsResponse, SimulateResponse } from "./types";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
});

describe("API client", () => {
  it("handles successful GET /regions", async () => {
    const fake: GetRegionsResponse = { regions: [] };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => fake,
    } as Response);
    const res = await getRegions();
    expect(res).toEqual(fake);
    expect(mockFetch).toHaveBeenCalledWith("/regions");
  });

  it("parses error envelope on failure", async () => {
    const errEnvelope = {
      error: { code: "VALIDATION_ERROR", message: "wind_speed must be <= 20", details: [] },
    };
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => errEnvelope,
    } as Response);
    await expect(simulate({ region_id: "dry_forest", ignition_points: [] })).rejects.toMatchObject({
      message: "wind_speed must be <= 20",
      code: "VALIDATION_ERROR",
    });
  });

  it("gets simulation by id", async () => {
    const fake: SimulateResponse = {
      id: "abc",
      status: "done",
      created_at: "2026-01-01T00:00:00Z",
      expires_at: "2026-01-01T00:30:00Z",
      region_id: "dry_forest",
      seed: 42,
      params: {
        ignition_points: [],
        fire_intensity: 60,
        wind_speed: 5,
        wind_from_deg: 270,
        fuel_moisture: 0.4,
      },
      derived: { p_base: 0, dryness_multiplier: 0, k: 0 },
      grid: { height: 1, width: 1, cell_size_m: 30, bbox: [0, 0, 0, 0] },
      steps: 200,
      steps_run: 200,
      ignition_time: {
        encoding: "base64-int16-le",
        dtype: "int16",
        order: "row-major",
        data: "",
      },
      stats: { burned_cells: 0, burned_fraction: 0, burned_area_ha: 0 },
    };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => fake } as Response);
    const res = await getSimulation("abc");
    expect(res.id).toBe("abc");
  });
});
