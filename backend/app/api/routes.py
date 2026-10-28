"""API routes for simulation endpoints."""

import base64
import uuid
from datetime import UTC, datetime
from math import floor
from typing import Any

import numpy as np
from fastapi import APIRouter, Depends
from numpy.random import Generator, default_rng

from app.api.errors import (
    IgnitionOnNonFuelError,
    IgnitionOutOfBoundsError,
    InternalError,
    SimulationNotFoundError,
    UnknownRegionError,
)
from app.api.schemas import (
    DerivedParams,
    FuelData,
    GridInfo,
    IgnitionPoint,
    IgnitionTimeData,
    RegionInfo,
    RegionsResponse,
    SimulateRequest,
    SimulateResponse,
    SimulationParams,
    Stats,
)
from app.sim.ca import run_simulation
from app.sim.encoding import encode_ignition_time
from app.sim.params import (
    GRID_HEIGHT,
    GRID_WIDTH,
    K_WIND,
    dryness_multiplier,
    intensity_to_p_base,
)
from app.sim.regions import get_region, list_regions, load_fuel_grid
from app.store import ResultStore, default_store

router = APIRouter(prefix="/api", tags=["simulation"])


# --- Dependency injection ---


def get_store() -> ResultStore:
    """Get the result store (allows override in tests)."""
    return default_store


def get_rng_for_request(request: SimulateRequest) -> Generator:
    """Create RNG with seed from request (or random if None)."""
    return default_rng(request.seed)


# --- Helper functions ---


def latlon_to_cell(
    lat: float, lon: float, bbox: list[float], height: int, width: int
) -> tuple[int, int]:
    """
    Convert lat/lon to grid cell coordinates.

    Per SIMULATION_SPEC §7:
    - col = floor((lon - west) / (east - west) * W)
    - row = floor((north - lat) / (north - south) * H)
    """
    west, south, east, north = bbox
    if east <= west or north <= south:
        raise ValueError("Invalid bbox")

    col = floor((lon - west) / (east - west) * width)
    row = floor((north - lat) / (north - south) * height)
    return row, col


def validate_ignition_points(
    ignition_points: list[IgnitionPoint],
    bbox: list[float],
    fuel_grid: Any,
) -> list[tuple[int, int]]:
    """
    Validate ignition points and convert to cell coordinates.

    Returns list of (row, col) tuples.
    Raises appropriate errors for out of bounds or non-fuel cells.
    """
    height, width = fuel_grid.shape
    cell_coords = []

    for point in ignition_points:
        row, col = latlon_to_cell(point.lat, point.lon, bbox, height, width)

        # Check bounds
        if not (0 <= row < height and 0 <= col < width):
            raise IgnitionOutOfBoundsError(point.lat, point.lon, "")

        # Check fuel
        if fuel_grid[row, col] == 0:
            raise IgnitionOnNonFuelError(point.lat, point.lon, row, col)

        cell_coords.append((row, col))

    return cell_coords


# --- Endpoints ---


@router.get("/regions", response_model=RegionsResponse)
def get_regions() -> RegionsResponse:
    """Get list of available region presets."""
    regions_data = list_regions()
    regions = [RegionInfo.model_validate(r) for r in regions_data]
    return RegionsResponse(regions=regions)


@router.get("/regions/{region_id}/fuel", response_model=FuelData)
def get_region_fuel(region_id: str) -> FuelData:
    """Get raw fuel grid for a region.
    Returns uint8 values = round(fuel * 255), base64‑encoded.
    """
    # Validate region exists
    try:
        _ = get_region(region_id)
    except KeyError as e:
        raise UnknownRegionError(region_id) from e

    # Load fuel grid (float32, 0‑1)
    fuel_grid = load_fuel_grid(region_id)

    # Convert to uint8 (rounded)
    fuel_uint8 = np.rint(fuel_grid * 255).astype(np.uint8)
    # Ensure correct shape
    if fuel_uint8.shape != (200, 200):
        raise InternalError(f"Unexpected fuel grid shape {fuel_uint8.shape}")
    # Encode raw bytes to base64
    b64_data = base64.b64encode(fuel_uint8.tobytes()).decode("ascii")

    return FuelData(
        region_id=region_id,
        height=200,
        width=200,
        data=b64_data,
    )


