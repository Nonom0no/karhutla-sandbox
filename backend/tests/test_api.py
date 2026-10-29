"""Integration tests for API endpoints."""

import base64

import numpy as np
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "0.1.0"}


def test_get_regions() -> None:
    response = client.get("/api/regions")
    assert response.status_code == 200
    data = response.json()
    assert "regions" in data
    assert len(data["regions"]) == 3
    ids = {r["id"] for r in data["regions"]}
    assert ids == {"tropical_rainforest", "dry_forest", "grassland"}


def test_simulate_basic() -> None:
    payload = {
        "region_id": "dry_forest",
        "ignition_points": [{"lat": 0.527, "lon": 101.527}],
        "seed": 42,
    }
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["region_id"] == "dry_forest"
    assert data["seed"] == 42
    assert data["status"] == "done"
    assert "ignition_time" in data
    assert data["ignition_time"]["encoding"] == "base64-int16-le"
    assert "stats" in data


def test_get_simulation_by_id() -> None:
    # Create simulation
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
    assert data["id"] == sim_id
    assert data["seed"] == 123


def test_simulation_not_found() -> None:
    response = client.get("/api/simulation/nonexistent123")
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "SIMULATION_NOT_FOUND"


def test_unknown_region() -> None:
    payload = {
        "region_id": "invalid_region",
        "ignition_points": [{"lat": 0.5, "lon": 101.5}],
    }
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "UNKNOWN_REGION"


def test_ignition_out_of_bounds() -> None:
    # dry_forest bbox: [101.500, 0.500, 101.554, 0.554]
    payload = {
        "region_id": "dry_forest",
        "ignition_points": [{"lat": 10.0, "lon": 101.5}],
    }
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "IGNITION_OUT_OF_BOUNDS"


def test_ignition_on_non_fuel_edge() -> None:
    # Edge cells have fuel=0
    payload = {
        "region_id": "dry_forest",
        "ignition_points": [{"lat": 0.554, "lon": 101.500}],  # NW corner
    }
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "IGNITION_ON_NON_FUEL"


def test_validation_error_empty_ignition_points() -> None:
    payload = {"region_id": "dry_forest", "ignition_points": []}
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_validation_error_too_many_ignition_points() -> None:
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
    data = response.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_validation_error_extra_field() -> None:
    payload = {
        "region_id": "dry_forest",
        "ignition_points": [{"lat": 0.527, "lon": 101.527}],
        "extra_field": "not_allowed",
    }
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_all_regions_work() -> None:
    """All three regions can run simulation."""
    for region_id in ["tropical_rainforest", "dry_forest", "grassland"]:
        payload = {
            "region_id": region_id,
            "seed": 42,
        }
        # Use valid ignition points for each region's bbox
        if region_id == "tropical_rainforest":
            payload["ignition_points"] = [{"lat": -2.227, "lon": 113.927}]
        elif region_id == "dry_forest":
            payload["ignition_points"] = [{"lat": 0.527, "lon": 101.527}]
        elif region_id == "grassland":
            payload["ignition_points"] = [{"lat": -9.673, "lon": 120.027}]

        response = client.post("/api/simulate", json=payload)
        assert response.status_code == 200, f"Region {region_id} failed: {response.json()}"
        data = response.json()
        assert data["region_id"] == region_id


def test_default_parameters_applied() -> None:
    """Optional parameters use defaults when omitted."""
    payload = {
        "region_id": "dry_forest",
        "ignition_points": [{"lat": 0.527, "lon": 101.527}],
    }
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    # Check defaults are applied
    assert data["params"]["fire_intensity"] == 60
    assert data["params"]["wind_speed"] == 5.0
    assert data["params"]["wind_from_deg"] == 270.0
    assert data["params"]["fuel_moisture"] == 0.4  # dry_forest default
    assert data["steps"] == 200


