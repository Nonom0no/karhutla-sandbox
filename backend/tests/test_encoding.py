"""Tests for ignition_time encoding/decoding (T-SIM-11)."""

import base64

import numpy as np
import pytest

from app.sim.encoding import decode_ignition_time, encode_ignition_time


class TestEncoding:
    def test_round_trip_preserves_values(self):
        """T-SIM-11: encode -> decode returns original array."""
        H, W = 10, 12
        # Create array with various values including -1, 0, 500
        arr = np.full((H, W), -1, dtype=np.int16)
        arr[0, 0] = 0  # ignition point
        arr[1, 1] = 1  # step 1
        arr[2, 2] = 500  # large step value
        arr[5, 5] = 255  # another value
        arr[9, 11] = -1  # never burned

        encoded = encode_ignition_time(arr)
        decoded = decode_ignition_time(encoded, H, W)

        np.testing.assert_array_equal(decoded, arr)

    def test_byte_length_matches_h_w_2(self):
        """T-SIM-11: byte length = H * W * 2."""
        H, W = 200, 200
        arr = np.zeros((H, W), dtype=np.int16)
        encoded = encode_ignition_time(arr)

        # Base64 length: ceil(n_bytes / 3) * 4
        n_bytes = len(base64.b64decode(encoded))
        assert n_bytes == H * W * 2

    def test_edge_values_preserved(self):
        """Values -1, 0, 500 preserved through round-trip."""
        H, W = 5, 5
        arr = np.array(
            [
                [-1, 0, 1, 2, 3],
                [10, 50, 100, 200, 500],
                [-1, -1, 0, -1, 10],
                [255, 256, 300, 400, 500],
                [-1, -1, -1, -1, -1],
            ],
            dtype=np.int16,
        )

        encoded = encode_ignition_time(arr)
        decoded = decode_ignition_time(encoded, H, W)

        np.testing.assert_array_equal(decoded, arr)
        # Explicit checks for the specified values
        assert decoded[0, 0] == -1
        assert decoded[0, 1] == 0
        assert decoded[1, 4] == 500

    def test_different_shapes(self):
        """Encoding works for various shapes."""
        for H, W in [(1, 1), (10, 10), (200, 200), (100, 50), (50, 100)]:
            arr = np.random.default_rng(42).integers(-1, 500, size=(H, W), dtype=np.int16)
            encoded = encode_ignition_time(arr)
            decoded = decode_ignition_time(encoded, H, W)
            np.testing.assert_array_equal(decoded, arr)

    def test_non_contiguous_input(self):
        """Non-contiguous arrays are handled correctly."""
        arr = np.zeros((10, 10), dtype=np.int16)
        arr[::2, ::2] = 5
        # Create a truly non-contiguous view by transposing
        arr_t = arr.T
        assert not arr_t.flags["C_CONTIGUOUS"]

        encoded = encode_ignition_time(arr_t)
        decoded = decode_ignition_time(encoded, 10, 10)

        np.testing.assert_array_equal(decoded, arr_t)

    def test_wrong_dimensions_raises(self):
        """decode_ignition_time raises on wrong byte length."""
        arr = np.zeros((10, 10), dtype=np.int16)
        encoded = encode_ignition_time(arr)

        # Wrong height
        with pytest.raises(ValueError, match="Decoded length"):
            decode_ignition_time(encoded, 9, 10)
        # Wrong width
        with pytest.raises(ValueError, match="Decoded length"):
            decode_ignition_time(encoded, 10, 9)

    def test_dtype_conversion(self):
        """Input arrays with different dtypes are converted to int16."""
        for dtype in [np.int32, np.int64, np.float32, np.float64]:
            arr = np.array([[0, 1], [-1, 500]], dtype=dtype)
            encoded = encode_ignition_time(arr)
            decoded = decode_ignition_time(encoded, 2, 2)
            assert decoded.dtype == np.int16
            np.testing.assert_array_equal(decoded, arr.astype(np.int16))

    def test_base64_padding_preserved(self):
        """Output uses standard base64 with padding."""
        arr = np.zeros((1, 1), dtype=np.int16)
        encoded = encode_ignition_time(arr)
        # Standard base64 always has length multiple of 4
        assert len(encoded) % 4 == 0
        # Can be decoded by standard library
        import base64

        base64.b64decode(encoded)  # Should not raise


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