@router.post("/simulate", response_model=SimulateResponse)
def run_simulation_endpoint(
    request: SimulateRequest,
    store: ResultStore = Depends(get_store),
    rng: Generator = Depends(get_rng_for_request),
) -> SimulateResponse:
    """
    Run a wildfire simulation.

    Validates input, runs CA simulation, stores result, returns response.
    """
    # Validate region_id (do this before Pydantic's extra validation for proper error code)
    valid_region_ids = {"tropical_rainforest", "dry_forest", "grassland"}
    if request.region_id not in valid_region_ids:
        raise UnknownRegionError(request.region_id)

    # Get region metadata
    try:
        region = get_region(request.region_id)
    except KeyError as e:
        raise UnknownRegionError(request.region_id) from e

    # Load fuel grid
    try:
        fuel_grid = load_fuel_grid(request.region_id)
    except FileNotFoundError as e:
        raise InternalError(f"Fuel grid not found for region {request.region_id}") from e
    except ValueError as e:
        raise InternalError(str(e)) from e

    # Validate ignition points
    try:
        cell_coords = validate_ignition_points(
            request.ignition_points, region["grid"]["bbox"], fuel_grid
        )
    except IgnitionOutOfBoundsError as e:
        # Add region_id to details
        e.details = {
            "lat": e.details["lat"],
            "lon": e.details["lon"],
            "region_id": request.region_id,
        }
        raise

    # Resolve fuel_moisture (use region default if not provided)
    fuel_moisture = request.fuel_moisture
    if fuel_moisture is None:
        fuel_moisture = region["default_params"]["fuel_moisture"]

    # Calculate derived parameters
    p_base = intensity_to_p_base(request.fire_intensity)
    dry_mult = dryness_multiplier(fuel_moisture)
    fuel_eff = fuel_grid * dry_mult
    # fuel_grid == 0 stays 0 (multiplying by dry_mult keeps it 0)

    # Run simulation
    try:
        ignition_time, steps_run = run_simulation(
            fuel=fuel_eff,
            ignition_points=cell_coords,
            wind_speed=request.wind_speed,
            wind_from_deg=request.wind_from_deg,
            p_base=p_base,
            k=K_WIND,
            steps=request.steps,
            rng=rng,
        )
    except Exception as e:
        raise InternalError(f"Simulation failed: {e}") from e

    # Calculate stats
    burned_mask = ignition_time >= 0
    burned_cells = int(burned_mask.sum())
    total_cells = GRID_HEIGHT * GRID_WIDTH
    burned_fraction = round(burned_cells / total_cells, 4)
    burned_area_ha = round(burned_cells * 0.09, 2)  # 0.09 ha per cell (30m x 30m)

    # Generate simulation ID and timestamps
    sim_id = uuid.uuid4().hex  # 32-char hex string
    created_at = datetime.now(UTC)
    expires_at = datetime.fromtimestamp(created_at.timestamp() + 1800, tz=UTC)  # 1800s TTL

    # Encode ignition_time
    ignition_time_b64 = encode_ignition_time(ignition_time)

    # Build response
    grid_info = GridInfo(**region["grid"])

    params = SimulationParams(
        ignition_points=request.ignition_points,
        fire_intensity=request.fire_intensity,
        wind_speed=request.wind_speed,
        wind_from_deg=request.wind_from_deg,
        fuel_moisture=fuel_moisture,
    )

    derived = DerivedParams(
        p_base=round(p_base, 4),
        dryness_multiplier=round(dry_mult, 4),
        k=K_WIND,
    )

    ignition_time_data = IgnitionTimeData(data=ignition_time_b64)

    stats = Stats(
        burned_cells=burned_cells,
        burned_fraction=burned_fraction,
        burned_area_ha=burned_area_ha,
    )

    # Use provided seed in response, or the seed that was actually used
    response_seed = request.seed if request.seed is not None else rng.integers(0, 0xFFFFFFFF)

    response = SimulateResponse(
        id=sim_id,
        created_at=created_at,
        expires_at=expires_at,
        region_id=request.region_id,
        seed=response_seed,
        params=params,
        derived=derived,
        grid=grid_info,
        steps=request.steps,
        steps_run=steps_run,
        ignition_time=ignition_time_data,
        stats=stats,
    )

    # Store result
    store.set(sim_id, response.model_dump(mode="json"))

    return response


@router.get("/simulation/{sim_id}", response_model=SimulateResponse)
def get_simulation(
    sim_id: str,
    store: ResultStore = Depends(get_store),
) -> SimulateResponse:
    """Retrieve a stored simulation result by ID."""
    result = store.get(sim_id)
    if result is None:
        raise SimulationNotFoundError(sim_id)
    return SimulateResponse.model_validate(result)
