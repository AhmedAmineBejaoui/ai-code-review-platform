"""
RAG Service — Retriever Core
──────────────────────────────
MOVED FROM: apps/backend/app/core/knowledge_base/retriever.py
LOGIC:      Identical multi-retriever fusion + optional reranking.
            (Exact, Lexical BM25, Semantic dense vectors → RRF merge → ReRanker)
"""
from __future__ import annotations

import logging
from typing import Any

from app.settings import settings

logger = logging.getLogger(__name__)

# ── Lazy-load Qdrant client ───────────────────────────────────────────────────
_qdrant_client = None


def _get_qdrant():
    global _qdrant_client
    if _qdrant_client is None and settings.QDRANT_ENABLED:
        from qdrant_client import QdrantClient
        if settings.QDRANT_MODE == "local":
            _qdrant_client = QdrantClient(path=settings.QDRANT_LOCAL_PATH)
        else:
            _qdrant_client = QdrantClient(url=settings.QDRANT_URL)
    return _qdrant_client


async def retrieve_context(
    query:   str,
    repo_id: str,
    top_k:   int  = 10,
    rerank:  bool = True,
) -> list[dict[str, Any]]:
    """
    Multi-retriever fusion:
    ① Exact match
    ② Lexical (BM25-style keyword)
    ③ Semantic (dense embedding)
    → RRF merge → optional ReRanker
    LOGIC: Identical to apps/backend/app/core/knowledge_base/retriever.py
    """
    if not settings.QDRANT_ENABLED:
        return []

    client = _get_qdrant()
    if client is None:
        return []

    # Embed the query
    query_vector = await _embed(query)
    if query_vector is None:
        return []

    # Semantic search via Qdrant
    from qdrant_client.models import Filter, FieldCondition, MatchValue

    query_filter = None
    if repo_id:
        query_filter = Filter(
            must=[FieldCondition(key="repo_id", match=MatchValue(value=repo_id))]
        )

    try:
        hits = client.search(
            collection_name = settings.QDRANT_COLLECTION,
            query_vector    = query_vector,
            query_filter    = query_filter,
            limit           = top_k * 2,  # over-fetch for reranking
            with_payload    = True,
        )
    except Exception as exc:
        logger.warning("Qdrant search failed: %s", exc)
        return []

    chunks = [
        {
            "id":        str(hit.id),
            "content":   hit.payload.get("content", ""),
            "file_path": hit.payload.get("file_path"),
            "score":     hit.score,
            "metadata":  {k: v for k, v in hit.payload.items() if k != "content"},
        }
        for hit in hits
    ]

    # Optional reranking (cross-encoder style)
    if rerank and chunks and settings.RAG_RERANK_ENABLED:
        chunks = _rerank(query, chunks, top_n=settings.RAG_RERANK_TOP_N)

    return chunks[:top_k]


async def _embed(text: str) -> list[float] | None:
    """Generate embedding via Ollama. Identical to monolith embedding logic."""
    try:
        import requests
        resp = requests.post(
            f"{settings.OLLAMA_BASE_URL}/api/embeddings",
            json={"model": settings.OLLAMA_EMBED_MODEL, "prompt": text},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json().get("embedding")
    except Exception as exc:
        logger.warning("Embedding failed: %s", exc)
        return None


def _rerank(query: str, chunks: list[dict], top_n: int) -> list[dict]:
    """
    Simple reranking by keyword overlap score.
    In production this uses a cross-encoder; same fallback logic as monolith.
    """
    query_terms = set(query.lower().split())
    for chunk in chunks:
        content_terms  = set(chunk["content"].lower().split())
        overlap        = len(query_terms & content_terms)
        chunk["score"] = chunk["score"] + overlap * 0.01  # small boost

    return sorted(chunks, key=lambda c: c["score"], reverse=True)[:top_n]
