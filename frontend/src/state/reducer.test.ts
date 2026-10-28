// src/state/reducer.test.ts - Unit tests for app reducer

import { describe, expect, it } from "vitest";
import type { RegionInfo } from "../api/types";
import { appReducer, initialState } from "./reducer";
import type { AppState } from "./types";

const mockRegions: RegionInfo[] = [
  {
    id: "region_a",
    name: "Region A",
    description: "First test region",
    grid: {
      height: 100,
      width: 100,
      cell_size_m: 30,
      bbox: [100.0, 0.0, 100.1, 0.1],
    },
    default_params: {
      fire_intensity: 1.5,
      wind_speed: 10.0,
      wind_from_deg: 90,
      fuel_moisture: 0.2,
      steps: 150,
    },
  },
  {
    id: "region_b",
    name: "Region B",
    description: "Second test region",
    grid: {
      height: 200,
      width: 200,
      cell_size_m: 30,
      bbox: [101.0, 1.0, 101.2, 1.2],
    },
    default_params: {
      fire_intensity: 2.0,
      wind_speed: 15.0,
      wind_from_deg: 180,
      fuel_moisture: 0.05,
      steps: 300,
    },
  },
];

describe("appReducer", () => {
  it("SET_REGIONS initializes regions and selects first region if unselected", () => {
    const state = appReducer(initialState, {
      type: "SET_REGIONS",
      payload: mockRegions,
    });

    expect(state.regions).toHaveLength(2);
    expect(state.regionId).toBe("region_a");
    expect(state.params).toEqual(mockRegions[0].default_params);
  });

  it("SET_REGION_ID changes region, sets params to default_params, and resets state", () => {
    // Populate state with regions and some dummy state
    const populatedState: AppState = {
      ...initialState,
      regions: mockRegions,
      regionId: "region_a",
      params: mockRegions[0].default_params,
      ignitionPoints: [{ lat: 0.05, lon: 100.05 }],
      t: 10,
      playing: true,
      status: "done",
      result: null,
      ignition: new Int16Array([1, 2, 3]),
      error: { code: "SOME_ERR", message: "Error" },
    };

    const nextState = appReducer(populatedState, {
      type: "SET_REGION_ID",
      payload: "region_b",
    });

    expect(nextState.regionId).toBe("region_b");
    expect(nextState.params).toEqual(mockRegions[1].default_params);
    expect(nextState.ignitionPoints).toEqual([]);
    expect(nextState.t).toBe(0);
    expect(nextState.playing).toBe(false);
    expect(nextState.status).toBe("idle");
    expect(nextState.result).toBeNull();
    expect(nextState.ignition).toBeNull();
    expect(nextState.error).toBeNull();
  });

  it("ADD_IGNITION_POINT adds point up to 5 max limit", () => {
    let state = initialState;

    for (let i = 1; i <= 5; i++) {
      state = appReducer(state, {
        type: "ADD_IGNITION_POINT",
        payload: { lat: i, lon: i },
      });
      expect(state.ignitionPoints).toHaveLength(i);
    }

    // 6th point should be ignored
    const stateAfter6th = appReducer(state, {
      type: "ADD_IGNITION_POINT",
      payload: { lat: 6, lon: 6 },
    });

    expect(stateAfter6th.ignitionPoints).toHaveLength(5);
    expect(stateAfter6th.ignitionPoints).toEqual([
      { lat: 1, lon: 1 },
      { lat: 2, lon: 2 },
      { lat: 3, lon: 3 },
      { lat: 4, lon: 4 },
      { lat: 5, lon: 5 },
    ]);
  });

  it("REMOVE_IGNITION_POINT removes point by index or coordinate", () => {
    let state: AppState = {
      ...initialState,
      ignitionPoints: [
        { lat: 1, lon: 1 },
        { lat: 2, lon: 2 },
        { lat: 3, lon: 3 },
      ],
    };

    // Remove index 1 ({ lat: 2, lon: 2 })
    state = appReducer(state, {
      type: "REMOVE_IGNITION_POINT",
      payload: 1,
    });
    expect(state.ignitionPoints).toEqual([
      { lat: 1, lon: 1 },
      { lat: 3, lon: 3 },
    ]);

    // Remove by point object
    state = appReducer(state, {
      type: "REMOVE_IGNITION_POINT",
      payload: { lat: 1, lon: 1 },
    });
    expect(state.ignitionPoints).toEqual([{ lat: 3, lon: 3 }]);
  });

  it("CLEAR_IGNITION_POINTS clears all points", () => {
    const state: AppState = {
      ...initialState,
      ignitionPoints: [
        { lat: 1, lon: 1 },
        { lat: 2, lon: 2 },
      ],
    };

    const nextState = appReducer(state, { type: "CLEAR_IGNITION_POINTS" });
    expect(nextState.ignitionPoints).toEqual([]);
  });

  it("SET_PARAM updates specified parameter", () => {
    const state = appReducer(initialState, {
      type: "SET_PARAM",
      payload: { key: "wind_speed", value: 25.0 },
    });

    expect(state.params.wind_speed).toBe(25.0);
    expect(state.params.fire_intensity).toBe(initialState.params.fire_intensity);
  });

  it("RESET restores region default params and resets active state", () => {
    const modifiedState: AppState = {
      ...initialState,
      regions: mockRegions,
      regionId: "region_a",
      params: { ...mockRegions[0].default_params, wind_speed: 99 },
      ignitionPoints: [{ lat: 1, lon: 1 }],
      t: 50,
      playing: true,
      status: "done",
    };

    const resetState = appReducer(modifiedState, { type: "RESET" });

    expect(resetState.params).toEqual(mockRegions[0].default_params);
    expect(resetState.ignitionPoints).toEqual([]);
    expect(resetState.t).toBe(0);
    expect(resetState.playing).toBe(false);
    expect(resetState.status).toBe("idle");
  });
});
