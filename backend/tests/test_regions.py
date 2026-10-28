"""
Tests for region registry and fuel grids (T-SIM-12).

Per SIMULATION_SPEC Section 9:
T-SIM-12: each .npy: shape (200,200), float32, values in [0,1], border = 0,
has interior fuel=0 cells (river)
"""

import hashlib

import numpy as np
import pytest

from app.sim.regions import (
    REGION_IDS,
    clear_fuel_cache,
    get_region,
    list_regions,
    load_fuel_grid,
)


class TestRegionRegistry:
    """Tests for region metadata registry."""

    def test_region_ids_match_spec(self):
        """REGION_IDS matches the three expected regions in correct order."""
        assert REGION_IDS == ["tropical_rainforest", "dry_forest", "grassland"]

    def test_get_region_returns_correct_structure(self):
        """get_region returns dict with all required fields per API_SPEC Section 3."""
        region = get_region("dry_forest")

        # Required top-level keys
        assert "id" in region
        assert "name" in region
        assert "description" in region
        assert "grid" in region
        assert "default_params" in region

        # Grid sub-keys
        grid = region["grid"]
        assert grid["height"] == 200
        assert grid["width"] == 200
        assert grid["cell_size_m"] == 30
        assert "bbox" in grid
        assert len(grid["bbox"]) == 4  # [west, south, east, north]

        # Default params sub-keys
        params = region["default_params"]
        assert "fire_intensity" in params
        assert "wind_speed" in params
        assert "wind_from_deg" in params
        assert "fuel_moisture" in params
        assert "steps" in params

    def test_get_region_dry_forest_matches_api_spec_example(self):
        """dry_forest region matches the example in API_SPEC Section 3 exactly."""
        region = get_region("dry_forest")

        assert region["id"] == "dry_forest"
        assert region["name"] == "Hutan Mengering"
        assert region["description"] == (
            "Vegetasi hutan dengan fuel sedang-tinggi dan kelembapan rendah."
        )
        assert region["grid"]["bbox"] == [101.500, 0.500, 101.554, 0.554]
        assert region["default_params"] == {
            "fire_intensity": 60,
            "wind_speed": 5.0,
            "wind_from_deg": 270.0,
            "fuel_moisture": 0.4,
            "steps": 200,
        }

    def test_get_region_tropical_rainforest(self):
        """Tropical rainforest region has correct values per SIMULATION_SPEC Section 6."""
        region = get_region("tropical_rainforest")

        assert region["id"] == "tropical_rainforest"
        assert region["name"] == "Hutan Hujan Tropis"
        assert region["grid"]["bbox"] == [113.900, -2.254, 113.954, -2.200]
        assert region["default_params"]["fuel_moisture"] == 0.7

    def test_get_region_grassland(self):
        """Grassland region has correct values per SIMULATION_SPEC Section 6."""
        region = get_region("grassland")

        assert region["id"] == "grassland"
        assert region["name"] == "Padang Rumput"
        assert region["grid"]["bbox"] == [120.000, -9.700, 120.054, -9.646]
        assert region["default_params"]["fuel_moisture"] == 0.5

    def test_get_region_invalid_raises_keyerror(self):
        """get_region raises KeyError for unknown region_id."""
        with pytest.raises(KeyError):
            get_region("unknown_region")

    def test_list_regions_returns_all_three(self):
        """list_regions returns list of all three region dicts."""
        regions = list_regions()
        assert len(regions) == 3
        ids = [r["id"] for r in regions]
        assert ids == REGION_IDS


