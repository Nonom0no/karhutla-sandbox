#!/usr/bin/env python3
"""
Tuning script for P3-04: Test with each region's own default fuel_moisture.
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
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

def generate_fuel(base_mean: float, amp: float, seed: int) -> np.ndarray:
    """Generate fuel grid per SIMULATION_SPEC §6 (simplified - no river)."""
    rng = np.random.default_rng(seed)
    H, W = 200, 200
    
    # 1. Base = base_mean + amp * noise, normalized to [-1, 1]
    noise = rng.standard_normal((H, W)).astype(np.float32)
    # Simple 3x3 smoothing using numpy (no scipy)
    from numpy.lib.stride_tricks import sliding_window_view
    # Pad with wrap mode
    noise_padded = np.pad(noise, 1, mode='wrap')
    # 3x3 mean filter
    noise_smooth = np.zeros_like(noise)
    for i in range(3):
        for j in range(3):
            noise_smooth += noise_padded[i:i+H, j:j+W]
    noise_smooth /= 9
    # Normalize to [-1, 1]
    noise_smooth = 2 * (noise_smooth - noise_smooth.min()) / (noise_smooth.max() - noise_smooth.min()) - 1
    base = base_mean + amp * noise_smooth
    
    # 2. River (skip for now)
    # 3. Border ring
    base[0, :] = 0
    base[-1, :] = 0
    base[:, 0] = 0
    base[:, -1] = 0
    
    # 4. Clip
    base = np.clip(base, 0.0, 1.0)
    return base.astype(np.float32)

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

def test_fuel_params(base_mean: float, amp: float, fuel_moisture: float, seed: int, num_seeds: int = 10):
    fuel = generate_fuel(base_mean, amp, seed)
    print(f"  Fuel: max={fuel.max():.3f}, mean={fuel.mean():.3f}")
    
    fractions = []
    for i in range(num_seeds):
        frac, _ = run_single_simulation(fuel, fuel_moisture, seed=1000 + i)
        fractions.append(frac)
    
    avg_frac = np.mean(fractions)
    std_frac = np.std(fractions)
    return avg_frac, std_frac, fractions

def main():
    # Current parameters
    regions = {
        "tropical_rainforest": {"base_mean": 0.40, "amp": 0.10, "seed": 101, "moisture": 0.7},
        "dry_forest": {"base_mean": 0.70, "amp": 0.10, "seed": 102, "moisture": 0.4},
        "grassland": {"base_mean": 0.90, "amp": 0.07, "seed": 103, "moisture": 0.5},
    }
    
    print("=== Current params (each at own default moisture) ===")
    for name, params in regions.items():
        avg, std, _ = test_fuel_params(
            params["base_mean"], params["amp"], params["moisture"], params["seed"], num_seeds=10
        )
        print(f"{name}: avg={avg:.4f} (±{std:.4f})")
    
    # Test new tropical_rainforest params
    print("\n=== Test new tropical_rainforest params ===")
    for base_mean in [0.65, 0.70, 0.75]:
        for amp in [0.10, 0.15]:
            print(f"\ntropical_rainforest: base_mean={base_mean:.2f}, amp={amp:.2f}, moisture=0.7:")
            avg, std, _ = test_fuel_params(base_mean, amp, 0.7, 101, num_seeds=10)
            print(f"  Result: avg={avg:.4f} (±{std:.4f})")

if __name__ == "__main__":
    main()