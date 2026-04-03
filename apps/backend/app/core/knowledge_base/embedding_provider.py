"""Unified embedding provider that prefers LangChain model-based embeddings
over the legacy hash-based approach.

When ``settings.langchain_enabled`` is *True* **and** the Ollama embedding model
is reachable, ``embed_text_for_ingestor`` produces 1024-dimensional vectors via
``mxbai-embed-large``.  Otherwise it falls back transparently to the
deterministic ``hash_embed_text`` function (256-d).
"""
from __future__ import annotations

import logging
from typing import Any

from app.core.knowledge_base.embeddings import hash_embed_text
from app.settings import settings

logger = logging.getLogger(__name__)

_langchain_embedding_svc: Any = None
_langchain_init_attempted: bool = False


def _get_langchain_embedding_service() -> Any:
    """Return a cached ``LangChainEmbeddingService`` or *None*."""
    global _langchain_embedding_svc, _langchain_init_attempted
    if _langchain_init_attempted:
        return _langchain_embedding_svc
    _langchain_init_attempted = True
    if not settings.langchain_enabled:
        return None
    try:
        from app.core.langchain_runtime.embeddings import LangChainEmbeddingService

        svc = LangChainEmbeddingService()
        if svc.available:
            _langchain_embedding_svc = svc
            logger.info(
                "LangChain embedding service initialised (model=%s)",
                settings.LANGCHAIN_OLLAMA_EMBEDDINGS_MODEL,
            )
            return svc
    except Exception:
        logger.debug("LangChain embedding service unavailable, using hash fallback", exc_info=True)
    return None


def embed_text_for_ingestor(text: str, *, vector_size: int) -> list[float]:
    """Embed *text* for storage in the vector DB.

    Prefers model-based embeddings when available; the returned vector may
    therefore be **larger** than *vector_size* (e.g. 1024 instead of 256).
    Callers that create Qdrant collections must account for the actual
    dimension returned.
    """
    svc = _get_langchain_embedding_service()
    if svc is not None:
        try:
            return svc.embed_query(text)
        except Exception:
            logger.debug("LangChain embed_query failed, falling back to hash", exc_info=True)
    return hash_embed_text(text, vector_size=vector_size)


def embed_texts_for_ingestor(texts: list[str], *, vector_size: int) -> list[list[float]]:
    """Batch-embed multiple texts.  Falls back per-text on failure."""
    svc = _get_langchain_embedding_service()
    if svc is not None:
        try:
            return svc.embed_documents(texts)
        except Exception:
            logger.debug("LangChain embed_documents failed, falling back to hash", exc_info=True)
    return [hash_embed_text(t, vector_size=vector_size) for t in texts]


def get_effective_vector_size() -> int:
    """Return the actual vector dimension produced by the active provider."""
    svc = _get_langchain_embedding_service()
    if svc is not None:
        try:
            return svc.get_vector_size()
        except Exception:
            pass
    return settings.REPO_CONTEXT_VECTOR_SIZE
