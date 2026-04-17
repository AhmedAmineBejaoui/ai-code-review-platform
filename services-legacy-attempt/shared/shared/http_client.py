"""
shared/http_client.py
──────────────────────
Async HTTP client for service-to-service communication.
All inter-service calls use this client so timeouts, retries,
and tracing headers are applied consistently.

Usage:
    from shared.http_client import ServiceClient
    client = ServiceClient("http://auth-service:8001")
    result = await client.get("/v1/auth/validate", headers={"Authorization": f"Bearer {token}"})
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# Default timeouts (seconds)
_CONNECT_TIMEOUT = 5.0
_READ_TIMEOUT    = 15.0
_WRITE_TIMEOUT   = 15.0


class ServiceClientError(Exception):
    def __init__(self, status_code: int, code: str, message: str) -> None:
        self.status_code = status_code
        self.code        = code
        self.message     = message
        super().__init__(f"[{status_code}] {code}: {message}")


class ServiceClient:
    """
    Thin async wrapper around httpx for service-to-service calls.
    Propagates X-Request-ID for distributed tracing.
    Raises ServiceClientError on non-2xx responses.
    """

    def __init__(
        self,
        base_url: str,
        *,
        connect_timeout: float = _CONNECT_TIMEOUT,
        read_timeout: float    = _READ_TIMEOUT,
        write_timeout: float   = _WRITE_TIMEOUT,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout  = httpx.Timeout(
            connect=connect_timeout,
            read=read_timeout,
            write=write_timeout,
            pool=connect_timeout,
        )

    # ── low-level ─────────────────────────────────────────────────────────────

    async def _request(
        self,
        method: str,
        path: str,
        *,
        headers: dict[str, str] | None = None,
        params: dict[str, Any] | None  = None,
        json: Any                       = None,
        request_id: str | None          = None,
    ) -> Any:
        url = f"{self._base_url}{path}"
        req_headers: dict[str, str] = headers or {}
        if request_id:
            req_headers["X-Request-ID"] = request_id

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.request(
                method,
                url,
                headers=req_headers,
                params=params,
                json=json,
            )

        if not response.is_success:
            try:
                body = response.json()
                err  = body.get("error", {})
                code = err.get("code", "UPSTREAM_ERROR")
                msg  = err.get("message", response.text)
            except Exception:
                code = "UPSTREAM_ERROR"
                msg  = response.text
            logger.warning("Service call failed: %s %s → %s %s", method, url, response.status_code, msg)
            raise ServiceClientError(response.status_code, code, msg)

        if response.status_code == 204 or not response.content:
            return None
        return response.json()

    # ── convenience ───────────────────────────────────────────────────────────

    async def get(self, path: str, *, headers: dict[str, str] | None = None,
                  params: dict[str, Any] | None = None, request_id: str | None = None) -> Any:
        return await self._request("GET", path, headers=headers, params=params, request_id=request_id)

    async def post(self, path: str, *, json: Any = None, headers: dict[str, str] | None = None,
                   request_id: str | None = None) -> Any:
        return await self._request("POST", path, json=json, headers=headers, request_id=request_id)

    async def patch(self, path: str, *, json: Any = None, headers: dict[str, str] | None = None,
                    request_id: str | None = None) -> Any:
        return await self._request("PATCH", path, json=json, headers=headers, request_id=request_id)

    async def delete(self, path: str, *, headers: dict[str, str] | None = None,
                     request_id: str | None = None) -> Any:
        return await self._request("DELETE", path, headers=headers, request_id=request_id)
