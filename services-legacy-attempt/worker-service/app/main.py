"""
╔══════════════════════════════════════════════════════╗
║         SERVICE 4 — WORKER SERVICE                   ║
║  Port: 8003  (health check only)                     ║
║  Role: Runs Celery workers. Executes full analysis   ║
║        pipeline. Calls Review + RAG Services.        ║
║  Start: celery -A app.celery_app worker              ║
╚══════════════════════════════════════════════════════╝
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.getLogger(__name__).info("Worker Service health endpoint started")
    yield


app = FastAPI(
    title="AI Code Review — Worker Service",
    version="1.0.0",
    description="Celery worker health endpoint. The actual work runs in the Celery process.",
    lifespan=lifespan,
)


@app.get("/healthz", tags=["observability"])
async def health():
    """Check Celery worker availability."""
    from app.celery_app import celery_app
    try:
        inspector = celery_app.control.inspect(timeout=2.0)
        ping      = inspector.ping() or {}
        return {
            "status":  "ok" if ping else "degraded",
            "service": "worker-service",
            "workers": list(ping.keys()),
        }
    except Exception as exc:
        return {"status": "degraded", "service": "worker-service", "error": str(exc)}
