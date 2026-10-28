"""Benchmark script for POST /simulate default parameters.
Runs multiple simulations, measures latency percentiles, and checks response size.
"""

import time
from statistics import median

import numpy as np
from fastapi.testclient import TestClient

from app.main import app
from app.sim.ca import run_simulation
from app.sim.encoding import encode_ignition_time
from app.sim.params import dryness_multiplier, intensity_to_p_base
from app.sim.regions import get_region, load_fuel_grid

# Configuration
RUNS = 50  # number of benchmark iterations
REGION_ID = "dry_forest"

client = TestClient(app)


def get_default_payload():
    region = get_region(REGION_ID)
    default = region["default_params"]
    # Use a single ignition point that lands on fuel > 0
    fuel_grid = load_fuel_grid(REGION_ID)
    # find first non-zero fuel cell
    rows, cols = np.where(fuel_grid > 0)
    if len(rows) == 0:
        raise RuntimeError("No fuel cells in region")
    row, col = int(rows[0]), int(cols[0])
    # Convert grid cell to lat/lon using region bbox
    west, south, east, north = region["grid"]["bbox"]
    width = region["grid"]["width"]
    height = region["grid"]["height"]
    lon = west + (col + 0.5) * (east - west) / width
    lat = north - (row + 0.5) * (north - south) / height
    payload = {
        "region_id": REGION_ID,
        "ignition_points": [{"lat": lat, "lon": lon}],
        "fire_intensity": default["fire_intensity"],
        "wind_speed": default["wind_speed"],
        "wind_from_deg": default["wind_from_deg"],
        "fuel_moisture": default["fuel_moisture"],
        "steps": default["steps"],
        # seed omitted for random seed per run
    }
    return payload


def benchmark_via_api():
    payload = get_default_payload()
    latencies: list[float] = []
    sizes: list[int] = []
    for _ in range(RUNS):
        start = time.perf_counter()
        resp = client.post("/api/simulate", json=payload)
        end = time.perf_counter()
        lat = (end - start) * 1000  # ms
        latencies.append(lat)
        resp_json = resp.json()
        b64 = resp_json["ignition_time"]["data"]
        sizes.append(len(b64.encode()))
    return latencies, sizes


def benchmark_direct():
    region = get_region(REGION_ID)
    default = region["default_params"]
    fuel_grid = load_fuel_grid(REGION_ID)
    # find first non-zero cell for ignition point
    rows, cols = np.where(fuel_grid > 0)
    row, col = int(rows[0]), int(cols[0])
    p_base = intensity_to_p_base(default["fire_intensity"])
    dry_mult = dryness_multiplier(default["fuel_moisture"])
    fuel_eff = fuel_grid * dry_mult
    latencies: list[float] = []
    sizes: list[int] = []
    for _ in range(RUNS):
        rng = np.random.default_rng()  # random seed per run
        start = time.perf_counter()
        ignition_time, _ = run_simulation(
            fuel=fuel_eff,
            ignition_points=[(row, col)],
            wind_speed=default["wind_speed"],
            wind_from_deg=default["wind_from_deg"],
            p_base=p_base,
            k=0.1,
            steps=default["steps"],
            rng=rng,
        )
        end = time.perf_counter()
        lat = (end - start) * 1000
        latencies.append(lat)
        b64 = encode_ignition_time(ignition_time)
        sizes.append(len(b64.encode()))
    return latencies, sizes


if __name__ == "__main__":
    # Choose direct benchmark (no FastAPI overhead) as primary metric
    latencies, sizes = benchmark_direct()
    p50 = median(latencies)
    p95 = sorted(latencies)[int(0.95 * len(latencies)) - 1]
    max_size_kb = max(sizes) / 1024
    print(f"p50 latency: {p50:.2f} ms")
    print(f"p95 latency: {p95:.2f} ms")
    print(f"max response size: {max_size_kb:.2f} KB")
    if p95 > 2000:
        print("WARNING: p95 exceeds 2 seconds. Consider optimization.")
    if max_size_kb > 200:
        print("WARNING: response size exceeds 200 KB.")
