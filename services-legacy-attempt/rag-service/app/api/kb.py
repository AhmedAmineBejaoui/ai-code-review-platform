"""
RAG Service — Knowledge Base API
──────────────────────────────────
MOVED FROM: apps/backend/app/api/http/knowledge_base.py
LOGIC:      Identical ingestion / retrieval / reranking logic.
            Exposed as a standalone HTTP service.

POST /v1/kb/ingest          ← ingest a document / repo
POST /v1/kb/query           ← RAG query (multi-agent)
POST /v1/kb/context         ← get context chunks for a query (called by Worker)
GET  /v1/kb/search          ← semantic search
DELETE /v1/kb/documents/{id} ← delete a document
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.retriever import retrieve_context
from app.settings import settings
from shared.errors import ApiError
from shared.models import RAGContextRequest, RAGContextResponse, RAGContextChunk

router = APIRouter(prefix="/v1/kb", tags=["knowledge-base"])
logger = logging.getLogger(__name__)


# ── POST /v1/kb/context ──────────────────────────────────────────────────────

@router.post("/context", response_model=RAGContextResponse)
async def get_context(body: RAGContextRequest) -> RAGContextResponse:
    """
    Retrieve the most relevant context chunks for a query.
    Called by: Worker Service (pipeline step ⑥, before LLM review).
    LOGIC: Identical to monolith retriever + reranker.
    """
    if not settings.QDRANT_ENABLED:
        return RAGContextResponse(chunks=[], total=0, query=body.query)

    try:
        chunks = await retrieve_context(
            query   = body.query,
            repo_id = body.repo_id,
            top_k   = body.top_k,
            rerank  = body.rerank,
        )
        return RAGContextResponse(
            chunks=[
                RAGContextChunk(
                    chunk_id  = c.get("id", ""),
                    content   = c.get("content", ""),
                    file_path = c.get("file_path"),
                    score     = c.get("score", 0.0),
                    metadata  = c.get("metadata", {}),
                )
                for c in chunks
            ],
            total = len(chunks),
            query = body.query,
        )
    except Exception as exc:
        logger.error("Context retrieval failed: %s", exc)
        raise ApiError(status_code=500, code="RETRIEVAL_FAILED", message=str(exc)) from exc


# ── POST /v1/kb/ingest ───────────────────────────────────────────────────────

class IngestRequest(BaseModel):
    repo_id:   str
    repo_path: str
    source:    str = "manual"
    metadata:  dict[str, Any] = Field(default_factory=dict)


@router.post("/ingest", status_code=202)
async def ingest(body: IngestRequest) -> dict:
    """
    Trigger async ingestion of a repository / document.
    LOGIC: Enqueues ingest_kb Celery task (same as monolith).
    """
    # Enqueue via Celery (same approach as monolith)
    try:
        from app.tasks import enqueue_ingest
        task_id = enqueue_ingest(body.repo_id, body.repo_path, body.source)
        return {"status": "accepted", "task_id": task_id}
    except Exception as exc:
        raise ApiError(status_code=503, code="INGEST_UNAVAILABLE", message=str(exc)) from exc


# ── GET /v1/kb/search ────────────────────────────────────────────────────────

@router.get("/search")
async def search(q: str, repo_id: str | None = None, top_k: int = 10) -> dict:
    """Semantic search over knowledge base."""
    try:
        chunks = await retrieve_context(query=q, repo_id=repo_id or "", top_k=top_k)
        return {"items": chunks, "total": len(chunks)}
    except Exception as exc:
        logger.warning("Search failed: %s", exc)
        return {"items": [], "total": 0}
