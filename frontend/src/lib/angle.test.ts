// src/lib/angle.test.ts - Tests for angle utilities

import { describe, it, expect } from "vitest";
import {
  normalizeDeg,
  pointerToDeg,
  degToCompassLabel,
} from "./angle";

describe("normalizeDeg", () => {
  it("keeps positive degrees unchanged", () => {
    expect(normalizeDeg(0)).toBe(0);
    expect(normalizeDeg(90)).toBe(90);
    expect(normalizeDeg(359)).toBe(359);
  });

  it("wraps 360 to 0", () => {
    expect(normalizeDeg(360)).toBe(0);
    expect(normalizeDeg(720)).toBe(0);
    expect(normalizeDeg(450)).toBe(90);
  });

  it("handles negative degrees", () => {
    expect(normalizeDeg(-1)).toBe(359);
    expect(normalizeDeg(-90)).toBe(270);
    expect(normalizeDeg(-360)).toBe(0);
    expect(normalizeDeg(-450)).toBe(270);
  });
});

describe("pointerToDeg", () => {
  const centerX = 100;
  const centerY = 100;
  const radius = 50;

  it("returns 0° for pointer directly above center (north)", () => {
    // dx = 0, dy = -radius
    const deg = pointerToDeg(centerX, centerY - radius, centerX, centerY);
    expect(deg).toBeCloseTo(0, 5);
  });

  it("returns 90° for pointer directly right of center (east)", () => {
    // dx = radius, dy = 0
    const deg = pointerToDeg(centerX + radius, centerY, centerX, centerY);
    expect(deg).toBeCloseTo(90, 5);
  });

  it("returns 180° for pointer directly below center (south)", () => {
    // dx = 0, dy = radius
    const deg = pointerToDeg(centerX, centerY + radius, centerX, centerY);
    expect(deg).toBeCloseTo(180, 5);
  });

  it("returns 270° for pointer directly left of center (west)", () => {
    // dx = -radius, dy = 0
    const deg = pointerToDeg(centerX - radius, centerY, centerX, centerY);
    expect(deg).toBeCloseTo(270, 5);
  });

  it("handles arbitrary angles", () => {
    // 45° (NE): dx = radius/√2, dy = -radius/√2
    const offset = radius / Math.sqrt(2);
    const deg = pointerToDeg(
      centerX + offset,
      centerY - offset,
      centerX,
      centerY
    );
    expect(deg).toBeCloseTo(45, 1);
  });
});

describe("degToCompassLabel", () => {
  it("returns correct labels for cardinal directions", () => {
    expect(degToCompassLabel(0)).toBe("N");
    expect(degToCompassLabel(90)).toBe("E");
    expect(degToCompassLabel(180)).toBe("S");
    expect(degToCompassLabel(270)).toBe("W");
  });

  it("returns correct labels for ordinal directions", () => {
    expect(degToCompassLabel(45)).toBe("NE");
    expect(degToCompassLabel(135)).toBe("SE");
    expect(degToCompassLabel(225)).toBe("SW");
    expect(degToCompassLabel(315)).toBe("NW");
  });

  it("handles boundary wrapping", () => {
    expect(degToCompassLabel(360)).toBe("N");
    expect(degToCompassLabel(-45)).toBe("NW");
  });

  it("rounds to nearest sector", () => {
    // 22.5° boundary between N and NE -> rounds to NE
    expect(degToCompassLabel(23)).toBe("NE");
    // 22° stays N
    expect(degToCompassLabel(22)).toBe("N");
    // 67° rounds to NE
    expect(degToCompassLabel(67)).toBe("NE");
    // 68° rounds to E
    expect(degToCompassLabel(68)).toBe("E");
  });
});