"""Base64 encoding/decoding for ignition_time array (int16 little-endian)."""

import base64

import numpy as np


def encode_ignition_time(arr: np.ndarray) -> str:
    """
    Encode ignition_time array to base64 string.

    Args:
        arr: 2D array of shape (H, W), dtype int16, row-major.
             Values: step when cell ignited; ignition points = 0; -1 = never burned.

    Returns:
        Base64-encoded string (standard, with padding).
    """
    if arr.dtype != np.int16:
        arr = arr.astype(np.int16, copy=False)
    # Ensure contiguous little-endian int16
    arr_le = np.ascontiguousarray(arr, dtype="<i2")
    return base64.b64encode(arr_le.tobytes()).decode("ascii")


def decode_ignition_time(b64: str, height: int, width: int) -> np.ndarray:
    """
    Decode base64 string to ignition_time array.

    Args:
        b64: Base64-encoded string (standard, with padding).
        height: Expected height (H) of the array.
        width: Expected width (W) of the array.

    Returns:
        2D array of shape (height, width), dtype int16, row-major.
    """
    data = base64.b64decode(b64)
    expected_len = height * width * 2  # int16 = 2 bytes
    if len(data) != expected_len:
        raise ValueError(
            f"Decoded length {len(data)} != expected {expected_len} (H={height}, W={width})"
        )
    arr = np.frombuffer(data, dtype="<i2").reshape(height, width)
    return arr
