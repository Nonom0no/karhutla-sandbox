"""
Tests for simulation parameter mapping functions.

Covers T-SIM-10 from SIMULATION_SPEC §9.
"""

import pytest

from app.sim.params import (
    DRYNESS_MULTIPLIER_MAX,
    DRYNESS_MULTIPLIER_MIN,
    FUEL_MOISTURE_MAX,
    FUEL_MOISTURE_MIN,
    INTENSITY_MAX,
    INTENSITY_MIN,
    MAX_STEPS,
    P_BASE_MAX,
    P_BASE_MIN,
    dryness_multiplier,
    intensity_to_p_base,
    validate_fire_intensity,
    validate_fuel_moisture,
    validate_seed,
    validate_steps,
    validate_wind_from_deg,
    validate_wind_speed,
)


class TestIntensityToPBase:
    def test_min_intensity(self):
        assert intensity_to_p_base(INTENSITY_MIN) == P_BASE_MIN
        assert intensity_to_p_base(1) == 0.05

    def test_max_intensity(self):
        assert intensity_to_p_base(INTENSITY_MAX) == P_BASE_MAX
        assert intensity_to_p_base(100) == 0.60

    def test_mid_intensity(self):
        # intensity 50 → p_base = 0.05 + 49/99 * 0.55
        expected = 0.05 + 49 / 99 * 0.55
        assert abs(intensity_to_p_base(50) - expected) < 1e-10

    def test_linear_progression(self):
        # Verify linear mapping
        for i in [1, 25, 50, 75, 100]:
            p = intensity_to_p_base(i)
            expected = 0.05 + (i - 1) / 99 * 0.55
            assert abs(p - expected) < 1e-10

    def test_invalid_below_min(self):
        with pytest.raises(ValueError):
            intensity_to_p_base(0)

    def test_invalid_above_max(self):
        with pytest.raises(ValueError):
            intensity_to_p_base(101)


class TestDrynessMultiplier:
    def test_dry_min_fuel_moisture(self):
        assert dryness_multiplier(FUEL_MOISTURE_MIN) == DRYNESS_MULTIPLIER_MAX
        assert dryness_multiplier(0.0) == 1.3

    def test_wet_max_fuel_moisture(self):
        assert dryness_multiplier(FUEL_MOISTURE_MAX) == DRYNESS_MULTIPLIER_MIN
        assert dryness_multiplier(1.0) == 0.4

    def test_mid_fuel_moisture(self):
        # fuel_moisture 0.5 → dryness = 1.3 - 0.9 * 0.5 = 0.85
        assert abs(dryness_multiplier(0.5) - 0.85) < 1e-10

    def test_linear_progression(self):
        for fm in [0.0, 0.25, 0.5, 0.75, 1.0]:
            dm = dryness_multiplier(fm)
            expected = 1.3 - 0.9 * fm
            assert abs(dm - expected) < 1e-10

    def test_invalid_below_min(self):
        with pytest.raises(ValueError):
            dryness_multiplier(-0.1)

    def test_invalid_above_max(self):
        with pytest.raises(ValueError):
            dryness_multiplier(1.1)


class TestValidators:
    def test_validate_fire_intensity_valid(self):
        assert validate_fire_intensity(1) == 1
        assert validate_fire_intensity(60) == 60
        assert validate_fire_intensity(100) == 100

    def test_validate_fire_intensity_invalid(self):
        with pytest.raises(ValueError):
            validate_fire_intensity(0)
        with pytest.raises(ValueError):
            validate_fire_intensity(101)

    def test_validate_wind_speed_valid(self):
        assert validate_wind_speed(0.0) == 0.0
        assert validate_wind_speed(5.0) == 5.0
        assert validate_wind_speed(20.0) == 20.0

    def test_validate_wind_speed_invalid(self):
        with pytest.raises(ValueError):
            validate_wind_speed(-0.1)
        with pytest.raises(ValueError):
            validate_wind_speed(20.1)

    def test_validate_wind_from_deg_valid(self):
        assert validate_wind_from_deg(0.0) == 0.0
        assert validate_wind_from_deg(270.0) == 270.0
        assert validate_wind_from_deg(359.999) == 359.999

    def test_validate_wind_from_deg_invalid(self):
        with pytest.raises(ValueError):
            validate_wind_from_deg(-0.1)
        with pytest.raises(ValueError):
            validate_wind_from_deg(360.0)

    def test_validate_fuel_moisture_valid(self):
        assert validate_fuel_moisture(0.0) == 0.0
        assert validate_fuel_moisture(0.4) == 0.4
        assert validate_fuel_moisture(1.0) == 1.0

    def test_validate_fuel_moisture_invalid(self):
        with pytest.raises(ValueError):
            validate_fuel_moisture(-0.1)
        with pytest.raises(ValueError):
            validate_fuel_moisture(1.1)

    def test_validate_steps_valid(self):
        assert validate_steps(1) == 1
        assert validate_steps(200) == 200
        assert validate_steps(500) == 500

    def test_validate_steps_invalid(self):
        with pytest.raises(ValueError):
            validate_steps(0)
        with pytest.raises(ValueError):
            validate_steps(501)

    def test_validate_seed_valid(self):
        assert validate_seed(0) == 0
        assert validate_seed(42) == 42
        assert validate_seed(0xFFFFFFFF) == 0xFFFFFFFF

    def test_validate_seed_invalid(self):
        with pytest.raises(ValueError):
            validate_seed(-1)
        with pytest.raises(ValueError):
            validate_seed(0x100000000)  # 2^32


class TestConstants:
    def test_constants_values(self):
        assert INTENSITY_MIN == 1
        assert INTENSITY_MAX == 100
        assert P_BASE_MIN == 0.05
        assert P_BASE_MAX == 0.60
        assert FUEL_MOISTURE_MIN == 0.0
        assert FUEL_MOISTURE_MAX == 1.0
        assert DRYNESS_MULTIPLIER_MAX == 1.3
        assert DRYNESS_MULTIPLIER_MIN == 0.4
        assert MAX_STEPS == 500
