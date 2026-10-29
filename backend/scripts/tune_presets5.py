#!/usr/bin/env python3
"""
Tuning script for P3-04: Test all regions at SAME fuel_moisture (demo default).
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
from app.sim.regions import load_fuel_grid
from app.sim.ca import run_simulation

DEFAULT_PARAMS = {
    "fire_intensity": 60,
    "wind_speed": 5.0,
    "wind_from_deg": 270.0,
    "steps": 200,
}

def intensity_to_p_base(fire_intensity: int) -> float:
    return 0.05 + (fire_intensity - 1) / 99 * 0.55

def dryness_multiplier(fuel_moisture: float) -> float:
    return 1.3 - 0.9 * fuel_moisture

def run_single_simulation(fuel: np.ndarray, fuel_moisture: float, seed: int = 42):
    dry_mult = dryness_multiplier(fuel_moisture)
    fuel_eff = fuel * dry_mult
    fuel_eff = np.clip(fuel_eff, 0.0, 1.0)
    
    p_base = intensity_to_p_base(DEFAULT_PARAMS["fire_intensity"])
    
    H, W = fuel.shape
    center_r, center_c = H // 2, W // 2
    
    ignition_points = []
    for dr in range(-5, 6):
        for dc in range(-5, 6):
            r, c = center_r + dr, center_c + dc
            if 0 <= r < H and 0 <= c < W and fuel_eff[r, c] > 0:
                ignition_points = [(r, c)]
                break
        if ignition_points:
            break
    
    if not ignition_points:
        return 0.0, 0
    
    rng = np.random.default_rng(seed)
    ignition_time, steps_run = run_simulation(
        fuel=fuel_eff,
        ignition_points=ignition_points,
        wind_speed=DEFAULT_PARAMS["wind_speed"],
        wind_from_deg=DEFAULT_PARAMS["wind_from_deg"],
        p_base=p_base,
        k=0.1,
        steps=DEFAULT_PARAMS["steps"],
        rng=rng,
    )
    
    burned_cells = np.sum(ignition_time >= 0)
    burned_fraction = burned_cells / (H * W)
    
    return burned_fraction, steps_run

def test_region(region_id: str, fuel_moisture: float, num_seeds: int = 10):
    fuel = load_fuel_grid(region_id)
    fractions = []
    for i in range(num_seeds):
        frac, _ = run_single_simulation(fuel, fuel_moisture, seed=1000 + i)
        fractions.append(frac)
    avg_frac = np.mean(fractions)
    std_frac = np.std(fractions)
    return avg_frac, std_frac, fractions

def main():
    # Test at different common fuel_moisture values
    print("=== Test at SAME fuel_moisture for all regions ===")
    for moisture in [0.4, 0.5, 0.55, 0.6]:
        print(f"\n--- fuel_moisture = {moisture} ---")
        results = {}
        for region_id in ["tropical_rainforest", "dry_forest", "grassland"]:
            avg, std, _ = test_region(region_id, moisture, num_seeds=10)
            results[region_id] = avg
            print(f"  {region_id}: avg={avg:.4f} (±{std:.4f})")
        
        # Check order
        order_ok = results['tropical_rainforest'] < results['dry_forest'] < results['grassland']
        all_in_range = all(0.10 <= v <= 0.80 for v in results.values())
        print(f"  Order OK: {order_ok}, All in 0.10-0.80: {all_in_range}")

if __name__ == "__main__":
    main()