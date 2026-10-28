"""
Tests for cellular automaton core (T-SIM-01 through T-SIM-09).

Per SIMULATION_SPEC §9.
"""

import numpy as np
from numpy.random import default_rng

from app.sim.ca import B, U, X, run_simulation, step
from app.sim.params import K_WIND


class TestWindDirectionEast:
    """T-SIM-01: wind_from_deg=270 (from west) → east reach > west reach."""

    def test_east_wins(self):
        # Uniform fuel=1 grid with edge=0, size 101x101 (odd so center is exact)
        H = W = 101
        fuel = np.ones((H, W), dtype=np.float32)
        fuel[0, :] = 0
        fuel[-1, :] = 0
        fuel[:, 0] = 0
        fuel[:, -1] = 0

        center = H // 2
        ignition_points = [(center, center)]

        rng = default_rng(0)
        ignition_time, _ = run_simulation(
            fuel=fuel,
            ignition_points=ignition_points,
            wind_speed=10.0,
            wind_from_deg=270.0,  # from west → spreads east
            p_base=0.3,
            k=K_WIND,
            steps=40,
            rng=rng,
        )

        # Measure reach: max column index burned (east) vs min column index burned (west)
        burned = ignition_time >= 0
        burned_cols = np.where(burned)[1]
        east_reach = burned_cols.max() - center
        west_reach = center - burned_cols.min()

        assert east_reach > west_reach, f"East reach {east_reach} not > West reach {west_reach}"


class TestWindDirectionSouth:
    """T-SIM-02: wind_from_deg=0 (from north) → south reach > north reach."""

    def test_south_wins(self):
        H = W = 101
        fuel = np.ones((H, W), dtype=np.float32)
        fuel[0, :] = 0
        fuel[-1, :] = 0
        fuel[:, 0] = 0
        fuel[:, -1] = 0

        center = H // 2
        ignition_points = [(center, center)]

        rng = default_rng(0)
        ignition_time, _ = run_simulation(
            fuel=fuel,
            ignition_points=ignition_points,
            wind_speed=10.0,
            wind_from_deg=0.0,  # from north → spreads south
            p_base=0.3,
            k=K_WIND,
            steps=40,
            rng=rng,
        )

        burned = ignition_time >= 0
        burned_rows = np.where(burned)[0]
        south_reach = burned_rows.max() - center
        north_reach = center - burned_rows.min()

        assert south_reach > north_reach, (
            f"South reach {south_reach} not > North reach {north_reach}"
        )


class TestNoWindSymmetry:
    """T-SIM-03: wind_speed=0, average over 20 seeds → east/west reach diff ≤ 15%."""

    def test_symmetry(self):
        H = W = 101
        fuel = np.ones((H, W), dtype=np.float32)
        fuel[0, :] = 0
        fuel[-1, :] = 0
        fuel[:, 0] = 0
        fuel[:, -1] = 0

        center = H // 2
        ignition_points = [(center, center)]

        east_reaches = []
        west_reaches = []

        for seed in range(20):
            rng = default_rng(seed)
            ignition_time, _ = run_simulation(
                fuel=fuel,
                ignition_points=ignition_points,
                wind_speed=0.0,
                wind_from_deg=0.0,
                p_base=0.3,
                k=K_WIND,
                steps=40,
                rng=rng,
            )
            burned = ignition_time >= 0
            burned_cols = np.where(burned)[1]
            east_reaches.append(burned_cols.max() - center)
            west_reaches.append(center - burned_cols.min())

        avg_east = np.mean(east_reaches)
        avg_west = np.mean(west_reaches)
        avg_both = (avg_east + avg_west) / 2
        diff_pct = abs(avg_east - avg_west) / avg_both * 100

        assert diff_pct <= 15.0, f"East/West reach diff {diff_pct:.1f}% > 15%"


