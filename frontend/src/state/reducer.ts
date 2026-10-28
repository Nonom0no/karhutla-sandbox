// src/state/reducer.ts - App state reducer and initial state

import type { Action, AppState, SimulationParams } from "./types";

export const initialParams: SimulationParams = {
  fire_intensity: 1.0,
  wind_speed: 5.0,
  wind_from_deg: 0,
  fuel_moisture: 0.1,
  steps: 100,
};

export const initialState: AppState = {
  regions: [],
  regionId: "",
  params: initialParams,
  ignitionPoints: [],
  status: "idle",
  result: null,
  ignition: null,
  t: 0,
  playing: false,
  speed: 1,
  error: null,
};

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_REGIONS": {
      const regions = action.payload;
      if (regions.length === 0) {
        return { ...state, regions: [] };
      }
      if (!state.regionId || !regions.some((r) => r.id === state.regionId)) {
        const first = regions[0];
        return {
          ...state,
          regions,
          regionId: first.id,
          params: { ...first.default_params },
          ignitionPoints: [],
          result: null,
          ignition: null,
          t: 0,
          playing: false,
          status: "idle",
          error: null,
        };
      }
      return { ...state, regions };
    }

    case "SET_REGION_ID": {
      const regionId = action.payload;
      const region = state.regions.find((r) => r.id === regionId);
      const params = region ? { ...region.default_params } : state.params;
      return {
        ...state,
        regionId,
        params,
        ignitionPoints: [],
        result: null,
        ignition: null,
        t: 0,
        playing: false,
        status: "idle",
        error: null,
      };
    }

    case "SET_PARAM": {
      return {
        ...state,
        params: {
          ...state.params,
          [action.payload.key]: action.payload.value,
        },
      };
    }

    case "ADD_IGNITION_POINT": {
      if (state.ignitionPoints.length >= 5) {
        return state;
      }
      return {
        ...state,
        ignitionPoints: [...state.ignitionPoints, action.payload],
      };
    }

    case "REMOVE_IGNITION_POINT": {
      const target = action.payload;
      if (typeof target === "number") {
        return {
          ...state,
          ignitionPoints: state.ignitionPoints.filter((_, idx) => idx !== target),
        };
      }
      return {
        ...state,
        ignitionPoints: state.ignitionPoints.filter(
          (p) => p.lat !== target.lat || p.lon !== target.lon
        ),
      };
    }

    case "CLEAR_IGNITION_POINTS": {
      return {
        ...state,
        ignitionPoints: [],
      };
    }

    case "SET_STATUS": {
      return {
        ...state,
        status: action.payload,
      };
    }

    case "SET_RESULT": {
      if (action.payload === null) {
        return {
          ...state,
          result: null,
          ignition: null,
        };
      }
      return {
        ...state,
        result: action.payload.result,
        ignition: action.payload.ignition,
        status: "done",
        t: 0,
      };
    }

    case "SET_T": {
      return {
        ...state,
        t: action.payload,
      };
    }

    case "SET_PLAYING": {
      return {
        ...state,
        playing: action.payload,
      };
    }

    case "SET_SPEED": {
      return {
        ...state,
        speed: action.payload,
      };
    }

    case "SET_ERROR": {
      return {
        ...state,
        error: action.payload,
        status: action.payload !== null ? "error" : state.status,
      };
    }

    case "RESET": {
      const currentRegion = state.regions.find((r) => r.id === state.regionId);
      const params = currentRegion
        ? { ...currentRegion.default_params }
        : initialParams;
      return {
        ...state,
        params,
        ignitionPoints: [],
        result: null,
        ignition: null,
        t: 0,
        playing: false,
        status: "idle",
        error: null,
      };
    }

    default:
      return state;
  }
}
