from __future__ import annotations

import pytest

from app.core.langchain_runtime.distributed_limiter import RedisDistributedLimiter


class _FakeRedis:
    def __init__(self) -> None:
        self._values: dict[str, str] = {}

    def set(self, key: str, value: str, *, nx: bool, ex: int) -> bool:  # noqa: ARG002
        if nx and key in self._values:
            return False
        self._values[key] = value
        return True

    def get(self, key: str) -> str | None:
        return self._values.get(key)

    def delete(self, key: str) -> None:
        self._values.pop(key, None)

    def eval(self, script: str, numkeys: int, key: str, token: str) -> int:  # noqa: ARG002
        if self._values.get(key) == token:
            self.delete(key)
            return 1
        return 0


def test_distributed_limiter_enforces_single_slot_and_releases() -> None:
    limiter = RedisDistributedLimiter(
        namespace="langchain:test",
        max_slots=1,
        redis_url="redis://unused",
        lease_seconds=30,
        poll_seconds=0.01,
    )
    limiter._client = _FakeRedis()  # type: ignore[assignment]

    with limiter.acquire(timeout_s=0):
        with pytest.raises(TimeoutError):
            with limiter.acquire(timeout_s=0):
                pass

    with limiter.acquire(timeout_s=0):
        pass
