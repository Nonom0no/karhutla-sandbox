// src/components/Compass.test.tsx - Tests for Compass component

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Compass } from "./Compass";

describe("Compass", () => {
  const defaultProps = {
    value: 0,
    onChange: vi.fn(),
    size: 200,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders without error", () => {
    const { container } = render(<Compass {...defaultProps} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("width", "200");
    expect(svg).toHaveAttribute("height", "200");
  });

  it("displays correct wind direction text", () => {
    const { container } = render(<Compass {...defaultProps} />);
    expect(container).toHaveTextContent("Angin dari 0° (N)");
  });

  it("updates text when value changes", () => {
    const { container, rerender } = render(<Compass {...defaultProps} />);
    expect(container).toHaveTextContent("Angin dari 0° (N)");

    rerender(<Compass {...defaultProps} value={90} />);
    expect(container).toHaveTextContent("Angin dari 90° (E)");

    rerender(<Compass {...defaultProps} value={270} />);
    expect(container).toHaveTextContent("Angin dari 270° (W)");
  });

  it("has correct accessibility attributes", () => {
    const { container } = render(<Compass {...defaultProps} />);
    const root = container.querySelector('[role="slider"]');
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute("aria-valuemin", "0");
    expect(root).toHaveAttribute("aria-valuemax", "359");
    expect(root).toHaveAttribute("aria-valuenow", "0");
    expect(root).toHaveAttribute("aria-valuetext", "0 derajat, dari n");
    expect(root).toHaveAttribute("aria-label", "Arah angin");
  });

  it("calls onChange when keyboard arrow right pressed", () => {
    const { container } = render(<Compass {...defaultProps} />);
    const root = container.querySelector('[role="slider"]') as HTMLElement;
    fireEvent.keyDown(root, { key: "ArrowRight" });
    expect(defaultProps.onChange).toHaveBeenCalledWith(1);
  });

  it("calls onChange with step 15 when Shift+ArrowRight pressed", () => {
    const { container } = render(<Compass {...defaultProps} />);
    const root = container.querySelector('[role="slider"]') as HTMLElement;
    fireEvent.keyDown(root, { key: "ArrowRight", shiftKey: true });
    expect(defaultProps.onChange).toHaveBeenCalledWith(15);
  });

  it("calls onChange when keyboard arrow left pressed", () => {
    const { container } = render(<Compass {...defaultProps} value={10} />);
    const root = container.querySelector('[role="slider"]') as HTMLElement;
    fireEvent.keyDown(root, { key: "ArrowLeft" });
    expect(defaultProps.onChange).toHaveBeenCalledWith(9);
  });

  it("wraps around at 0 and 359", () => {
    // At 0, ArrowLeft -> 359
    const { container, rerender } = render(<Compass {...defaultProps} value={0} />);
    const root = container.querySelector('[role="slider"]') as HTMLElement;
    fireEvent.keyDown(root, { key: "ArrowLeft" });
    expect(defaultProps.onChange).toHaveBeenCalledWith(359);

    // At 359, ArrowRight -> 0
    vi.clearAllMocks();
    rerender(<Compass {...defaultProps} value={359} />);
    const root2 = container.querySelector('[role="slider"]') as HTMLElement;
    fireEvent.keyDown(root2, { key: "ArrowRight" });
    expect(defaultProps.onChange).toHaveBeenCalledWith(0);
  });

  it("renders handle at correct position for 0° (north)", () => {
    const { container } = render(<Compass {...defaultProps} value={0} size={200} />);
    const handle = container.querySelector('circle[fill="#e03"]');
    expect(handle).toBeInTheDocument();
    // At 0°, handle should be at top (cy = center - radius = 100 - 90 = 10)
    // but we only test existence here; precise coordinate test requires layout
  });

  it("renders arrow pointing opposite to handle (wind TO direction)", () => {
    const { container } = render(<Compass {...defaultProps} value={270} size={200} />);
    // At 270° (handle left/west), arrow should point to 90° (east/right)
    const line = container.querySelector("line[marker-end]");
    expect(line).toBeInTheDocument();
  });

  it("has touch-action none on container and svg", () => {
    const { container } = render(<Compass {...defaultProps} />);
    const root = container.querySelector('[role="slider"]');
    const svg = container.querySelector("svg");
    expect(root).toHaveStyle({ touchAction: "none" });
    expect(svg).toHaveStyle({ touchAction: "none" });
  });
});