class TestFuelZeroBarrier:
    """T-SIM-04: Random fuel with fuel=0 patches → ignition_time[fuel==0] == -1."""

    def test_fuel_zero_never_burns(self):
        H = W = 50
        # Create random fuel with some zero patches
        base_fuel = np.ones((H, W), dtype=np.float32)
        base_fuel[0, :] = 0
        base_fuel[-1, :] = 0
        base_fuel[:, 0] = 0
        base_fuel[:, -1] = 0

        for seed in range(5):
            rng = default_rng(seed)
            # Add random zero patches (simulating rivers, roads)
            fuel = base_fuel.copy()
            # Randomly set some interior cells to 0
            mask = rng.random((H, W)) < 0.1
            fuel[mask] = 0.0
            # Ensure edges stay 0
            fuel[0, :] = 0
            fuel[-1, :] = 0
            fuel[:, 0] = 0
            fuel[:, -1] = 0

            ignition_points = [(H // 2, W // 2)]
            ignition_time, _ = run_simulation(
                fuel=fuel,
                ignition_points=ignition_points,
                wind_speed=5.0,
                wind_from_deg=270.0,
                p_base=0.5,
                k=K_WIND,
                steps=30,
                rng=rng,
            )

            # All fuel==0 cells must have ignition_time == -1
            zero_fuel_mask = fuel == 0
            assert np.all(ignition_time[zero_fuel_mask] == -1), (
                f"Seed {seed}: some fuel=0 cells burned"
            )


class TestDeterminismSameSeed:
    """T-SIM-05: Same seed twice → identical ignition_time arrays."""

    def test_same_seed_identical(self):
        H = W = 60
        fuel = np.ones((H, W), dtype=np.float32)
        fuel[0, :] = 0
        fuel[-1, :] = 0
        fuel[:, 0] = 0
        fuel[:, -1] = 0

        ignition_points = [(H // 2, W // 2)]

        rng1 = default_rng(42)
        it1, _ = run_simulation(
            fuel=fuel,
            ignition_points=ignition_points,
            wind_speed=5.0,
            wind_from_deg=270.0,
            p_base=0.4,
            k=K_WIND,
            steps=30,
            rng=rng1,
        )

        rng2 = default_rng(42)
        it2, _ = run_simulation(
            fuel=fuel,
            ignition_points=ignition_points,
            wind_speed=5.0,
            wind_from_deg=270.0,
            p_base=0.4,
            k=K_WIND,
            steps=30,
            rng=rng2,
        )

        assert np.array_equal(it1, it2), "Same seed produced different results"


class TestDeterminismDifferentSeed:
    """T-SIM-06: Different seeds → different arrays (high p scenario)."""

    def test_different_seed_different(self):
        H = W = 40
        fuel = np.ones((H, W), dtype=np.float32)
        fuel[0, :] = 0
        fuel[-1, :] = 0
        fuel[:, 0] = 0
        fuel[:, -1] = 0

        ignition_points = [(H // 2, W // 2)]

        rng1 = default_rng(1)
        it1, _ = run_simulation(
            fuel=fuel,
            ignition_points=ignition_points,
            wind_speed=10.0,
            wind_from_deg=270.0,
            p_base=0.6,
            k=K_WIND,
            steps=20,
            rng=rng1,
        )

        rng2 = default_rng(2)
        it2, _ = run_simulation(
            fuel=fuel,
            ignition_points=ignition_points,
            wind_speed=10.0,
            wind_from_deg=270.0,
            p_base=0.6,
            k=K_WIND,
            steps=20,
            rng=rng2,
        )

        # With high p_base and wind, different seeds should produce different patterns
        # (Extremely unlikely to be identical by chance)
        assert not np.array_equal(it1, it2), "Different seeds produced identical results"


class TestGridEdge:
    """T-SIM-07: Grid edge cells never burn (fuel=0 at edges enforced)."""

    def test_edges_never_burn(self):
        H = W = 40
        fuel = np.ones((H, W), dtype=np.float32)
        # Edges are 0 (as required by spec)
        fuel[0, :] = 0
        fuel[-1, :] = 0
        fuel[:, 0] = 0
        fuel[:, -1] = 0

        ignition_points = [(H // 2, W // 2)]

        rng = default_rng(0)
        ignition_time, _ = run_simulation(
            fuel=fuel,
            ignition_points=ignition_points,
            wind_speed=10.0,
            wind_from_deg=270.0,
            p_base=0.6,
            k=K_WIND,
            steps=50,
            rng=rng,
        )

        # Edge cells must remain -1
        assert np.all(ignition_time[0, :] == -1), "Top edge burned"
        assert np.all(ignition_time[-1, :] == -1), "Bottom edge burned"
        assert np.all(ignition_time[:, 0] == -1), "Left edge burned"
        assert np.all(ignition_time[:, -1] == -1), "Right edge burned"


class TestCausality:
    """T-SIM-08: Every cell with ignition_time=n>0 has Moore neighbor with n-1."""

    def test_causality(self):
        H = W = 50
        fuel = np.ones((H, W), dtype=np.float32)
        fuel[0, :] = 0
        fuel[-1, :] = 0
        fuel[:, 0] = 0
        fuel[:, -1] = 0

        ignition_points = [(H // 2, W // 2)]

        rng = default_rng(123)
        ignition_time, _ = run_simulation(
            fuel=fuel,
            ignition_points=ignition_points,
            wind_speed=5.0,
            wind_from_deg=225.0,
            p_base=0.4,
            k=K_WIND,
            steps=30,
            rng=rng,
        )

        # For each burned cell (except initial t=0), check Moore neighborhood
        burned_mask = ignition_time > 0
        burned_indices = np.where(burned_mask)
        for r, c in zip(*burned_indices):
            t = ignition_time[r, c]
            # Check 8 neighbors for t-1
            neighbor_times = []
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    if dr == 0 and dc == 0:
                        continue
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < H and 0 <= nc < W:
                        neighbor_times.append(ignition_time[nr, nc])

            assert (t - 1) in neighbor_times, (
                f"Cell ({r},{c}) at t={t} has no neighbor at t={t - 1}. Neighbors: {neighbor_times}"
            )


class TestIgnitionTimeRange:
    """T-SIM-09: ignition_time values in [-1, steps_run]."""

    def test_range(self):
        H = W = 40
        fuel = np.ones((H, W), dtype=np.float32)
        fuel[0, :] = 0
        fuel[-1, :] = 0
        fuel[:, 0] = 0
        fuel[:, -1] = 0

        ignition_points = [(H // 2, W // 2)]

        rng = default_rng(999)
        ignition_time, steps_run = run_simulation(
            fuel=fuel,
            ignition_points=ignition_points,
            wind_speed=5.0,
            wind_from_deg=180.0,
            p_base=0.5,
            k=K_WIND,
            steps=25,
            rng=rng,
        )

        # All values must be >= -1 and <= steps_run
        assert np.all(ignition_time >= -1), "Values below -1 found"
        assert np.all(ignition_time <= steps_run), f"Values above steps_run={steps_run} found"
        # At least one cell burned (the ignition point)
        assert np.any(ignition_time == 0), "No ignition point recorded"
        # steps_run should be <= steps
        assert steps_run <= 25


class TestStepFunctionDirectly:
    """Direct tests for the step() function behavior."""

    def test_step_burning_becomes_burned(self):
        """Burning cells become burned after one step."""
        state = np.array(
            [
                [U, U, U],
                [U, B, U],
                [U, U, U],
            ],
            dtype=np.uint8,
        )
        fuel = np.ones((3, 3), dtype=np.float32)
        rng = default_rng(0)

        new_state = step(state, fuel, 0.0, 0.0, 0.3, K_WIND, rng)

        assert new_state[1, 1] == X, "Burning cell should become burned"

    def test_step_ignition_probability_zero(self):
        """With p_base=0, no new ignitions."""
        state = np.array(
            [
                [U, U, U],
                [U, B, U],
                [U, U, U],
            ],
            dtype=np.uint8,
        )
        fuel = np.ones((3, 3), dtype=np.float32)
        rng = default_rng(0)

        new_state = step(state, fuel, 0.0, 0.0, 0.0, K_WIND, rng)

        # Only center should change (B→X), no new B
        assert new_state[1, 1] == X
        assert np.sum(new_state == B) == 0, "No new burning cells with p_base=0"

    def test_step_fuel_zero_blocks(self):
        """Fuel=0 cells never ignite."""
        state = np.array(
            [
                [U, B, U],
                [U, U, U],
                [U, U, U],
            ],
            dtype=np.uint8,
        )
        fuel = np.ones((3, 3), dtype=np.float32)
        fuel[0, 0] = 0.0  # Target cell has no fuel
        rng = default_rng(0)

        new_state = step(state, fuel, 0.0, 0.0, 1.0, K_WIND, rng)  # p_base=1.0 max

        # Cell (0,0) has fuel=0, should not ignite even with p_base=1.0
        assert new_state[0, 0] == U, "Fuel=0 cell should not ignite"


class TestRunSimulationEarlyStop:
    """Test that simulation stops early when no burning cells remain."""

    def test_early_stop(self):
        H = W = 20
        fuel = np.ones((H, W), dtype=np.float32)
        fuel[0, :] = 0
        fuel[-1, :] = 0
        fuel[:, 0] = 0
        fuel[:, -1] = 0

        # Single ignition point, no wind, low p_base → fire dies quickly
        ignition_points = [(H // 2, W // 2)]

        rng = default_rng(0)
        _, steps_run = run_simulation(
            fuel=fuel,
            ignition_points=ignition_points,
            wind_speed=0.0,
            wind_from_deg=0.0,
            p_base=0.05,
            k=K_WIND,
            steps=100,
            rng=rng,
        )

        # Fire should die out before 100 steps
        assert steps_run < 100, "Fire ran all 100 steps, expected early stop"
        # Just verify steps_run is reasonable
        assert steps_run >= 1


class TestMultipleIgnitionPoints:
    """Test multiple ignition points work correctly."""

    def test_multiple_points(self):
        H = W = 50
        fuel = np.ones((H, W), dtype=np.float32)
        fuel[0, :] = 0
        fuel[-1, :] = 0
        fuel[:, 0] = 0
        fuel[:, -1] = 0

        ignition_points = [(10, 10), (40, 40), (10, 40)]

        rng = default_rng(0)
        ignition_time, _ = run_simulation(
            fuel=fuel,
            ignition_points=ignition_points,
            wind_speed=0.0,
            wind_from_deg=0.0,
            p_base=0.4,
            k=K_WIND,
            steps=30,
            rng=rng,
        )

        # All three ignition points should have time 0
        for r, c in ignition_points:
            assert ignition_time[r, c] == 0, f"Ignition point ({r},{c}) not set to 0"


if __name__ == "__main__":
    # Allow running directly for quick debugging
    import pytest

    pytest.main([__file__, "-v"])
