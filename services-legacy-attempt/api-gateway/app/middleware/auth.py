"""
API Gateway — auth middleware
──────────────────────────────
Validates the incoming Bearer JWT by calling the Auth Service.
On success, injects X-Principal-* headers that downstream services trust.
"""
from __future__ import annotations

import json
import logging

import httpx
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.settings import settings

logger = logging.getLogger(__name__)

# Routes that do NOT require authentication
_PUBLIC_PATHS = {
    "/healthz",
    "/__routes",
    "/metrics",
    "/docs",
    "/openapi.json",
    "/redoc",
}

# Routes for GitHub webhooks (authenticated via HMAC, not JWT)
_WEBHOOK_PREFIX = "/v1/webhooks/"


class AuthMiddleware(BaseHTTPMiddleware):
    """
    1. Skip auth for public routes and webhooks.
    2. Extract Bearer token from Authorization header.
    3. Call Auth Service POST /v1/auth/validate to get Principal.
    4. Inject X-Principal-Id, X-Principal-Email, X-Principal-Roles
       headers for downstream services.
    5. Return 401 if token is missing/invalid (when AUTH_VALIDATION_ENABLED).
    """

    async def dispatch(self, request: Request, call_next: Any) -> Response:
        path = request.url.path

        # ── skip public + webhook routes ──────────────────────────────────────
        if path in _PUBLIC_PATHS or path.startswith(_WEBHOOK_PREFIX):
            return await call_next(request)

        if not settings.AUTH_VALIDATION_ENABLED:
            # Dev mode: inject a fake admin principal
            request.state.principal = _dev_principal()
            _inject_principal_headers(request, request.state.principal)
            return await call_next(request)

        # ── extract Bearer token ──────────────────────────────────────────────
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return _unauthorized("Missing or malformed Authorization header")

        token = auth_header.removeprefix("Bearer ").strip()

        # ── validate with Auth Service ────────────────────────────────────────
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(
                    f"{settings.AUTH_SERVICE_URL}/v1/auth/validate",
                    json={"token": token},
                    headers={"X-Request-ID": request.headers.get("X-Request-ID", "")},
                )
            if resp.status_code != 200:
                return _unauthorized("Invalid or expired token")
            principal = resp.json()
        except httpx.TimeoutException:
            logger.error("Auth service timeout during token validation")
            return Response(
                content=json.dumps({"error": {"code": "AUTH_SERVICE_UNAVAILABLE", "message": "Auth service timeout"}}),
                status_code=503,
                media_type="application/json",
            )
        except Exception as exc:
            logger.error("Auth service error: %s", exc)
            return _unauthorized("Auth service unreachable")

        # ── inject principal into headers for downstream services ─────────────
        request.state.principal = principal
        _inject_principal_headers(request, principal)
        return await call_next(request)


def _inject_principal_headers(request: Request, principal: dict) -> None:
    """Add X-Principal-* headers so downstream services can read the principal."""
    # Starlette request headers are immutable; we use request.state and let
    # the proxy layer forward these headers explicitly.
    request.state.principal_headers = {
        "X-Principal-Id":          principal.get("user_id", ""),
        "X-Principal-Email":        principal.get("email", ""),
        "X-Principal-Display-Name": principal.get("display_name", "") or "",
        "X-Principal-Roles":        json.dumps(principal.get("roles", [])),
        "X-Principal-Permissions":  json.dumps(principal.get("permissions", [])),
        "X-Principal-Org-Id":       principal.get("org_id", "") or "",
    }


def _unauthorized(message: str) -> Response:
    return Response(
        content=json.dumps({"error": {"code": "UNAUTHORIZED", "message": message}}),
        status_code=401,
        media_type="application/json",
    )


def _dev_principal() -> dict:
    return {
        "user_id":      "dev_user",
        "email":        "dev@local.test",
        "display_name": "Dev Admin",
        "roles":        ["admin"],
        "permissions":  ["analyses.read", "analyses.create", "analyses.write"],
        "org_id":       None,
    }


# fix missing Any import
from typing import Any  # noqa: E402
