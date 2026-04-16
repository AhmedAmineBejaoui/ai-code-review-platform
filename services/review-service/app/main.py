"""
╔══════════════════════════════════════════════════════╗
║         SERVICE 5 — REVIEW SERVICE                   ║
║  Port: 8004  (internal)                              ║
║  Role: LLM-based code review, scoring, summarization.║
║  DB:   Owns review_outputs table.                    ║
║  LLM:  Wraps Ollama (or OpenAI via compat layer).    ║
╚══════════════════════════════════════════════════════╝
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.review import router as review_router
from app.settings   import settings
from shared.errors import register_exception_handlers

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.getLogger(__name__).info(
        "Review Service started — LLM: %s (%s)", settings.LLM_ENABLED, settings.OLLAMA_MODEL
    )
    yield


app = FastAPI(
    title="AI Code Review — Review Service",
    version="1.0.0",
    description="Generates LLM-based grounded code reviews. Called by Worker Service.",
    lifespan=lifespan,
)

register_exception_handlers(app)
app.include_router(review_router)


@app.get("/healthz", tags=["observability"])
async def health():
    return {
        "status":  "ok",
        "service": "review-service",
        "llm":     settings.LLM_ENABLED,
        "model":   settings.OLLAMA_MODEL,
        "ollama":  settings.OLLAMA_BASE_URL,
    }
