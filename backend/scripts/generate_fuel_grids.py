#!/usr/bin/env python3
"""
Deterministic fuel grid generator for Karhutla Sandbox.

Generates 3 preset region fuel grids (200x200 float32) per SIMULATION_SPEC §6:
1. Base = base_mean + amp * noise (seeded, smoothed, normalized to [-1, 1])
2. One meandering river (3 cells wide, fuel=0) crossing grid
3. 1-cell border ring fuel=0
4. Clip to [0, 1]

Running this script twice produces identical files.
"""

from pathlib import Path

import numpy as np

# Region definitions per SIMULATION_SPEC §6 table
REGIONS = {
    "tropical_rainforest": {
        "name": "Hutan Hujan Tropis",
        "base_mean": 0.40,
        "amp": 0.10,
        "seed": 101,
        "fuel_moisture_default": 0.7,
        "bbox": [113.900, -2.254, 113.954, -2.200],
    },
    "dry_forest": {
        "name": "Hutan Mengering",
        "base_mean": 0.70,
        "amp": 0.10,
        "seed": 102,
        "fuel_moisture_default": 0.4,
        "bbox": [101.500, 0.500, 101.554, 0.554],
    },
    "grassland": {
        "name": "Padang Rumput",
        "base_mean": 0.90,
        "amp": 0.07,
        "seed": 103,
        "fuel_moisture_default": 0.5,
        "bbox": [120.000, -9.700, 120.054, -9.646],
    },
}

GRID_H = 200
GRID_W = 200
RIVER_WIDTH = 3
BORDER_WIDTH = 1


def generate_base_noise(seed: int, h: int, w: int) -> np.ndarray:
    """
    Generate smoothed noise normalized to [-1, 1].

    Uses fixed-seed random, then applies a simple box blur (convolution)
    to create spatially correlated noise, then normalizes to [-1, 1].
    """
    rng = np.random.default_rng(seed)
    # Raw random noise
    noise = rng.random((h, w), dtype=np.float32) * 2.0 - 1.0  # [-1, 1]

    # Simple box blur using convolution via np.roll (3x3 kernel)
    # This creates spatial correlation without scipy dependency
    blurred = np.zeros_like(noise)
    for dr in range(-1, 2):
        for dc in range(-1, 2):
            blurred += np.roll(noise, (dr, dc), axis=(0, 1))
    blurred /= 9.0

    # Normalize to [-1, 1] based on actual min/max
    min_val = blurred.min()
    max_val = blurred.max()
    if max_val > min_val:
        normalized = 2.0 * (blurred - min_val) / (max_val - min_val) - 1.0
    else:
        normalized = np.zeros_like(blurred)

    return normalized.astype(np.float32)


def generate_river_mask(seed: int, h: int, w: int, width: int = RIVER_WIDTH) -> np.ndarray:
    """
    Generate a meandering river mask (True = river/fuel=0).

    River crosses from left edge to right edge with natural meandering.
    Uses seeded random for deterministic shape.
    """
    rng = np.random.default_rng(seed + 1000)  # Different seed stream from base noise

    # River path: start at left edge (random row), end at right edge (random row)
    # Meander with random walk
    start_row = rng.integers(h // 4, 3 * h // 4)
    end_row = rng.integers(h // 4, 3 * h // 4)

    # Generate path points using random walk
    path_rows = []
    current_row = start_row

    # Number of segments (columns per step)
    num_segments = w // 5  # step every ~5 columns

    for i in range(num_segments + 1):
        path_rows.append(round(current_row))
        if i < num_segments - 1:
            # Random step: -2 to +2 rows
            step = rng.integers(-2, 3)
            current_row = np.clip(current_row + step, width, h - width - 1)

    path_rows.append(end_row)

    # Create smooth path by interpolating
    cols = np.linspace(0, w - 1, len(path_rows))
    interp_rows = np.interp(np.arange(w), cols, path_rows).astype(int)

    # Build river mask with given width
    river_mask = np.zeros((h, w), dtype=bool)
    half_w = width // 2

    for c in range(w):
        r_center = interp_rows[c]
        r_min = max(0, r_center - half_w)
        r_max = min(h, r_center + half_w + 1)
        river_mask[r_min:r_max, c] = True

    return river_mask


def generate_fuel_grid(region_id: str) -> np.ndarray:
    """
    Generate complete fuel grid for a region.

    Returns:
        200x200 float32 array with values in [0, 1], border=0, river=0
    """
    region = REGIONS[region_id]
    base_mean = region["base_mean"]
    amp = region["amp"]
    seed = region["seed"]

    # 1. Base fuel with smoothed noise
    noise = generate_base_noise(seed, GRID_H, GRID_W)
    fuel = base_mean + amp * noise

    # 2. Add river (fuel = 0)
    river_mask = generate_river_mask(seed, GRID_H, GRID_W, RIVER_WIDTH)
    fuel[river_mask] = 0.0

    # 3. Border ring (fuel = 0)
    fuel[0:BORDER_WIDTH, :] = 0.0
    fuel[-BORDER_WIDTH:, :] = 0.0
    fuel[:, 0:BORDER_WIDTH] = 0.0
    fuel[:, -BORDER_WIDTH:] = 0.0

    # 4. Clip to [0, 1]
    fuel = np.clip(fuel, 0.0, 1.0)

    return fuel.astype(np.float32)


def main():
    output_dir = Path(__file__).parent.parent / "app" / "data" / "fuel"
    output_dir.mkdir(parents=True, exist_ok=True)

    print("Generating fuel grids...")
    for region_id in REGIONS:
        fuel = generate_fuel_grid(region_id)
        output_path = output_dir / f"{region_id}.npy"
        np.save(output_path, fuel)
        print(
            f"  Saved {output_path} (shape={fuel.shape}, dtype={fuel.dtype}, "
            f"min={fuel.min():.4f}, max={fuel.max():.4f})"
        )

    print("Done.")


if __name__ == "__main__":
    main()
