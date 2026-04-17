"""RAG Service — configuration."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str | None = None   # For kb_documents + repo_context_chunks metadata

    # Qdrant
    QDRANT_ENABLED:    bool = True
    QDRANT_MODE:       str  = "http"        # "local" | "http"
    QDRANT_URL:        str  = "http://qdrant:6333"
    QDRANT_LOCAL_PATH: str  = "./qdrant_storage"
    QDRANT_COLLECTION: str  = "code_review_rules"

    # Embedding model (via Ollama)
    OLLAMA_BASE_URL:     str = "http://ollama:11434"
    OLLAMA_EMBED_MODEL:  str = "mxbai-embed-large"
    EMBED_VECTOR_SIZE:   int = 1024

    # Retrieval config
    RAG_TOP_K:           int   = 10
    RAG_RERANK_ENABLED:  bool  = True
    RAG_RERANK_TOP_N:    int   = 5
    RAG_CACHE_TTL_SECS:  int   = 300

    # Chunking
    CHUNK_SIZE:          int   = 512
    CHUNK_OVERLAP:       int   = 64
    KB_MAX_DOCS:         int   = 10_000


settings = Settings()
