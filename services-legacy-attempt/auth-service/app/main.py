"""
╔══════════════════════════════════════════════════════╗
║           SERVICE 2 — AUTH SERVICE                   ║
║  Port: 8001  (internal, not public-facing)           ║
║  Role: Clerk JWT validation, RBAC, user management.  ║
║  DB:   Owns users, roles, permissions tables.        ║
╚══════════════════════════════════════════════════════╝
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.auth  import router as auth_router
from app.api.users import router as users_router
from app.settings  import settings
from shared.errors import register_exception_handlers

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.getLogger(__name__).info(
        "Auth Service starting — Clerk auth: %s", settings.CLERK_AUTH_ENABLED
    )
    yield


app = FastAPI(
    title="AI Code Review — Auth Service",
    version="1.0.0",
    description="Owns Clerk JWT validation, RBAC, and user/role management.",
    lifespan=lifespan,
)

register_exception_handlers(app)

app.include_router(auth_router)
app.include_router(users_router)


@app.get("/healthz", tags=["observability"])
async def health():
    return {
        "status":  "ok",
        "service": "auth-service",
        "clerk":   settings.CLERK_AUTH_ENABLED,
        "rbac":    settings.RBAC_ENFORCEMENT_ENABLED,
    }