class TestFuelGrids:
    """Tests for fuel grid loading and T-SIM-12 requirements."""

    @pytest.fixture(autouse=True)
    def clear_cache(self):
        """Clear fuel cache before each test."""
        clear_fuel_cache()
        yield
        clear_fuel_cache()

    def test_load_fuel_grid_shape_and_dtype(self):
        """Each fuel grid has shape (200, 200) and dtype float32."""
        for region_id in REGION_IDS:
            fuel = load_fuel_grid(region_id)
            assert fuel.shape == (200, 200), f"{region_id}: wrong shape {fuel.shape}"
            assert fuel.dtype == np.float32, f"{region_id}: wrong dtype {fuel.dtype}"

    def test_fuel_values_in_range(self):
        """All fuel values in [0, 1]."""
        for region_id in REGION_IDS:
            fuel = load_fuel_grid(region_id)
            assert np.all(fuel >= 0.0), f"{region_id}: values below 0"
            assert np.all(fuel <= 1.0), f"{region_id}: values above 1"

    def test_border_is_zero(self):
        """Border (1-cell ring) is all zeros."""
        for region_id in REGION_IDS:
            fuel = load_fuel_grid(region_id)
            # Top and bottom borders
            assert np.all(fuel[0, :] == 0.0), f"{region_id}: top border not zero"
            assert np.all(fuel[-1, :] == 0.0), f"{region_id}: bottom border not zero"
            # Left and right borders
            assert np.all(fuel[:, 0] == 0.0), f"{region_id}: left border not zero"
            assert np.all(fuel[:, -1] == 0.0), f"{region_id}: right border not zero"

    def test_has_interior_zero_cells_river(self):
        """Interior has fuel=0 cells (river) - not just border."""
        for region_id in REGION_IDS:
            fuel = load_fuel_grid(region_id)
            interior = fuel[1:-1, 1:-1]
            zero_count = np.sum(interior == 0.0)
            assert zero_count > 0, f"{region_id}: no interior fuel=0 cells (river missing)"

    def test_load_fuel_grid_caches(self):
        """load_fuel_grid caches the array on second call."""
        fuel1 = load_fuel_grid("dry_forest")
        fuel2 = load_fuel_grid("dry_forest")
        assert fuel1 is fuel2, "Fuel grid not cached"

    def test_load_fuel_grid_invalid_raises_keyerror(self):
        """load_fuel_grid raises KeyError for unknown region_id."""
        with pytest.raises(KeyError):
            load_fuel_grid("unknown_region")

    def test_fuel_grid_deterministic_values(self):
        """Fuel grids have expected base_mean +- amp ranges (before river/border)."""
        # Tropical rainforest: base_mean=0.40, amp=0.10 -> range ~[0.30, 0.50]
        fuel_tr = load_fuel_grid("tropical_rainforest")
        interior_tr = fuel_tr[1:-1, 1:-1]
        non_zero_tr = interior_tr[interior_tr > 0]
        assert len(non_zero_tr) > 1000, "tropical_rainforest: too few non-zero cells"
        assert non_zero_tr.min() >= 0.25, "tropical_rainforest: min too low"
        assert non_zero_tr.max() <= 0.55, "tropical_rainforest: max too high"

        # Dry forest: base_mean=0.70, amp=0.10 -> ~[0.60, 0.80]
        fuel_df = load_fuel_grid("dry_forest")
        interior_df = fuel_df[1:-1, 1:-1]
        non_zero_df = interior_df[interior_df > 0]
        assert len(non_zero_df) > 1000
        assert non_zero_df.min() >= 0.55
        assert non_zero_df.max() <= 0.85

        # Grassland: base_mean=0.90, amp=0.07 -> ~[0.83, 0.97]
        fuel_gl = load_fuel_grid("grassland")
        interior_gl = fuel_gl[1:-1, 1:-1]
        non_zero_gl = interior_gl[interior_gl > 0]
        assert len(non_zero_gl) > 1000
        assert non_zero_gl.min() >= 0.80
        assert non_zero_gl.max() <= 1.0  # clipped at 1.0

    def test_fuel_grid_river_width_approximately_3(self):
        """River is approximately 3 cells wide (may vary at bends).

        River flows generally left-to-right, so check vertical cross-sections
        (columns) to measure width perpendicular to flow.
        """
        for region_id in REGION_IDS:
            fuel = load_fuel_grid(region_id)
            interior = fuel[1:-1, 1:-1]

            # Check several columns across the grid to measure river width
            max_run_overall = 0
            for col_idx in range(0, interior.shape[1], 20):
                sample_col = interior[:, col_idx]
                zero_runs = []
                in_run = False
                run_len = 0
                for val in sample_col:
                    if val == 0.0:
                        if not in_run:
                            in_run = True
                            run_len = 1
                        else:
                            run_len += 1
                    elif in_run:
                        zero_runs.append(run_len)
                        in_run = False
                        run_len = 0
                if in_run:
                    zero_runs.append(run_len)

                if zero_runs:
                    max_run_overall = max(max_run_overall, *zero_runs)

            # Should have at least one run of ~3 zeros (the river width) somewhere
            assert max_run_overall >= 2, (
                f"{region_id}: river width too narrow (max run={max_run_overall})"
            )
            assert max_run_overall <= 5, (
                f"{region_id}: river width too wide (max_run={max_run_overall})"
            )


class TestFuelGridDeterminism:
    """Test that fuel grids are deterministic (same on reload)."""

    def test_reload_produces_identical_arrays(self):
        """Loading the same region twice produces identical arrays."""
        clear_fuel_cache()
        fuel1 = load_fuel_grid("dry_forest")
        clear_fuel_cache()
        fuel2 = load_fuel_grid("dry_forest")
        assert np.array_equal(fuel1, fuel2), "Reloaded fuel grid differs"

    def test_generator_deterministic(self):
        """Running generator twice produces identical files (verified via hash)."""
        expected_hashes = {
            "tropical_rainforest": "c5f59adaaba2da9f94c85828371df4a5",
            "dry_forest": "586032db94198b5aea5f7d4ea2402aba",
            "grassland": "fbb08e96faa9b9e80c5f32dc48339692",
        }

        for region_id, expected_hash in expected_hashes.items():
            fuel = load_fuel_grid(region_id)
            actual_hash = hashlib.md5(fuel.tobytes()).hexdigest()
            assert actual_hash == expected_hash, (
                f"{region_id}: hash mismatch (expected {expected_hash}, got {actual_hash})"
            )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
