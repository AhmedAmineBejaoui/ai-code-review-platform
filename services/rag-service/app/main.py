"""
╔══════════════════════════════════════════════════════╗
║         SERVICE 6 — RAG SERVICE                      ║
║  Port: 8005  (internal)                              ║
║  Role: Knowledge base ingestion + vector search.     ║
║  DB:   Owns kb_documents, repo_context_chunks tables.║
║  VDB:  Owns Qdrant collections.                      ║
╚══════════════════════════════════════════════════════╝
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.kb   import router as kb_router
from app.settings import settings
from shared.errors import register_exception_handlers

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.getLogger(__name__).info(
        "RAG Service started — Qdrant: %s (%s mode)", settings.QDRANT_ENABLED, settings.QDRANT_MODE
    )
    yield


app = FastAPI(
    title="AI Code Review — RAG Service",
    version="1.0.0",
    description="Knowledge base ingestion, embedding, vector search, and context retrieval.",
    lifespan=lifespan,
)

register_exception_handlers(app)
app.include_router(kb_router)


@app.get("/healthz", tags=["observability"])
async def health():
    qdrant_ok = "disabled"
    if settings.QDRANT_ENABLED:
        try:
            from qdrant_client import QdrantClient
            client = QdrantClient(url=settings.QDRANT_URL if settings.QDRANT_MODE == "http"
                                  else None, path=settings.QDRANT_LOCAL_PATH if settings.QDRANT_MODE == "local" else None)
            client.get_collections()
            qdrant_ok = "ok"
        except Exception:
            qdrant_ok = "error"

    return {
        "status":  "ok",
        "service": "rag-service",
        "qdrant":  qdrant_ok,
        "embed_model": settings.OLLAMA_EMBED_MODEL,
    }
