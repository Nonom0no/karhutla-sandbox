"""Pydantic schemas for API request/response validation.

Field names use snake_case to match API_SPEC exactly.
"""

from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field

# --- Request schemas ---


class IgnitionPoint(BaseModel):
    """Single ignition point in lat/lon (WGS84)."""

    lat: float
    lon: float


class SimulateRequest(BaseModel):
    """POST /simulate request body."""

    model_config = ConfigDict(extra="forbid")

    region_id: str
    ignition_points: Annotated[
        list[IgnitionPoint],
        Field(min_length=1, max_length=5, description="1-5 ignition points"),
    ]
    fire_intensity: Annotated[int, Field(ge=1, le=100)] = 60
    wind_speed: Annotated[float, Field(ge=0.0, le=20.0)] = 5.0
    wind_from_deg: Annotated[float, Field(ge=0.0, lt=360.0)] = 270.0
    fuel_moisture: Annotated[float, Field(ge=0.0, le=1.0)] | None = None
    steps: Annotated[int, Field(ge=1, le=500)] = 200
    seed: Annotated[int, Field(ge=0, le=0xFFFFFFFF)] | None = None


# --- Response schemas ---


class GridInfo(BaseModel):
    """Grid metadata."""

    height: int
    width: int
    cell_size_m: int
    bbox: Annotated[list[float], Field(min_length=4, max_length=4)]


class DerivedParams(BaseModel):
    """Derived simulation parameters."""

    p_base: float
    dryness_multiplier: float
    k: float


class IgnitionTimeData(BaseModel):
    """Ignition time array metadata + base64 data."""

    encoding: Literal["base64-int16-le"] = "base64-int16-le"
    dtype: Literal["int16"] = "int16"
    order: Literal["row-major"] = "row-major"
    data: str


class Stats(BaseModel):
    """Simulation statistics."""

    burned_cells: int
    burned_fraction: float
    burned_area_ha: float


class SimulationParams(BaseModel):
    """Echo of input parameters used for simulation (POST /simulate response)."""

    ignition_points: list[IgnitionPoint]
    fire_intensity: int
    wind_speed: float
    wind_from_deg: float
    fuel_moisture: float


class RegionDefaultParams(BaseModel):
    """Default parameters for a region (GET /regions) - matches API_SPEC example."""

    fire_intensity: int
    wind_speed: float
    wind_from_deg: float
    fuel_moisture: float
    steps: int


class RegionInfo(BaseModel):
    """Region metadata for GET /regions."""

    id: str
    name: str
    description: str
    grid: GridInfo
    default_params: RegionDefaultParams


class RegionsResponse(BaseModel):
    """GET /regions response."""

    regions: list[RegionInfo]


class SimulateResponse(BaseModel):
    """POST /simulate and GET /simulation/{id} response."""

    id: str
    status: Literal["done"] = "done"
    created_at: datetime
    expires_at: datetime
    region_id: str
    seed: int
    params: SimulationParams
    derived: DerivedParams
    grid: GridInfo
    steps: int
    steps_run: int
    ignition_time: IgnitionTimeData
    stats: Stats


# --- Error schemas ---


class ErrorDetail(BaseModel):
    """Single validation error detail."""

    field: str
    issue: str


class ErrorEnvelope(BaseModel):
    """Uniform error envelope for all error responses."""

    error: "ErrorBody"


class ErrorBody(BaseModel):
    """Error body inside envelope."""

    code: str
    message: str
    details: list[ErrorDetail] | dict[str, Any] | None = None


# Forward reference resolution
ErrorEnvelope.model_rebuild()
ErrorBody.model_rebuild()


class FuelData(BaseModel):
    """Fuel grid data for GET /regions/{id}/fuel."""

    region_id: str
    height: int
    width: int
    encoding: Literal["base64-uint8"] = "base64-uint8"
    dtype: Literal["uint8"] = "uint8"
    order: Literal["row-major"] = "row-major"
    scale: int = 255
    data: str


__all__ = [
    "DerivedParams",
    "ErrorBody",
    "ErrorDetail",
    "ErrorEnvelope",
    "FuelData",
    "GridInfo",
    "IgnitionPoint",
    "IgnitionTimeData",
    "RegionDefaultParams",
    "RegionInfo",
    "RegionsResponse",
    "SimulateRequest",
    "SimulateResponse",
    "SimulationParams",
    "Stats",
]
