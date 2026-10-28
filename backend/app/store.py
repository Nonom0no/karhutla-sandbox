"""In-memory result store with TTL and entry limit."""

import time
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any


@dataclass
class StoreEntry:
    """Single stored simulation result with creation timestamp."""

    value: Any
    created_at: float


class ResultStore:
    """
    In-memory store for simulation results with TTL and max-entry eviction.

    Args:
        ttl_seconds: Time-to-live for entries in seconds (default 1800 = 30 min).
        max_entries: Maximum number of entries before oldest is evicted (default 100).
        time_fn: Callable returning current Unix timestamp (default time.time).
                 Inject a fake clock for deterministic tests.
    """

    def __init__(
        self,
        ttl_seconds: float = 1800.0,
        max_entries: int = 100,
        time_fn: Callable[[], float] = time.time,
    ) -> None:
        self._ttl = ttl_seconds
        self._max_entries = max_entries
        self._time_fn = time_fn
        self._store: dict[str, StoreEntry] = {}

    def get(self, key: str) -> Any | None:
        """Retrieve value if not expired, else delete and return None."""
        self._cleanup_expired()
        entry = self._store.get(key)
        if entry is None:
            return None
        return entry.value

    def set(self, key: str, value: Any) -> None:
        """Store value with current timestamp. Evicts oldest if at capacity."""
        self._cleanup_expired()
        if len(self._store) >= self._max_entries and key not in self._store:
            self._evict_oldest()
        self._store[key] = StoreEntry(value=value, created_at=self._time_fn())

    def delete(self, key: str) -> bool:
        """Delete entry by key. Returns True if existed."""
        if key in self._store:
            del self._store[key]
            return True
        return False

    def cleanup_expired(self) -> int:
        """Remove all expired entries. Returns count removed."""
        return self._cleanup_expired()

    def _cleanup_expired(self) -> int:
        now = self._time_fn()
        expired_keys = [k for k, e in self._store.items() if now - e.created_at > self._ttl]
        for k in expired_keys:
            del self._store[k]
        return len(expired_keys)

    def _evict_oldest(self) -> None:
        if not self._store:
            return
        oldest_key = min(self._store.keys(), key=lambda k: self._store[k].created_at)
        del self._store[oldest_key]

    def generate_key(self) -> str:
        """Generate a new unique simulation ID."""
        return str(uuid.uuid4())

    def __len__(self) -> int:
        self._cleanup_expired()
        return len(self._store)

    def __contains__(self, key: str) -> bool:
        return self.get(key) is not None


# Global default instance for convenience
default_store = ResultStore()
