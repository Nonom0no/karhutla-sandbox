"""Tests for the in-memory result store."""

import pytest

from app.store import ResultStore


class TestResultStore:
    """Test ResultStore basic operations and TTL/eviction behavior."""

    def test_get_set_delete(self) -> None:
        store = ResultStore()
        key = "test-key"
        value = {"data": "simulation-result"}

        assert store.get(key) is None
        store.set(key, value)
        assert store.get(key) == value
        assert store.delete(key) is True
        assert store.get(key) is None
        assert store.delete(key) is False

    def test_ttl_expiration(self) -> None:
        """Entries expire after TTL seconds."""
        clock = [1000.0]
        store = ResultStore(ttl_seconds=10.0, time_fn=lambda: clock[0])

        store.set("key1", "value1")
        assert store.get("key1") == "value1"

        # Advance time within TTL
        clock[0] = 1005.0
        assert store.get("key1") == "value1"

        # Advance past TTL
        clock[0] = 1011.0
        assert store.get("key1") is None

    def test_cleanup_expired(self) -> None:
        """cleanup_expired removes all expired entries and returns count."""
        clock = [1000.0]
        store = ResultStore(ttl_seconds=10.0, time_fn=lambda: clock[0])

        store.set("key1", "value1")
        store.set("key2", "value2")
        store.set("key3", "value3")

        clock[0] = 1015.0  # all expired
        removed = store.cleanup_expired()
        assert removed == 3
        assert len(store) == 0

        # Re-add one, advance partially
        clock[0] = 1000.0
        store.set("key4", "value4")
        clock[0] = 1005.0
        removed = store.cleanup_expired()
        assert removed == 0
        assert store.get("key4") == "value4"

    def test_max_entries_evicts_oldest(self) -> None:
        """When at capacity, adding new entry evicts oldest."""
        clock = [1000.0]
        store = ResultStore(max_entries=3, time_fn=lambda: clock[0])

        store.set("key1", "v1")
        clock[0] = 1001.0
        store.set("key2", "v2")
        clock[0] = 1002.0
        store.set("key3", "v3")
        assert len(store) == 3

        # Adding 4th should evict key1 (oldest)
        clock[0] = 1003.0
        store.set("key4", "v4")
        assert len(store) == 3
        assert store.get("key1") is None
        assert store.get("key2") == "v2"
        assert store.get("key3") == "v3"
        assert store.get("key4") == "v4"

    def test_update_existing_key_does_not_evict(self) -> None:
        """Updating existing key at capacity should not evict others."""
        clock = [1000.0]
        store = ResultStore(max_entries=2, time_fn=lambda: clock[0])

        store.set("key1", "v1")
        clock[0] = 1001.0
        store.set("key2", "v2")
        assert len(store) == 2

        # Update key1 - should not evict key2
        clock[0] = 1002.0
        store.set("key1", "v1-updated")
        assert len(store) == 2
        assert store.get("key1") == "v1-updated"
        assert store.get("key2") == "v2"

    def test_generate_key_returns_uuid(self) -> None:
        """generate_key returns a valid UUID string."""
        store = ResultStore()
        key1 = store.generate_key()
        key2 = store.generate_key()

        # Both should be valid UUIDs
        import uuid

        uuid.UUID(key1)
        uuid.UUID(key2)
        # Should be different
        assert key1 != key2

    def test_len_and_contains(self) -> None:
        """__len__ and __contains__ respect TTL."""
        clock = [1000.0]
        store = ResultStore(ttl_seconds=10.0, time_fn=lambda: clock[0])

        assert len(store) == 0
        assert "key1" not in store

        store.set("key1", "v1")
        assert len(store) == 1
        assert "key1" in store

        clock[0] = 1015.0  # expired
        assert len(store) == 0
        assert "key1" not in store

    def test_default_ttl_and_max_entries(self) -> None:
        """Default TTL=1800s, max_entries=100."""
        store = ResultStore()
        assert store._ttl == 1800.0
        assert store._max_entries == 100

    def test_injectable_time_fn(self) -> None:
        """Custom time_fn is used for all time operations."""
        call_count = [0]
        clock = [0.0]

        def fake_time() -> float:
            call_count[0] += 1
            return clock[0]

        store = ResultStore(ttl_seconds=10.0, time_fn=fake_time)
        store.set("key", "value")

        # get() should call time_fn
        initial_calls = call_count[0]
        store.get("key")
        assert call_count[0] > initial_calls

        # cleanup_expired() should call time_fn
        initial_calls = call_count[0]
        store.cleanup_expired()
        assert call_count[0] > initial_calls

    def test_eviction_order_fifo_by_creation_time(self) -> None:
        """Oldest by creation time is evicted first, not by key order."""
        clock = [1000.0]
        store = ResultStore(max_entries=2, time_fn=lambda: clock[0])

        store.set("z-last", "v1")
        clock[0] = 1001.0
        store.set("a-first", "v2")
        clock[0] = 1002.0
        store.set("m-middle", "v3")  # should evict z-last (oldest)

        assert store.get("z-last") is None
        assert store.get("a-first") == "v2"
        assert store.get("m-middle") == "v3"

    def test_ttl_and_max_entries_together(self) -> None:
        """Expired entries don't count toward max_entries."""
        clock = [1000.0]
        store = ResultStore(ttl_seconds=10.0, max_entries=2, time_fn=lambda: clock[0])

        store.set("key1", "v1")
        clock[0] = 1001.0
        store.set("key2", "v2")
        assert len(store) == 2

        # Expire key1 only (key1 created at 1000, expired at >1010; key2 at 1001, expired at >1011)
        clock[0] = 1011.0
        store.cleanup_expired()
        assert len(store) == 1
        assert store.get("key1") is None
        assert store.get("key2") == "v2"

        # Add new BEFORE key2 expires - should not evict key2 since we have space
        clock[0] = 1010.5  # key2 still valid (diff=9.5 < 10)
        store.set("key3", "v3")
        assert len(store) == 2
        assert store.get("key2") == "v2"
        assert store.get("key3") == "v3"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
