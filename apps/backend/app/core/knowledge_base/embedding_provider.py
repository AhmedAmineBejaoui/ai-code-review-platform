"""Deterministic embedding provider for KB ingestion.

The GraphRAG migration uses a single deterministic vector path so the vector
store, graph traversal, and reranking stay aligned across runs.
"""
from __future__ import annotations

from app.core.knowledge_base.embeddings import hash_embed_text
from app.settings import settings


def embed_text_for_ingestor(text: str, *, vector_size: int) -> list[float]:
    return hash_embed_text(text, vector_size=vector_size)


def embed_texts_for_ingestor(texts: list[str], *, vector_size: int) -> list[list[float]]:
    return [hash_embed_text(t, vector_size=vector_size) for t in texts]


def get_effective_vector_size() -> int:
    return settings.REPO_CONTEXT_VECTOR_SIZE