def test_response_includes_all_required_fields() -> None:
    """Response has all fields specified in API_SPEC."""
    payload = {
        "region_id": "dry_forest",
        "ignition_points": [{"lat": 0.527, "lon": 101.527}],
        "seed": 42,
    }
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()

    required = [
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
    ]
    for field in required:
        assert field in data, f"Missing field: {field}"


def test_derived_params_present() -> None:
    """derived object contains p_base, dryness_multiplier, k."""
    payload = {
        "region_id": "dry_forest",
        "ignition_points": [{"lat": 0.527, "lon": 101.527}],
        "fire_intensity": 60,
        "fuel_moisture": 0.4,
        "seed": 42,
    }
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    derived = data["derived"]
    assert "p_base" in derived
    assert "dryness_multiplier" in derived
    assert "k" in derived
    assert derived["k"] == 0.1


def test_stats_calculation() -> None:
    """stats object has burned_cells, burned_fraction, burned_area_ha."""
    payload = {
        "region_id": "dry_forest",
        "ignition_points": [{"lat": 0.527, "lon": 101.527}],
        "seed": 42,
    }
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    stats = data["stats"]
    assert "burned_cells" in stats
    assert "burned_fraction" in stats
    assert "burned_area_ha" in stats
    assert isinstance(stats["burned_cells"], int)
    assert isinstance(stats["burned_fraction"], float)
    assert isinstance(stats["burned_area_ha"], float)
    # burned_fraction = burned_cells / (200*200)
    assert abs(stats["burned_fraction"] - stats["burned_cells"] / 40000) < 0.0001
    # burned_area_ha = burned_cells * 0.09
    assert abs(stats["burned_area_ha"] - stats["burned_cells"] * 0.09) < 0.01


def test_get_region_fuel_basic() -> None:
    """GET /regions/{id}/fuel returns correct structure for dry_forest."""
    response = client.get("/api/regions/dry_forest/fuel")
    assert response.status_code == 200
    data = response.json()

    # Required fields per API_SPEC §3b
    assert data["region_id"] == "dry_forest"
    assert data["height"] == 200
    assert data["width"] == 200
    assert data["encoding"] == "base64-uint8"
    assert data["dtype"] == "uint8"
    assert data["order"] == "row-major"
    assert data["scale"] == 255
    assert "data" in data
    assert isinstance(data["data"], str)

    # Decode and verify size = 40,000 bytes (200*200)
    import base64

    decoded = base64.b64decode(data["data"])
    assert len(decoded) == 40000


def test_get_region_fuel_all_regions() -> None:
    """All three regions have fuel endpoint working."""
    for region_id in ["tropical_rainforest", "dry_forest", "grassland"]:
        response = client.get(f"/api/regions/{region_id}/fuel")
        assert response.status_code == 200, f"Region {region_id} failed: {response.json()}"
        data = response.json()
        assert data["region_id"] == region_id
        assert data["height"] == 200
        assert data["width"] == 200
        assert data["scale"] == 255


def test_get_region_fuel_not_found() -> None:
    """Unknown region returns 404 REGION_NOT_FOUND."""
    response = client.get("/api/regions/invalid_region/fuel")
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "REGION_NOT_FOUND"


def test_get_region_fuel_values_valid() -> None:
    """Fuel values are valid: 0 for water/edge, 1-255 for burnable."""
    response = client.get("/api/regions/dry_forest/fuel")
    assert response.status_code == 200
    data = response.json()

    decoded = base64.b64decode(data["data"])
    arr = np.frombuffer(decoded, dtype=np.uint8).reshape(200, 200)

    # All values must be in range 0-255
    assert np.all(arr >= 0)
    assert np.all(arr <= 255)

    # Edges should be 0 (non-burnable)
    assert np.all(arr[0, :] == 0)  # top edge
    assert np.all(arr[-1, :] == 0)  # bottom edge
    assert np.all(arr[:, 0] == 0)  # left edge
    assert np.all(arr[:, -1] == 0)  # right edge

    # Should have some burnable cells (>0)
    assert np.any(arr > 0)
