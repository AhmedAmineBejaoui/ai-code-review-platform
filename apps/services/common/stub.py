"""Tiny factory for *stub* service apps.

Each not-yet-extracted service uses this to expose `/healthz` and `/readyz`
so the gateway and docker-compose can verify it's alive. Once a service is
extracted, it replaces `create_stub_app()` with its own FastAPI factory.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from .errors import register_exception_handlers
from .logging import configure_logging


def create_stub_app(service_name: str, *, version: str = "0.1.0") -> FastAPI:
    log = configure_logging(service_name)
    app = FastAPI(
        title=service_name,
        version=version,
        docs_url="/docs",
        openapi_url="/openapi.json",
    )
    register_exception_handlers(app)

    @app.get("/healthz", tags=["health"])
    async def healthz() -> JSONResponse:
        return JSONResponse({"status": "ok", "service": service_name})

    @app.get("/readyz", tags=["health"])
    async def readyz() -> JSONResponse:
        # Stubs have no dependencies to check yet.
        return JSONResponse({"status": "ready", "service": service_name})

    log.info("%s stub app created", service_name)
    return app
