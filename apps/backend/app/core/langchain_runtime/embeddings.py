from __future__ import annotations

from threading import BoundedSemaphore
from typing import Sequence

from app.core.langchain_runtime.clients import LangChainUnavailableError
from app.core.langchain_runtime.distributed_limiter import build_distributed_limiter
from app.settings import settings

try:
    from langchain_ollama import OllamaEmbeddings
except Exception:  # pragma: no cover - handled at runtime when LangChain is unavailable
    OllamaEmbeddings = None


_EMBEDDING_SEMAPHORE = BoundedSemaphore(max(1, settings.LANGCHAIN_MAX_CONCURRENT_EMBEDDINGS))
_DISTRIBUTED_EMBEDDING_LIMITER = build_distributed_limiter(
    namespace="langchain:embeddings",
    max_slots=settings.LANGCHAIN_MAX_CONCURRENT_EMBEDDINGS,
)


class LangChainEmbeddingService:
    def __init__(
        self,
        *,
        base_url: str | None = None,
        model: str | None = None,
    ) -> None:
        self._base_url = (base_url or settings.langchain_ollama_base_url).rstrip("/")
        self._model_name = model or settings.LANGCHAIN_OLLAMA_EMBEDDINGS_MODEL
        self._embeddings: OllamaEmbeddings | None = None
        self._vector_size: int | None = None

    @property
    def available(self) -> bool:
        return OllamaEmbeddings is not None

    def embed_query(self, text: str) -> list[float]:
        embeddings = self._get_embeddings()
        with _EMBEDDING_SEMAPHORE:
            with _DISTRIBUTED_EMBEDDING_LIMITER.acquire(timeout_s=settings.LANGCHAIN_RAG_TIMEOUT_SECONDS):
                vector = embeddings.embed_query(text)
        self._cache_vector_size(vector)
        return [float(value) for value in vector]

    def embed_documents(self, texts: Sequence[str]) -> list[list[float]]:
        if not texts:
            return []
        embeddings = self._get_embeddings()
        with _EMBEDDING_SEMAPHORE:
            with _DISTRIBUTED_EMBEDDING_LIMITER.acquire(timeout_s=settings.LANGCHAIN_RAG_TIMEOUT_SECONDS):
                vectors = embeddings.embed_documents(list(texts))
        if vectors:
            self._cache_vector_size(vectors[0])
        return [[float(value) for value in vector] for vector in vectors]

    def get_vector_size(self) -> int:
        if self._vector_size is not None:
            return self._vector_size
        probe = self.embed_query("dimension probe")
        return len(probe)

    def _get_embeddings(self) -> OllamaEmbeddings:
        if OllamaEmbeddings is None:
            raise LangChainUnavailableError(
                "LangChain embeddings are unavailable. Install langchain-ollama to enable semantic shadow indexing."
            )
        if self._embeddings is None:
            self._embeddings = OllamaEmbeddings(
                base_url=self._base_url,
                model=self._model_name,
            )
        return self._embeddings

    def _cache_vector_size(self, vector: Sequence[float]) -> None:
        if self._vector_size is None and vector:
            self._vector_size = len(vector)
