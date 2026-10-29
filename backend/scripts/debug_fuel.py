#!/usr/bin/env python3
"""
Tuning script for P3-04: Debug tropical_rainforest fuel.
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
from app.sim.regions import load_fuel_grid

def main():
    fuel = load_fuel_grid("tropical_rainforest")
    
    print(f"Fuel shape: {fuel.shape}")
    print(f"Fuel min: {fuel.min():.4f}, max: {fuel.max():.4f}, mean: {fuel.mean():.4f}")
    print(f"Fuel > 0: {np.sum(fuel > 0)} / {fuel.size} = {np.sum(fuel > 0) / fuel.size:.4f}")
    print(f"Fuel > 0.1: {np.sum(fuel > 0.1)} / {fuel.size} = {np.sum(fuel > 0.1) / fuel.size:.4f}")
    print(f"Fuel > 0.2: {np.sum(fuel > 0.2)} / {fuel.size} = {np.sum(fuel > 0.2) / fuel.size:.4f}")
    print(f"Fuel > 0.3: {np.sum(fuel > 0.3)} / {fuel.size} = {np.sum(fuel > 0.3) / fuel.size:.4f}")
    print(f"Fuel > 0.4: {np.sum(fuel > 0.4)} / {fuel.size} = {np.sum(fuel > 0.4) / fuel.size:.4f}")
    
    # Check center area
    H, W = fuel.shape
    center_r, center_c = H // 2, W // 2
    print(f"\nCenter area (11x11 around {center_r}, {center_c}):")
    for dr in range(-5, 6):
        row = []
        for dc in range(-5, 6):
            r, c = center_r + dr, center_c + dc
            if 0 <= r < H and 0 <= c < W:
                row.append(f"{fuel[r, c]:.2f}")
            else:
                row.append("  - ")
        print(" ".join(row))

if __name__ == "__main__":
    main()