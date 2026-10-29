#!/usr/bin/env python3
"""
Tuning script for P3-04: Debug all fuel grids.
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
from app.sim.regions import load_fuel_grid

def check_fuel(region_id):
    fuel = load_fuel_grid(region_id)
    
    print(f"\n=== {region_id} ===")
    print(f"Fuel shape: {fuel.shape}")
    print(f"Fuel min: {fuel.min():.4f}, max: {fuel.max():.4f}, mean: {fuel.mean():.4f}")
    print(f"Fuel > 0: {np.sum(fuel > 0)} / {fuel.size} = {np.sum(fuel > 0) / fuel.size:.4f}")
    print(f"Fuel > 0.3: {np.sum(fuel > 0.3)} / {fuel.size} = {np.sum(fuel > 0.3) / fuel.size:.4f}")
    print(f"Fuel > 0.5: {np.sum(fuel > 0.5)} / {fuel.size} = {np.sum(fuel > 0.5) / fuel.size:.4f}")
    print(f"Fuel > 0.7: {np.sum(fuel > 0.7)} / {fuel.size} = {np.sum(fuel > 0.7) / fuel.size:.4f}")

def main():
    for region in ["tropical_rainforest", "dry_forest", "grassland"]:
        check_fuel(region)

if __name__ == "__main__":
    main()