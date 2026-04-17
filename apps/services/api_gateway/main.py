"""API gateway FastAPI app.

Responsibilities (step 1):
* Accept every request on every path (catch-all route).
* Resolve upstream via :mod:`routing`.
* Forward via :mod:`proxy`.
* Preserve CORS and Authorization headers (Clerk JWT).

Local ``/healthz`` is served directly so load balancers never hit the
legacy monolith just for a liveness probe.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from common.errors import register_exception_handlers
from common.http import close_shared_http_client, get_shared_http_client
from common.logging import configure_logging

from .proxy import proxy
from .routing import Router
from .settings import get_gateway_settings

settings = get_gateway_settings()
log = configure_logging(settings.service_name, level=settings.log_level)
router = Router(settings)


@asynccontextmanager
async def _lifespan(_: FastAPI) -> AsyncIterator[None]:
    await get_shared_http_client(timeout=settings.upstream_timeout_seconds)
    log.info(
        "api-gateway started on :%d — legacy backend target: %s",
        settings.gateway_port,
        settings.legacy_backend_url,
    )
    try:
        yield
    finally:
        await close_shared_http_client()
        log.info("api-gateway stopped")


def create_app() -> FastAPI:
    app = FastAPI(
        title="API Gateway",
        version="0.1.0",
        docs_url=None,           # docs live on the legacy backend today
        redoc_url=None,
        openapi_url=None,
        lifespan=_lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=[
            "Accept",
            "Accept-Language",
            "Content-Type",
            "Content-Language",
            "Authorization",
            "X-API-Key",
            "X-Requested-With",
        ],
    )

    register_exception_handlers(app)

    # ---- Local endpoints -------------------------------------------------
    @app.get("/__gateway/healthz", include_in_schema=False)
    async def gateway_healthz() -> JSONResponse:
        return JSONResponse({"status": "ok", "service": settings.service_name})

    @app.get("/__gateway/routes", include_in_schema=False)
    async def gateway_routes() -> JSONResponse:
        """Introspection: which prefix → which upstream right now."""
        from .routing import ROUTES
        return JSONResponse(
            {
                "routes": [
                    {
                        "prefix": r.prefix,
                        "target": r.target.value,
                        "url": router.resolve(r.prefix)[1],
                        "description": r.description,
                    }
                    for r in ROUTES
                ]
            }
        )

    # ---- Catch-all proxy -------------------------------------------------
    @app.api_route(
        "/{full_path:path}",
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    )
    async def catch_all(request: Request, full_path: str) -> Response:  # noqa: ARG001
        _, upstream = router.resolve(request.url.path)
        client = await get_shared_http_client(timeout=settings.upstream_timeout_seconds)
        return await proxy(request, upstream, client)

    return app


app = create_app()
