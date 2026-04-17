"""Shared HTTP primitives for inter-service and gateway traffic.

One long-lived ``httpx.AsyncClient`` per process is reused across requests.
Services should call :func:`get_shared_http_client` via FastAPI lifespan.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

import httpx

# Module-level cache — one client per process (uvicorn worker).
_CLIENT: httpx.AsyncClient | None = None


async def get_shared_http_client(timeout: float = 60.0) -> httpx.AsyncClient:
    """Return a singleton AsyncClient, instantiating on first call."""
    global _CLIENT
    if _CLIENT is None or _CLIENT.is_closed:
        _CLIENT = httpx.AsyncClient(timeout=httpx.Timeout(timeout, connect=5.0))
    return _CLIENT


async def close_shared_http_client() -> None:
    global _CLIENT
    if _CLIENT is not None and not _CLIENT.is_closed:
        await _CLIENT.aclose()
    _CLIENT = None


@asynccontextmanager
async def http_lifespan(timeout: float = 60.0) -> AsyncIterator[httpx.AsyncClient]:
    """FastAPI lifespan helper: yields a ready client, closes it on shutdown."""
    client = await get_shared_http_client(timeout=timeout)
    try:
        yield client
    finally:
        await close_shared_http_client()
