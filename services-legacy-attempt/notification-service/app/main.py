"""
╔══════════════════════════════════════════════════════╗
║       SERVICE 7 — NOTIFICATION SERVICE               ║
║  Port: 8006  (internal)                              ║
║  Role: Dispatches notifications via email, Slack,    ║
║        Teams, WebPush. Best-effort, fire-and-forget. ║
║  DB:   Owns notifications table.                     ║
╚══════════════════════════════════════════════════════╝
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.notify import router as notify_router
from app.settings   import settings
from shared.errors import register_exception_handlers

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.getLogger(__name__).info(
        "Notification Service started — email=%s slack=%s teams=%s webpush=%s",
        settings.EMAIL_ENABLED, settings.SLACK_ENABLED,
        settings.TEAMS_ENABLED, settings.WEB_PUSH_ENABLED,
    )
    yield


app = FastAPI(
    title="AI Code Review — Notification Service",
    version="1.0.0",
    description="Dispatches analysis/review notifications via email, Slack, Teams, WebPush.",
    lifespan=lifespan,
)

register_exception_handlers(app)
app.include_router(notify_router)


@app.get("/healthz", tags=["observability"])
async def health():
    return {
        "status":  "ok",
        "service": "notification-service",
        "channels": {
            "email":   settings.EMAIL_ENABLED,
            "slack":   settings.SLACK_ENABLED,
            "teams":   settings.TEAMS_ENABLED,
            "webpush": settings.WEB_PUSH_ENABLED,
        },
    }
