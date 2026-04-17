"""
╔══════════════════════════════════════════════════════╗
║            SERVICE 1 — API GATEWAY                   ║
║  Port: 8000                                          ║
║  Role: Single entry point for all external traffic.  ║
║        Validates JWT via Auth Service.               ║
║        Routes requests to downstream services.       ║
╚══════════════════════════════════════════════════════╝
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.middleware.auth import AuthMiddleware
from app.proxy import proxy_request
from app.settings import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("API Gateway starting — listening on :%d", settings.GATEWAY_PORT)
    logger.info("Auth validation: %s", "ENABLED" if settings.AUTH_VALIDATION_ENABLED else "DISABLED (dev)")
    yield
    logger.info("API Gateway shutting down")


app = FastAPI(
    title="AI Code Review — API Gateway",
    version="1.0.0",
    description="Central entry point. Routes requests to downstream microservices.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Middleware stack ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Accept", "Accept-Language", "Content-Type", "Authorization",
                   "X-API-Key", "X-Requested-With", "X-Request-ID"],
    expose_headers=["Content-Type", "X-Total-Count", "X-Request-ID"],
    max_age=3600,
)
app.add_middleware(AuthMiddleware)

# ── Prometheus ────────────────────────────────────────────────────────────────
Instrumentator(
    should_group_status_codes=True,
    excluded_handlers=["/metrics", "/healthz"],
).instrument(app).expose(app, include_in_schema=False)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/healthz", tags=["observability"])
async def health():
    return {
        "status": "ok",
        "service": "api-gateway",
        "downstream": {
            "auth":         settings.AUTH_SERVICE_URL,
            "analysis":     settings.ANALYSIS_SERVICE_URL,
            "review":       settings.REVIEW_SERVICE_URL,
            "rag":          settings.RAG_SERVICE_URL,
            "notification": settings.NOTIFICATION_SERVICE_URL,
        },
    }


# ── Catch-all proxy ───────────────────────────────────────────────────────────
# Every route not matched above is proxied to the appropriate service.
@app.api_route(
    "/{full_path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    include_in_schema=False,
)
async def catch_all(request: Request, full_path: str):  # noqa: ARG001
    return await proxy_request(request)
