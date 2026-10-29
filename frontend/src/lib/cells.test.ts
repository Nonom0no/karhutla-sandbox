// src/lib/cells.test.ts – Tests for cell visual state and bucketing

import { describe, it, expect } from "vitest";
import {
  cellVisualState,
  bucketByIgnition,
  diffCells,
  hashJitter,
  hashJitter3,
  hashRotation,
  hashScale,
} from "./cells";

describe("cellVisualState", () => {
  it("v = -1 → unburned", () => {
    expect(cellVisualState(-1, 0)).toBe("unburned");
    expect(cellVisualState(-1, 10)).toBe("unburned");
  });

  it("v > t → unburned", () => {
    expect(cellVisualState(5, 3)).toBe("unburned");
  });

  it("v = t → burning (t-v=0 < 3)", () => {
    expect(cellVisualState(0, 0)).toBe("burning");
    expect(cellVisualState(5, 5)).toBe("burning");
  });

  it("v = t-1 → burning (t-v=1 < 3)", () => {
    expect(cellVisualState(4, 5)).toBe("burning");
  });

  it("v = t-2 → burning (t-v=2 < 3)", () => {
    expect(cellVisualState(3, 5)).toBe("burning");
  });

  it("v = t-3 → burned (t-v=3 not < 3)", () => {
    expect(cellVisualState(2, 5)).toBe("burned");
  });

  it("v < t-3 → burned", () => {
    expect(cellVisualState(0, 5)).toBe("burned");
  });
});

describe("bucketByIgnition", () => {
  it("empty buckets for all -1", () => {
    const ignition = new Int16Array(40000).fill(-1);
    const buckets = bucketByIgnition(ignition);
    expect(buckets).toEqual([]);
  });

  it("single bucket for v=0", () => {
    const ignition = new Int16Array(40000).fill(-1);
    ignition[0] = 0;
    ignition[100] = 0;
    const buckets = bucketByIgnition(ignition);
    expect(buckets.length).toBe(1);
    expect(buckets[0]).toEqual([0, 100]);
  });

  it("multiple buckets for different v", () => {
    const ignition = new Int16Array(40000).fill(-1);
    ignition[0] = 0;
    ignition[1] = 1;
    ignition[2] = 1;
    ignition[3] = 3;
    const buckets = bucketByIgnition(ignition);
    expect(buckets.length).toBe(4); // max v = 3, so 0..3
    expect(buckets[0]).toEqual([0]);
    expect(buckets[1]).toEqual([1, 2]);
    expect(buckets[2]).toEqual([]);
    expect(buckets[3]).toEqual([3]);
  });
});

describe("diffCells", () => {
  const mockBuckets = [
    [10, 20], // v=0
    [30],     // v=1
    [40],     // v=2
    [50],     // v=3
    [60],     // v=4
  ];

  it("tPrev=0, tNext=1 → toBurning=v=1, toBurned=none (0-3<0)", () => {
    const result = diffCells(mockBuckets, 0, 1);
    expect(result.toBurning).toEqual([30]);
    expect(result.toBurned).toEqual([]);
  });

  it("tPrev=3, tNext=4 → toBurning=v=4, toBurned=v=1 (4-3=1)", () => {
    const result = diffCells(mockBuckets, 3, 4);
    expect(result.toBurning).toEqual([60]);
    expect(result.toBurned).toEqual([30]);
  });

  it("tNext = tPrev + 2 (non-incremental) → empty", () => {
    const result = diffCells(mockBuckets, 0, 2);
    expect(result.toBurning).toEqual([]);
    expect(result.toBurned).toEqual([]);
  });

  it("backwards jump → empty", () => {
    const result = diffCells(mockBuckets, 5, 3);
    expect(result.toBurning).toEqual([]);
    expect(result.toBurned).toEqual([]);
  });
});

describe("hashJitter determinism", () => {
  it("same input gives same output", () => {
    for (let i = 0; i < 100; i++) {
      expect(hashJitter(i)).toBe(hashJitter(i));
    }
  });

  it("output in [0, 1)", () => {
    for (let i = 0; i < 1000; i++) {
      const v = hashJitter(i);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("hashJitter3", () => {
  it("returns 3 values in [-0.5, 0.5)", () => {
    for (let i = 0; i < 100; i++) {
      const [x, y, z] = hashJitter3(i);
      expect(x).toBeGreaterThanOrEqual(-0.5);
      expect(x).toBeLessThan(0.5);
      expect(y).toBeGreaterThanOrEqual(-0.5);
      expect(y).toBeLessThan(0.5);
      expect(z).toBeGreaterThanOrEqual(-0.5);
      expect(z).toBeLessThan(0.5);
    }
  });

  it("deterministic", () => {
    expect(hashJitter3(42)).toEqual(hashJitter3(42));
  });
});

describe("hashRotation", () => {
  it("returns value in [0, 2π)", () => {
    for (let i = 0; i < 100; i++) {
      const r = hashRotation(i);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(Math.PI * 2);
    }
  });
});

describe("hashScale", () => {
  it("returns value in [0.8, 1.2)", () => {
    for (let i = 0; i < 100; i++) {
      const s = hashScale(i);
      expect(s).toBeGreaterThanOrEqual(0.8);
      expect(s).toBeLessThan(1.2);
    }
  });
});