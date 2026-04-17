"""
API Gateway — reverse proxy engine
────────────────────────────────────
Forwards every request to the appropriate downstream service,
propagating auth headers, request ID, and the original body/params.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx
from fastapi import Request
from fastapi.responses import Response, StreamingResponse

from app.settings import settings

logger = logging.getLogger(__name__)

# ── Route table : (method_prefix, path_prefix) → service URL ─────────────────
# Order matters — first match wins.
_ROUTE_TABLE: list[tuple[str | None, str, str]] = [
    # method  path-prefix                           service
    (None,    "/v1/auth",                           settings.AUTH_SERVICE_URL),
    (None,    "/v1/users",                          settings.AUTH_SERVICE_URL),
    (None,    "/v1/rbac",                           settings.AUTH_SERVICE_URL),
    (None,    "/v1/admin/users",                    settings.AUTH_SERVICE_URL),
    (None,    "/v1/admin/organizations",            settings.AUTH_SERVICE_URL),

    (None,    "/v1/analyses",                       settings.ANALYSIS_SERVICE_URL),
    (None,    "/v1/projects",                       settings.ANALYSIS_SERVICE_URL),
    (None,    "/v1/statistics",                     settings.ANALYSIS_SERVICE_URL),
    (None,    "/v1/branches",                       settings.ANALYSIS_SERVICE_URL),
    (None,    "/v1/branch-policies",                settings.ANALYSIS_SERVICE_URL),
    (None,    "/v1/branch-protection",              settings.ANALYSIS_SERVICE_URL),
    (None,    "/v1/webhooks",                       settings.ANALYSIS_SERVICE_URL),
    (None,    "/api/v1/project-settings",           settings.ANALYSIS_SERVICE_URL),

    (None,    "/api/v1/reviews",                    settings.REVIEW_SERVICE_URL),
    (None,    "/v1/review",                         settings.REVIEW_SERVICE_URL),

    (None,    "/v1/kb",                             settings.RAG_SERVICE_URL),
    (None,    "/v1/rag",                            settings.RAG_SERVICE_URL),

    (None,    "/v1/admin/integrations",             settings.ANALYSIS_SERVICE_URL),
    (None,    "/v1/admin",                          settings.AUTH_SERVICE_URL),

    (None,    "/v1/notify",                         settings.NOTIFICATION_SERVICE_URL),
    (None,    "/v1/notifications",                  settings.NOTIFICATION_SERVICE_URL),
]


def _resolve_service(method: str, path: str) -> str | None:
    for route_method, prefix, service_url in _ROUTE_TABLE:
        if route_method and route_method.upper() != method.upper():
            continue
        if path.startswith(prefix):
            return service_url
    return None


async def proxy_request(request: Request) -> Response:
    """Forward the request to the correct downstream service."""
    path    = request.url.path
    method  = request.method
    service = _resolve_service(method, path)

    if service is None:
        return Response(
            content='{"error":{"code":"NOT_FOUND","message":"No service handles this route"}}',
            status_code=404,
            media_type="application/json",
        )

    # Build target URL (preserve query string)
    qs     = str(request.url.query)
    target = f"{service}{path}" + (f"?{qs}" if qs else "")

    # Build headers — forward originals + inject principal headers
    headers: dict[str, str] = dict(request.headers)
    headers.pop("host", None)           # prevent host leakage
    headers.pop("content-length", None) # httpx recalculates this

    # Inject principal headers added by AuthMiddleware
    principal_headers: dict[str, str] = getattr(request.state, "principal_headers", {})
    headers.update(principal_headers)

    # Read body
    body = await request.body()

    timeout = httpx.Timeout(
        connect=5.0,
        read=settings.PROXY_READ_TIMEOUT_S,
        write=settings.PROXY_WRITE_TIMEOUT_S,
        pool=5.0,
    )

    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
            upstream = await client.request(
                method=method,
                url=target,
                headers=headers,
                content=body,
            )
    except httpx.TimeoutException:
        logger.error("Timeout proxying %s %s → %s", method, path, service)
        return Response(
            content='{"error":{"code":"UPSTREAM_TIMEOUT","message":"Upstream service timed out"}}',
            status_code=504,
            media_type="application/json",
        )
    except httpx.ConnectError:
        logger.error("Cannot connect to service %s for %s %s", service, method, path)
        return Response(
            content='{"error":{"code":"SERVICE_UNAVAILABLE","message":"Downstream service unavailable"}}',
            status_code=503,
            media_type="application/json",
        )
    except Exception as exc:
        logger.exception("Proxy error for %s %s: %s", method, path, exc)
        return Response(
            content='{"error":{"code":"PROXY_ERROR","message":"Internal proxy error"}}',
            status_code=500,
            media_type="application/json",
        )

    # Stream response back to client
    response_headers = dict(upstream.headers)
    response_headers.pop("content-encoding", None)  # httpx decompresses automatically
    response_headers.pop("transfer-encoding", None)

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=response_headers,
        media_type=upstream.headers.get("content-type", "application/json"),
    )
