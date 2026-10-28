"""
Simulation constants and parameter mapping functions.

All canonical values per SIMULATION_SPEC §5.
"""

# Grid constants
GRID_HEIGHT = 200
GRID_WIDTH = 200
CELL_SIZE_M = 30
MAX_STEPS = 500

# Wind factor constant (not exposed via API)
K_WIND = 0.1

# Fire intensity mapping: integer 1–100 → p_base in [0.05, 0.60]
# p_base = 0.05 + (fire_intensity - 1) / 99 * 0.55
INTENSITY_MIN = 1
INTENSITY_MAX = 100
P_BASE_MIN = 0.05
P_BASE_MAX = 0.60

# Fuel moisture mapping: float 0–1 → dryness_multiplier in [1.3, 0.4]
# dryness_multiplier = 1.3 - 0.9 * fuel_moisture
FUEL_MOISTURE_MIN = 0.0
FUEL_MOISTURE_MAX = 1.0
DRYNESS_MULTIPLIER_MAX = 1.3  # at fuel_moisture = 0
DRYNESS_MULTIPLIER_MIN = 0.4  # at fuel_moisture = 1


def intensity_to_p_base(fire_intensity: int) -> float:
    """
    Map fire_intensity (1–100) to p_base (0.05–0.60).

    Formula: p_base = 0.05 + (fire_intensity - 1) / 99 * 0.55
    """
    if not (INTENSITY_MIN <= fire_intensity <= INTENSITY_MAX):
        raise ValueError(f"fire_intensity must be in [{INTENSITY_MIN}, {INTENSITY_MAX}]")
    return P_BASE_MIN + (fire_intensity - 1) / (INTENSITY_MAX - 1) * (P_BASE_MAX - P_BASE_MIN)


def dryness_multiplier(fuel_moisture: float) -> float:
    """
    Map fuel_moisture (0–1) to dryness multiplier (1.3–0.4).

    Formula: dryness_multiplier = 1.3 - 0.9 * fuel_moisture
    """
    if not (FUEL_MOISTURE_MIN <= fuel_moisture <= FUEL_MOISTURE_MAX):
        raise ValueError(f"fuel_moisture must be in [{FUEL_MOISTURE_MIN}, {FUEL_MOISTURE_MAX}]")
    return (
        DRYNESS_MULTIPLIER_MAX - (DRYNESS_MULTIPLIER_MAX - DRYNESS_MULTIPLIER_MIN) * fuel_moisture
    )


def validate_fire_intensity(value: int) -> int:
    """Validate fire_intensity is in range 1–100."""
    if not (INTENSITY_MIN <= value <= INTENSITY_MAX):
        raise ValueError(f"fire_intensity must be in [{INTENSITY_MIN}, {INTENSITY_MAX}]")
    return value


def validate_wind_speed(value: float) -> float:
    """Validate wind_speed is in range 0–20."""
    if not (0.0 <= value <= 20.0):
        raise ValueError("wind_speed must be in [0, 20]")
    return value


def validate_wind_from_deg(value: float) -> float:
    """Validate wind_from_deg is in range [0, 360)."""
    if not (0.0 <= value < 360.0):
        raise ValueError("wind_from_deg must be in [0, 360)")
    return value


def validate_fuel_moisture(value: float) -> float:
    """Validate fuel_moisture is in range 0–1."""
    if not (FUEL_MOISTURE_MIN <= value <= FUEL_MOISTURE_MAX):
        raise ValueError(f"fuel_moisture must be in [{FUEL_MOISTURE_MIN}, {FUEL_MOISTURE_MAX}]")
    return value


def validate_steps(value: int) -> int:
    """Validate steps is in range 1–500."""
    if not (1 <= value <= MAX_STEPS):
        raise ValueError(f"steps must be in [1, {MAX_STEPS}]")
    return value


def validate_seed(value: int) -> int:
    """Validate seed is in range 0–4294967295 (uint32)."""
    if not (0 <= value <= 0xFFFFFFFF):
        raise ValueError("seed must be in [0, 4294967295]")
    return value


# For convenience, expose derived constants as module attributes
__all__ = [
    "CELL_SIZE_M",
    "DRYNESS_MULTIPLIER_MAX",
    "DRYNESS_MULTIPLIER_MIN",
    "FUEL_MOISTURE_MAX",
    "FUEL_MOISTURE_MIN",
    "GRID_HEIGHT",
    "GRID_WIDTH",
    "INTENSITY_MAX",
    "INTENSITY_MIN",
    "K_WIND",
    "MAX_STEPS",
    "P_BASE_MAX",
    "P_BASE_MIN",
    "dryness_multiplier",
    "intensity_to_p_base",
    "validate_fire_intensity",
    "validate_fuel_moisture",
    "validate_seed",
    "validate_steps",
    "validate_wind_from_deg",
    "validate_wind_speed",
]
