"""
Core cellular automaton simulation for surface wildfire spread.

Implements `step()` and `run_simulation()` per SIMULATION_SPEC §3 and §7.
All functions are pure (no FastAPI imports, no global RNG).
"""

import numpy as np
from numpy.random import Generator

# State constants per SIMULATION_SPEC §2
U = np.uint8(0)  # unburned
B = np.uint8(1)  # burning
X = np.uint8(2)  # burned

# Neighbor offsets in dr, dc order (8 neighbors, matching reference RNG call order)
NEIGHBORS = [
    (-1, -1),
    (-1, 0),
    (-1, 1),
    (0, -1),
    (0, 1),
    (1, -1),
    (1, 0),
    (1, 1),
]


def step(
    state: np.ndarray,
    fuel: np.ndarray,
    wind_speed: float,
    wind_from_deg: float,
    p_base: float,
    k: float,
    rng: Generator,
) -> np.ndarray:
    """
    Single CA step: burning cells ignite neighbors, then become burned.

    Args:
        state: HxW uint8 array (0=U, 1=B, 2=X)
        fuel: HxW float32 array in [0, 1], edge cells must be 0
        wind_speed: m/s, 0–20
        wind_from_deg: degrees [0, 360), meteorological (from north, clockwise)
        p_base: base ignition probability (0.05–0.60)
        k: wind factor constant (0.1)
        rng: numpy random Generator (passed explicitly, not global)

    Returns:
        New state array after one step.
    """
    # Wind direction: where fire spreads (opposite of where wind comes from)
    # wind_from_deg=270 (from west) → head=90 (toward east)
    head = np.deg2rad((wind_from_deg + 180.0) % 360.0)
    wx = np.sin(head)  # east component
    wy = np.cos(head)  # north component

    burning = state == B
    ignite = np.zeros_like(burning, dtype=bool)

    # Loop over 8 neighbors (dr, dc order preserved for RNG determinism)
    for dr, dc in NEIGHBORS:
        # Cosine of angle between spread direction (dc, -dr) and wind direction (wx, wy)
        # Spread vector: (dc, -dr) because dr>0 is south, dc>0 is east
        # cos θ = (dc*wx + (-dr)*wy) / hypot(dr, dc) = (dc*wx - dr*wy) / hypot(dr, dc)
        dist = np.hypot(dr, dc)
        cos_theta = (dc * wx - dr * wy) / dist

        # Ignition probability for this neighbor direction
        p = np.minimum(1.0, p_base * fuel * np.exp(k * wind_speed * cos_theta))

        # Source burning cells rolled to align with target cells
        src = np.roll(burning, (dr, dc), axis=(0, 1))

        # Ignition: source is burning AND target is unburned AND random < p
        # RNG call order: 8 calls per step, dr then dc order
        ignite |= src & (state == U) & (rng.random(state.shape) < p)

    # Update state: burning → burned, newly ignited → burning
    new_state = state.copy()
    new_state[burning] = X
    new_state[ignite] = B
    return new_state


def run_simulation(
    fuel: np.ndarray,
    ignition_points: list[tuple[int, int]],
    wind_speed: float,
    wind_from_deg: float,
    p_base: float,
    k: float,
    steps: int,
    rng: Generator,
) -> tuple[np.ndarray, int]:
    """
    Run full simulation producing ignition_time array.

    Args:
        fuel: HxW float32 array in [0, 1]
        ignition_points: list of (row, col) tuples for initial fire points
        wind_speed: m/s
        wind_from_deg: degrees [0, 360)
        p_base: base ignition probability
        k: wind factor constant
        steps: max steps (1–500)
        rng: numpy random Generator

    Returns:
        (ignition_time, steps_run)
        - ignition_time: HxW int16 array, -1=never burned, 0=initial, 1..steps_run=step ignited
        - steps_run: actual steps executed (≤ steps)
    """
    H, W = fuel.shape
    state = np.full((H, W), U, dtype=np.uint8)
    ignition_time = np.full((H, W), -1, dtype=np.int16)

    # Set initial ignition points
    for row, col in ignition_points:
        state[row, col] = B
        ignition_time[row, col] = 0

    steps_run = 0
    for t in range(1, steps + 1):
        if not np.any(state == B):
            break

        new_state = step(state, fuel, wind_speed, wind_from_deg, p_base, k, rng)

        # Cells that newly caught fire this step
        newly = (new_state == B) & (state == U)
        ignition_time[newly] = t

        state = new_state
        steps_run = t

    return ignition_time, steps_run


__all__ = [
    "NEIGHBORS",
    "B",
    "U",
    "X",
    "run_simulation",
    "step",
]
