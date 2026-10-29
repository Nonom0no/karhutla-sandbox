"""
Region registry for Karhutla Sandbox.

Provides region metadata matching API_SPEC Section 3 format:
- id, name, description, grid (height, width, cell_size_m, bbox), default_params
"""

from pathlib import Path
from typing import Any

import numpy as np

# Region data per SIMULATION_SPEC Section 6 and API_SPEC Section 3
_REGION_DATA = {
    "tropical_rainforest": {
        "id": "tropical_rainforest",
        "name": "Hutan Hujan Tropis",
        "description": "Vegetasi hutan hujan dengan fuel sedang dan kelembapan sedang.",
        "grid": {
            "height": 200,
            "width": 200,
            "cell_size_m": 30,
            "bbox": [113.900, -2.254, 113.954, -2.200],
        },
        "default_params": {
            "fire_intensity": 60,
            "wind_speed": 5.0,
            "wind_from_deg": 270.0,
            "fuel_moisture": 0.50,
            "steps": 200,
        },
    },
    "dry_forest": {
        "id": "dry_forest",
        "name": "Hutan Mengering",
        "description": "Vegetasi hutan dengan fuel sedang-tinggi dan kelembapan rendah.",
        "grid": {
            "height": 200,
            "width": 200,
            "cell_size_m": 30,
            "bbox": [101.500, 0.500, 101.554, 0.554],
        },
        "default_params": {
            "fire_intensity": 60,
            "wind_speed": 5.0,
            "wind_from_deg": 270.0,
            "fuel_moisture": 0.4,
            "steps": 200,
        },
    },
    "grassland": {
        "id": "grassland",
        "name": "Padang Rumput",
        "description": "Padang rumput dengan fuel tinggi, cepat menyala saat kering.",
        "grid": {
            "height": 200,
            "width": 200,
            "cell_size_m": 30,
            "bbox": [120.000, -9.700, 120.054, -9.646],
        },
        "default_params": {
            "fire_intensity": 60,
            "wind_speed": 5.0,
            "wind_from_deg": 270.0,
            "fuel_moisture": 0.5,
            "steps": 200,
        },
    },
}

# Valid region IDs in order
REGION_IDS = ["tropical_rainforest", "dry_forest", "grassland"]

# Cache for loaded fuel grids
_FUEL_CACHE: dict[str, np.ndarray] = {}


def get_region(region_id: str) -> dict[str, Any]:
    """
    Get region metadata by ID.

    Returns dict with: id, name, description, grid, default_params.
    Raises KeyError if region_id not found.
    """
    if region_id not in _REGION_DATA:
        raise KeyError(f"Unknown region_id: {region_id}")
    return _REGION_DATA[region_id]


def list_regions() -> list[dict[str, Any]]:
    """Return list of all region metadata dicts (for GET /regions)."""
    return [_REGION_DATA[rid] for rid in REGION_IDS]


def load_fuel_grid(region_id: str) -> np.ndarray:
    """
    Load fuel grid for a region (200x200 float32).

    Loads from .npy file on first call, caches subsequent calls.
    Raises KeyError if region_id not found, FileNotFoundError if .npy missing.
    """
    if region_id not in _REGION_DATA:
        raise KeyError(f"Unknown region_id: {region_id}")

    if region_id in _FUEL_CACHE:
        return _FUEL_CACHE[region_id]

    fuel_path = Path(__file__).parent.parent / "data" / "fuel" / f"{region_id}.npy"
    if not fuel_path.exists():
        raise FileNotFoundError(f"Fuel grid not found: {fuel_path}")

    fuel = np.load(fuel_path)
    # Ensure correct dtype and shape
    if fuel.shape != (200, 200):
        raise ValueError(f"Fuel grid {region_id} has wrong shape: {fuel.shape}")
    if fuel.dtype != np.float32:
        fuel = fuel.astype(np.float32)

    _FUEL_CACHE[region_id] = fuel
    return fuel


def clear_fuel_cache() -> None:
    """Clear the fuel grid cache (mainly for testing)."""
    _FUEL_CACHE.clear()


__all__ = [
    "REGION_IDS",
    "clear_fuel_cache",
    "get_region",
    "list_regions",
    "load_fuel_grid",
]
