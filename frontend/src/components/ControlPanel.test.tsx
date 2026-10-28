// src/components/ControlPanel.test.tsx - Component tests for ControlPanel

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "../api/client";
import type { RegionInfo } from "../api/types";
import { AppProvider, useAppState } from "../state/context";
import { ControlPanel } from "./ControlPanel";

vi.mock("../api/client", () => ({
  getRegions: vi.fn(),
}));

const mockRegions: RegionInfo[] = [
  {
    id: "dry_forest",
    name: "Hutan Kering",
    description: "Hutan sekunder kering",
    grid: { height: 100, width: 100, cell_size_m: 30, bbox: [100.0, 0.0, 100.1, 0.1] },
    default_params: {
      fire_intensity: 1.0,
      wind_speed: 5.0,
      wind_from_deg: 0,
      fuel_moisture: 0.1,
      steps: 100,
    },
  },
  {
    id: "grassland",
    name: "Padang Rumput",
    description: "Area savana",
    grid: { height: 100, width: 100, cell_size_m: 30, bbox: [101.0, 1.0, 101.1, 1.1] },
    default_params: {
      fire_intensity: 2.0,
      wind_speed: 12.0,
      wind_from_deg: 180,
      fuel_moisture: 0.05,
      steps: 200,
    },
  },
];

// Helper component to inspect state in tests
const StateInspector: React.FC = () => {
  const state = useAppState();
  return (
    <div data-testid="state-inspector">
      <span data-testid="region-id">{state.regionId}</span>
      <span data-testid="wind-speed">{state.params.wind_speed}</span>
    </div>
  );
};

describe("ControlPanel component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(client.getRegions).mockResolvedValue({ regions: mockRegions });
  });

  it("fetches regions on mount and populates dropdown", async () => {
    render(
      <AppProvider>
        <ControlPanel />
        <StateInspector />
      </AppProvider>
    );

    await waitFor(() => {
      expect(client.getRegions).toHaveBeenCalledTimes(1);
    });

    const select = await screen.findByRole("combobox", { name: /wilayah/i });
    expect(select).toBeDefined();

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0].textContent).toBe("Hutan Kering");
    expect(options[1].textContent).toBe("Padang Rumput");

    expect(screen.getByTestId("region-id").textContent).toBe("dry_forest");
  });

  it("disables Jalankan button when ignitionPoints is empty", async () => {
    render(
      <AppProvider>
        <ControlPanel />
      </AppProvider>
    );

    const button = await screen.findByRole("button", { name: /jalankan simulasi/i });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("changes region and updates default params when user changes dropdown", async () => {
    render(
      <AppProvider>
        <ControlPanel />
        <StateInspector />
      </AppProvider>
    );

    await screen.findByRole("combobox", { name: /wilayah/i });

    const select = screen.getByRole("combobox", { name: /wilayah/i });
    fireEvent.change(select, { target: { value: "grassland" } });

    expect(screen.getByTestId("region-id").textContent).toBe("grassland");
    expect(screen.getByTestId("wind-speed").textContent).toBe("12");
  });

  it("calls onSimulate when Jalankan button is clicked with points", async () => {
    const handleSimulate = vi.fn();

    // Create state override with ignitionPoints
    const stateWithPoints = {
      regions: mockRegions,
      regionId: "dry_forest",
      params: mockRegions[0].default_params,
      ignitionPoints: [{ lat: 0.05, lon: 100.05 }],
      status: "idle" as const,
      result: null,
      ignition: null,
      t: 0,
      playing: false,
      speed: 1 as const,
      error: null,
    };

    render(
      <AppProvider initialStateOverride={stateWithPoints}>
        <ControlPanel onSimulate={handleSimulate} />
      </AppProvider>
    );

    const button = screen.getByRole("button", { name: /jalankan simulasi/i });
    expect((button as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(button);
    expect(handleSimulate).toHaveBeenCalledTimes(1);
  });
});
