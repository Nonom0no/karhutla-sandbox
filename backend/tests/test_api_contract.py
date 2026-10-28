"""Contract tests: verify API response keys match API_SPEC examples exactly.

This test ensures the response structure matches the documented contract.
Run with: pytest -q tests/test_api_contract.py
"""

import json
from datetime import datetime, timezone
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# Expected response keys per API_SPEC examples
EXPECTED_REGIONS_KEYS = {"regions"}
EXPECTED_REGION_KEYS = {"id", "name", "description", "grid", "default_params"}
EXPECTED_GRID_KEYS = {"height", "width", "cell_size_m", "bbox"}
EXPECTED_DEFAULT_PARAMS_KEYS = {
    "fire_intensity",
    "wind_speed",
    "wind_from_deg",
    "fuel_moisture",
    "steps",
}
EXPECTED_IGNITION_POINT_KEYS = {"lat", "lon"}

EXPECTED_SIMULATE_KEYS = {
    "id",
    "status",
    "created_at",
    "expires_at",
    "region_id",
    "seed",
    "params",
    "derived",
    "grid",
    "steps",
    "steps_run",
    "ignition_time",
    "stats",
}
EXPECTED_PARAMS_KEYS = {
    "ignition_points",
    "fire_intensity",
    "wind_speed",
    "wind_from_deg",
    "fuel_moisture",
}
EXPECTED_DERIVED_KEYS = {"p_base", "dryness_multiplier", "k"}
EXPECTED_IGNITION_TIME_KEYS = {"encoding", "dtype", "order", "data"}
EXPECTED_STATS_KEYS = {"burned_cells", "burned_fraction", "burned_area_ha"}

EXPECTED_ERROR_KEYS = {"error"}
EXPECTED_ERROR_BODY_KEYS = {"code", "message", "details"}


def test_regions_response_structure() -> None:
    """GET /regions returns expected structure matching API_SPEC example."""
    response = client.get("/api/regions")
    assert response.status_code == 200

    data = response.json()
    assert set(data.keys()) == EXPECTED_REGIONS_KEYS

    regions = data["regions"]
    assert len(regions) == 3
    region_ids = {r["id"] for r in regions}
    assert region_ids == {"tropical_rainforest", "dry_forest", "grassland"}

    for region in regions:
        assert set(region.keys()) == EXPECTED_REGION_KEYS
        assert set(region["grid"].keys()) == EXPECTED_GRID_KEYS
        assert len(region["grid"]["bbox"]) == 4
        assert set(region["default_params"].keys()) == EXPECTED_DEFAULT_PARAMS_KEYS


def test_simulate_response_structure() -> None:
    """POST /simulate returns expected structure matching API_SPEC example."""
    # Use minimal valid request for dry_forest
    payload = {
        "region_id": "dry_forest",
        "ignition_points": [{"lat": 0.527, "lon": 101.527}],
        "fire_intensity": 60,
        "wind_speed": 5.0,
        "wind_from_deg": 270,
        "fuel_moisture": 0.4,
        "steps": 200,
        "seed": 42,
    }

    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert set(data.keys()) == EXPECTED_SIMULATE_KEYS

    # Check nested structures
    assert set(data["params"].keys()) == EXPECTED_PARAMS_KEYS
    for point in data["params"]["ignition_points"]:
        assert set(point.keys()) == EXPECTED_IGNITION_POINT_KEYS

    assert set(data["derived"].keys()) == EXPECTED_DERIVED_KEYS
    assert set(data["grid"].keys()) == EXPECTED_GRID_KEYS
    assert len(data["grid"]["bbox"]) == 4

    assert set(data["ignition_time"].keys()) == EXPECTED_IGNITION_TIME_KEYS
    assert data["ignition_time"]["encoding"] == "base64-int16-le"
    assert data["ignition_time"]["dtype"] == "int16"
    assert data["ignition_time"]["order"] == "row-major"
    assert isinstance(data["ignition_time"]["data"], str)
    assert len(data["ignition_time"]["data"]) > 0

    assert set(data["stats"].keys()) == EXPECTED_STATS_KEYS
    assert isinstance(data["stats"]["burned_cells"], int)
    assert isinstance(data["stats"]["burned_fraction"], float)
    assert isinstance(data["stats"]["burned_area_ha"], float)

    # Verify types
    assert isinstance(data["id"], str)
    assert len(data["id"]) == 32  # uuid4().hex
    assert data["status"] == "done"
    assert isinstance(data["created_at"], str)
    assert isinstance(data["expires_at"], str)
    assert data["region_id"] == "dry_forest"
    assert data["seed"] == 42
    assert data["steps"] == 200
    assert isinstance(data["steps_run"], int)
    assert 0 < data["steps_run"] <= 200


