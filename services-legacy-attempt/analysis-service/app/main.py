"""
╔══════════════════════════════════════════════════════╗
║         SERVICE 3 — ANALYSIS SERVICE                 ║
║  Port: 8002  (internal)                              ║
║  Role: Analysis CRUD, findings, projects,            ║
║        GitHub webhooks, Celery job enqueueing.       ║
║  DB:   Owns analyses, findings, project_profiles,    ║
║        tool_runs, review_outputs tables.             ║
╚══════════════════════════════════════════════════════╝
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.analyses import router as analyses_router
from app.api.webhook  import router as webhook_router
from app.settings     import settings
from shared.errors import register_exception_handlers

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.data.analyses_repo import init_db
    init_db()
    logging.getLogger(__name__).info("Analysis Service started")
    yield


app = FastAPI(
    title="AI Code Review — Analysis Service",
    version="1.0.0",
    description="Manages analysis lifecycle, findings, and project profiles.",
    lifespan=lifespan,
)

register_exception_handlers(app)

app.include_router(analyses_router)
app.include_router(webhook_router)


@app.get("/healthz", tags=["observability"])
async def health():
    return {
        "status":  "ok",
        "service": "analysis-service",
        "queue":   settings.ANALYSIS_QUEUE_NAME,
    }
