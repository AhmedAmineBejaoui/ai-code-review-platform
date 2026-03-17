from __future__ import annotations

import contextlib
import time
import uuid
from dataclasses import dataclass

from app.settings import settings

try:
    import redis
except Exception:  # pragma: no cover - optional at runtime
    redis = None


@dataclass(frozen=True)
class _Lease:
    key: str
    token: str


class NoOpDistributedLimiter:
    @contextlib.contextmanager
    def acquire(self, timeout_s: int | None = None):
        _ = timeout_s
        yield


class RedisDistributedLimiter:
    def __init__(
        self,
        *,
        namespace: str,
        max_slots: int,
        redis_url: str,
        lease_seconds: int,
        poll_seconds: float,
    ) -> None:
        self._namespace = namespace
        self._max_slots = max(1, max_slots)
        self._lease_seconds = max(1, lease_seconds)
        self._poll_seconds = max(0.01, poll_seconds)
        self._client = redis.from_url(redis_url, decode_responses=True)  # type: ignore[union-attr]

    @contextlib.contextmanager
    def acquire(self, timeout_s: int | None = None):
        lease = self._acquire(timeout_s=timeout_s)
        try:
            yield
        finally:
            self._release(lease)

    def _acquire(self, *, timeout_s: int | None) -> _Lease:
        deadline = time.monotonic() + max(timeout_s or 0, 0) if timeout_s is not None else None
        token = uuid.uuid4().hex
        while True:
            for slot in range(self._max_slots):
                key = f"{self._namespace}:{slot}"
                was_set = bool(self._client.set(key, token, nx=True, ex=self._lease_seconds))
                if was_set:
                    return _Lease(key=key, token=token)
            if deadline is not None and time.monotonic() >= deadline:
                raise TimeoutError(f"Timed out acquiring distributed limiter {self._namespace}")
            time.sleep(self._poll_seconds)

    def _release(self, lease: _Lease) -> None:
        script = """
        if redis.call('get', KEYS[1]) == ARGV[1] then
            return redis.call('del', KEYS[1])
        end
        return 0
        """
        try:
            self._client.eval(script, 1, lease.key, lease.token)
        except Exception:
            current = self._client.get(lease.key)
            if current == lease.token:
                self._client.delete(lease.key)


def build_distributed_limiter(*, namespace: str, max_slots: int):
    redis_url = settings.REDIS_URL or settings.resolved_celery_broker_url
    if not settings.LANGCHAIN_DISTRIBUTED_LIMITER_ENABLED:
        return NoOpDistributedLimiter()
    if not redis_url or not isinstance(redis_url, str) or not redis_url.startswith("redis"):
        return NoOpDistributedLimiter()
    if redis is None:
        return NoOpDistributedLimiter()
    return RedisDistributedLimiter(
        namespace=namespace,
        max_slots=max_slots,
        redis_url=redis_url,
        lease_seconds=settings.LANGCHAIN_DISTRIBUTED_LIMITER_LEASE_SECONDS,
        poll_seconds=settings.LANGCHAIN_DISTRIBUTED_LIMITER_POLL_SECONDS,
    )
