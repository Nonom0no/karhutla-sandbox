import { render, fireEvent, screen } from "@testing-library/react";
import { AppProvider } from "../state/context";
import { Slider } from "./Slider";
import { describe, it, expect, vi } from "vitest";

describe("Slider component", () => {
  it("renders with label and correct attributes", () => {
    const handleChange = vi.fn();
    render(
      <AppProvider>
        <Slider
          label="Kecepatan Angin (0–20 m/s)"
          min={0}
          max={20}
          step={0.1}
          value={5}
          onChange={handleChange}
        />
      </AppProvider>
    );
    const slider = screen.getByRole("slider", { name: /kecepatan angin/i });
    expect(slider).toBeDefined();
    expect(slider.getAttribute("aria-valuemin")).toBe("0");
    expect(slider.getAttribute("aria-valuemax")).toBe("20");
    expect(slider.getAttribute("aria-valuenow")).toBe("5");
    fireEvent.change(slider, { target: { value: "10" } });
    expect(handleChange).toHaveBeenCalledWith(10);
  });
});