def test_get_simulation_response_structure() -> None:
    """GET /simulation/{id} returns identical structure to POST /simulate."""
    # First create a simulation
    payload = {
        "region_id": "dry_forest",
        "ignition_points": [{"lat": 0.527, "lon": 101.527}],
        "seed": 123,
    }
    create_response = client.post("/api/simulate", json=payload)
    assert create_response.status_code == 200
    sim_id = create_response.json()["id"]

    # Retrieve it
    response = client.get(f"/api/simulation/{sim_id}")
    assert response.status_code == 200

    data = response.json()
    assert set(data.keys()) == EXPECTED_SIMULATE_KEYS
    assert data["id"] == sim_id


def test_error_envelope_structure() -> None:
    """All error responses use the uniform error envelope."""
    # Test validation error (empty ignition_points)
    payload = {
        "region_id": "dry_forest",
        "ignition_points": [],
    }
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 422

    data = response.json()
    assert set(data.keys()) == EXPECTED_ERROR_KEYS
    error = data["error"]
    assert set(error.keys()) == EXPECTED_ERROR_BODY_KEYS
    assert error["code"] == "VALIDATION_ERROR"
    assert isinstance(error["message"], str)
    assert isinstance(error["details"], list)
    for detail in error["details"]:
        assert set(detail.keys()) == {"field", "issue"}

    # Test unknown region
    payload = {
        "region_id": "invalid_region",
        "ignition_points": [{"lat": 0.5, "lon": 101.5}],
    }
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 422

    data = response.json()
    assert set(data.keys()) == EXPECTED_ERROR_KEYS
    error = data["error"]
    assert error["code"] == "UNKNOWN_REGION"

    # Test simulation not found
    response = client.get("/api/simulation/nonexistent_id")
    assert response.status_code == 404

    data = response.json()
    assert set(data.keys()) == EXPECTED_ERROR_KEYS
    error = data["error"]
    assert error["code"] == "SIMULATION_NOT_FOUND"


def test_ignition_out_of_bounds_error_code() -> None:
    """IGNITION_OUT_OF_BOUNDS error for points outside bbox."""
    # dry_forest bbox: [101.500, 0.500, 101.554, 0.554]
    # Point clearly outside
    payload = {
        "region_id": "dry_forest",
        "ignition_points": [{"lat": 10.0, "lon": 101.5}],  # lat way outside
    }
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 422

    data = response.json()
    error = data["error"]
    assert error["code"] == "IGNITION_OUT_OF_BOUNDS"
    assert "lat" in error["details"]
    assert "lon" in error["details"]
    assert "region_id" in error["details"]


def test_ignition_on_non_fuel_error_code() -> None:
    """IGNITION_ON_NON_FUEL error for points on zero-fuel cells (river/edge)."""
    # dry_forest has river and edge cells with fuel=0
    # We can't easily know exact lat/lon for river without loading grid,
    # but we know edges are fuel=0. Test corner.
    payload = {
        "region_id": "dry_forest",
        "ignition_points": [{"lat": 0.554, "lon": 101.500}],  # NW corner (edge)
    }
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 422

    data = response.json()
    error = data["error"]
    assert error["code"] == "IGNITION_ON_NON_FUEL"
    assert "row" in error["details"]
    assert "col" in error["details"]
    assert error["details"]["row"] == 0 or error["details"]["row"] == 199
    assert error["details"]["col"] == 0 or error["details"]["col"] == 199


def test_cors_headers_present() -> None:
    """CORS headers are present for allowed origin."""
    response = client.options(
        "/api/simulate",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"},
    )
    # FastAPI's TestClient doesn't fully simulate CORS preflight,
    # but we can check the middleware is configured by checking the actual request
    response = client.post(
        "/api/simulate",
        json={
            "region_id": "dry_forest",
            "ignition_points": [{"lat": 0.527, "lon": 101.527}],
        },
        headers={"Origin": "http://localhost:5173"},
    )
    # Should have CORS headers
    assert "access-control-allow-origin" in response.headers


