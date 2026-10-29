// src/lib/world.test.ts – Tests for world coordinate conversions

import { describe, it, expect } from "vitest";
import {
  gridToWorld,
  worldToCell,
  cellToLatLon,
  latLonToCell,
  windVectorWorld,
  GRID_WIDTH,
  GRID_HEIGHT,
} from "./world";
import type { BBox } from "./geo";

const TEST_BBOX: BBox = [101.500, 0.500, 101.554, 0.554]; // dry_forest

describe("gridToWorld", () => {
  it("center cell (100,100) maps to (0.5, 0.5)", () => {
    const [x, z] = gridToWorld(100, 100);
    expect(x).toBe(0.5);
    expect(z).toBe(0.5);
  });

  it("northwest corner (0,0) maps to (-99.5, -99.5)", () => {
    const [x, z] = gridToWorld(0, 0);
    expect(x).toBe(-GRID_WIDTH / 2 + 0.5);
    expect(z).toBe(-GRID_HEIGHT / 2 + 0.5);
  });

  it("southeast corner (199,199) maps to (99.5, 99.5)", () => {
    const [x, z] = gridToWorld(199, 199);
    expect(x).toBe(GRID_WIDTH / 2 - 0.5);
    expect(z).toBe(GRID_HEIGHT / 2 - 0.5);
  });
});

describe("worldToCell", () => {
  it("inverse of gridToWorld for center", () => {
    const [x, z] = gridToWorld(100, 100);
    const result = worldToCell(x, z);
    expect(result).toEqual([100, 100]);
  });

  it("inverse of gridToWorld for corners", () => {
    const [x, z] = gridToWorld(0, 0);
    const result = worldToCell(x, z);
    expect(result).toEqual([0, 0]);
  });

  it("returns null for outside grid", () => {
    expect(worldToCell(-1000, -1000)).toBeNull();
    expect(worldToCell(1000, 1000)).toBeNull();
  });
});

describe("cellToLatLon / latLonToCell roundtrip", () => {
  it("center cell roundtrip", () => {
    const { lat, lon } = cellToLatLon(100, 100, TEST_BBOX);
    const result = latLonToCell(lat, lon, TEST_BBOX);
    expect(result).toEqual([100, 100]);
  });

  it("northwest corner roundtrip", () => {
    const { lat, lon } = cellToLatLon(0, 0, TEST_BBOX);
    const result = latLonToCell(lat, lon, TEST_BBOX);
    expect(result).toEqual([0, 0]);
  });

  it("southeast corner roundtrip", () => {
    const { lat, lon } = cellToLatLon(199, 199, TEST_BBOX);
    const result = latLonToCell(lat, lon, TEST_BBOX);
    expect(result).toEqual([199, 199]);
  });
});

describe("windVectorWorld", () => {
  it("270° (from west) -> toward east (+x)", () => {
    const [x, z] = windVectorWorld(270);
    expect(x).toBeCloseTo(1, 5);
    expect(z).toBeCloseTo(0, 5);
  });

  it("0° (from north) -> toward south (+z in world)", () => {
    const [x, z] = windVectorWorld(0);
    expect(x).toBeCloseTo(0, 5);
    expect(z).toBeCloseTo(1, 5); // world z is south-positive
  });

  it("90° (from east) -> toward west (-x)", () => {
    const [x, z] = windVectorWorld(90);
    expect(x).toBeCloseTo(-1, 5);
    expect(z).toBeCloseTo(0, 5);
  });

  it("180° (from south) -> toward north (-z in world)", () => {
    const [x, z] = windVectorWorld(180);
    expect(x).toBeCloseTo(0, 5);
    expect(z).toBeCloseTo(-1, 5); // north is -z
  });
});