def test_field_names_snake_case() -> None:
    """All field names in response are snake_case (no camelCase)."""
    payload = {
        "region_id": "dry_forest",
        "ignition_points": [{"lat": 0.527, "lon": 101.527}],
        "seed": 42,
    }
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 200

    data = response.json()

    def check_snake_case(obj: Any, path: str = "") -> None:
        if isinstance(obj, dict):
            for key in obj:
                assert "_" not in key or key == key.lower(), f"Non-snake_case key at {path}: {key}"
                check_snake_case(obj[key], f"{path}.{key}")
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                check_snake_case(item, f"{path}[{i}]")

    check_snake_case(data)


def test_extra_fields_rejected() -> None:
    """Unknown fields in request are rejected (extra='forbid')."""
    payload = {
        "region_id": "dry_forest",
        "ignition_points": [{"lat": 0.527, "lon": 101.527}],
        "unknown_field": "should_fail",
    }
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 422

    data = response.json()
    error = data["error"]
    assert error["code"] == "VALIDATION_ERROR"


def test_ignition_points_count_limits() -> None:
    """ignition_points must be 1-5."""
    # Zero points
    payload = {"region_id": "dry_forest", "ignition_points": []}
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 422

    # Six points
    payload = {
        "region_id": "dry_forest",
        "ignition_points": [
            {"lat": 0.52, "lon": 101.52},
            {"lat": 0.521, "lon": 101.521},
            {"lat": 0.522, "lon": 101.522},
            {"lat": 0.523, "lon": 101.523},
            {"lat": 0.524, "lon": 101.524},
            {"lat": 0.525, "lon": 101.525},
        ],
    }
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 422


def test_parameter_ranges_enforced() -> None:
    """Parameter ranges per API_SPEC are enforced."""
    base_payload = {
        "region_id": "dry_forest",
        "ignition_points": [{"lat": 0.527, "lon": 101.527}],
    }

    # fire_intensity out of range
    for val in [0, 101]:
        response = client.post("/api/simulate", json={**base_payload, "fire_intensity": val})
        assert response.status_code == 422, f"fire_intensity={val} should fail"

    # wind_speed out of range
    for val in [-1, 21]:
        response = client.post("/api/simulate", json={**base_payload, "wind_speed": val})
        assert response.status_code == 422, f"wind_speed={val} should fail"

    # wind_from_deg out of range
    for val in [-1, 360]:
        response = client.post("/api/simulate", json={**base_payload, "wind_from_deg": val})
        assert response.status_code == 422, f"wind_from_deg={val} should fail"

    # fuel_moisture out of range
    for val in [-0.1, 1.1]:
        response = client.post("/api/simulate", json={**base_payload, "fuel_moisture": val})
        assert response.status_code == 422, f"fuel_moisture={val} should fail"

    # steps out of range
    for val in [0, 501]:
        response = client.post("/api/simulate", json={**base_payload, "steps": val})
        assert response.status_code == 422, f"steps={val} should fail"

    # seed out of range
    for val in [-1, 0x100000000]:
        response = client.post("/api/simulate", json={**base_payload, "seed": val})
        assert response.status_code == 422, f"seed={val} should fail"


def test_fuel_moisture_optional_uses_region_default() -> None:
    """fuel_moisture is optional; region default used when omitted."""
    payload = {
        "region_id": "dry_forest",
        "ignition_points": [{"lat": 0.527, "lon": 101.527}],
        "seed": 42,
    }
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 200

    data = response.json()
    # dry_forest default fuel_moisture is 0.4
    assert data["params"]["fuel_moisture"] == 0.4


def test_deterministic_seed() -> None:
    """Same seed produces identical ignition_time."""
    payload = {
        "region_id": "dry_forest",
        "ignition_points": [{"lat": 0.527, "lon": 101.527}],
        "seed": 999,
    }

    r1 = client.post("/api/simulate", json=payload)
    r2 = client.post("/api/simulate", json=payload)

    assert r1.status_code == 200
    assert r2.status_code == 200

    d1 = r1.json()
    d2 = r2.json()

    assert d1["ignition_time"]["data"] == d2["ignition_time"]["data"]
    assert d1["steps_run"] == d2["steps_run"]
    assert d1["stats"] == d2["stats"]
