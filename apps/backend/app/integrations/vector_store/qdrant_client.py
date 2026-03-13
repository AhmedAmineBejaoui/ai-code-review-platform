from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Any, Sequence

from app.core.knowledge_base.embeddings import hash_embed_text
from app.settings import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class QdrantPoint:
    id: str
    vector: Sequence[float]
    payload: dict[str, Any]


class QdrantClient:
    """Thin async wrapper around the Qdrant REST API for semantic rule search.

    When QDRANT_ENABLED=false (default) every call returns an empty list so the
    rest of the pipeline is unaffected.
    """

    def __init__(self) -> None:
        self._enabled = settings.QDRANT_ENABLED
        self._url = settings.QDRANT_URL.rstrip("/")
        self._collection = settings.QDRANT_COLLECTION
        self._api_key = settings.QDRANT_API_KEY
        self._vector_size = settings.REPO_CONTEXT_VECTOR_SIZE
        self._client: object | None = None  # qdrant_client.AsyncQdrantClient

    @property
    def enabled(self) -> bool:
        return self._enabled

    @property
    def default_collection(self) -> str:
        return self._collection

    def _disable(self, *, reason: str, exc: Exception) -> None:
        if self._enabled:
            logger.warning("Disabling Qdrant after %s failure: %s", reason, exc)
        self._enabled = False
        self._client = None

    def ensure_enabled(self) -> None:
        if not self._enabled:
            raise RuntimeError(
                "Qdrant is disabled. Set QDRANT_ENABLED=true and configure QDRANT_URL (and QDRANT_API_KEY for cloud)."
            )

    def _get_client(self) -> object:
        if self._client is None:
            try:
                from qdrant_client import AsyncQdrantClient  # type: ignore[import]

                self._client = AsyncQdrantClient(
                    url=self._url,
                    api_key=self._api_key,
                )
            except Exception as exc:
                logger.warning(
                    "qdrant-client unavailable or incompatible. "
                    "Vector retrieval will be disabled. Details: %s",
                    exc,
                )
                self._disable(reason="client initialization", exc=exc)
                raise RuntimeError("Qdrant client is unavailable in the current runtime.") from exc
        return self._client

    @staticmethod
    def _build_filter(filter_payload: dict[str, Any] | None) -> object | None:
        if not filter_payload:
            return None

        try:
            from qdrant_client.models import FieldCondition, Filter, MatchValue  # type: ignore[import]
        except Exception as exc:  # noqa: BLE001
            logger.warning("Qdrant filter models unavailable; skipping filter construction: %s", exc)
            return None

        must = []
        for key, value in filter_payload.items():
            must.append(FieldCondition(key=key, match=MatchValue(value=value)))
        return Filter(must=must)

    async def ensure_collection(self, *, collection_name: str, vector_size: int | None = None) -> None:
        if not self._enabled:
            return

        try:
            from qdrant_client.models import Distance, VectorParams  # type: ignore[import]

            target_size = vector_size or self._vector_size
            client = self._get_client()

            exists = await client.collection_exists(collection_name=collection_name)  # type: ignore[attr-defined]
            if exists:
                return

            await client.create_collection(  # type: ignore[attr-defined]
                collection_name=collection_name,
                vectors_config=VectorParams(size=target_size, distance=Distance.COSINE),
            )
        except Exception as exc:  # noqa: BLE001
            self._disable(reason=f"ensure_collection({collection_name})", exc=exc)
            logger.warning("Qdrant ensure_collection failed; continuing without vectors: %s", exc)

    async def upsert_points(self, *, collection_name: str, points: list[QdrantPoint]) -> None:
        if not self._enabled or not points:
            return

        try:
            from qdrant_client.models import PointStruct  # type: ignore[import]

            client = self._get_client()
            point_structs = [
                PointStruct(id=point.id, vector=list(point.vector), payload=point.payload)
                for point in points
            ]
            await client.upsert(  # type: ignore[attr-defined]
                collection_name=collection_name,
                points=point_structs,
                wait=True,
            )
        except Exception as exc:  # noqa: BLE001
            self._disable(reason=f"upsert_points({collection_name})", exc=exc)
            logger.warning("Qdrant upsert failed; continuing without vectors: %s", exc)

    async def search(
        self,
        *,
        collection_name: str,
        query_vector: Sequence[float],
        limit: int,
        filter_payload: dict[str, Any] | None = None,
    ) -> list[Any]:
        if not self._enabled:
            await asyncio.sleep(0)
            return []

        try:
            client = self._get_client()
            query_filter = self._build_filter(filter_payload)
            hits = await client.search(  # type: ignore[attr-defined]
                collection_name=collection_name,
                query_vector=list(query_vector),
                query_filter=query_filter,
                limit=limit,
                with_payload=True,
                with_vectors=False,
            )
            return list(hits or [])
        except Exception as exc:  # noqa: BLE001
            self._disable(reason=f"search({collection_name})", exc=exc)
            logger.warning("Qdrant search failed; returning no vector hits: %s", exc)
            await asyncio.sleep(0)
            return []

    async def scroll(
        self,
        *,
        collection_name: str,
        limit: int = 100,
        filter_payload: dict[str, Any] | None = None,
    ) -> list[Any]:
        if not self._enabled:
            await asyncio.sleep(0)
            return []

        try:
            client = self._get_client()
            query_filter = self._build_filter(filter_payload)
            points, _next_page = await client.scroll(  # type: ignore[attr-defined]
                collection_name=collection_name,
                scroll_filter=query_filter,
                limit=limit,
                with_payload=True,
                with_vectors=False,
            )
            return list(points or [])
        except Exception as exc:  # noqa: BLE001
            self._disable(reason=f"scroll({collection_name})", exc=exc)
            logger.warning("Qdrant scroll failed; returning no vector hits: %s", exc)
            await asyncio.sleep(0)
            return []

    async def delete_by_filter(self, *, collection_name: str, filter_payload: dict[str, Any]) -> None:
        if not self._enabled:
            return

        try:
            query_filter = self._build_filter(filter_payload)
            if query_filter is None:
                return

            from qdrant_client.models import FilterSelector  # type: ignore[import]

            client = self._get_client()
            await client.delete(  # type: ignore[attr-defined]
                collection_name=collection_name,
                points_selector=FilterSelector(filter=query_filter),
                wait=True,
            )
        except Exception as exc:  # noqa: BLE001
            self._disable(reason=f"delete_by_filter({collection_name})", exc=exc)
            logger.warning("Qdrant delete failed; continuing without vectors: %s", exc)

    async def search_related_rules(
        self, repo: str, diff_text: str, limit: int = 3
    ) -> list[str]:
        """Return up to *limit* rule snippets relevant to the given diff.

        Returns an empty list when Qdrant is disabled or unavailable.
        """
        if not self._enabled:
            await asyncio.sleep(0)
            return []

        try:
            await self.ensure_collection(collection_name=self._collection, vector_size=self._vector_size)
            query_vector = hash_embed_text(f"{repo}\n{diff_text}", vector_size=self._vector_size)
            results = await self.search(
                collection_name=self._collection,
                query_vector=query_vector,
                limit=limit,
                filter_payload={"repo_id": repo},
            )

            snippets = _extract_text_snippets(results=results, limit=limit)

            # Fallback to repo-context collection when no dedicated rules are indexed.
            repo_ctx_collection = settings.QDRANT_REPO_CONTEXT_COLLECTION
            if not snippets and repo_ctx_collection and repo_ctx_collection != self._collection:
                await self.ensure_collection(collection_name=repo_ctx_collection, vector_size=self._vector_size)
                ctx_results = await self.search(
                    collection_name=repo_ctx_collection,
                    query_vector=query_vector,
                    limit=limit,
                    filter_payload={"repo_id": repo, "type": "chunk"},
                )
                snippets = _extract_text_snippets(results=ctx_results, limit=limit)
            return snippets
        except Exception as exc:  # noqa: BLE001
            logger.warning("Qdrant search failed (repo=%s): %s", repo, exc)
            return []


def _extract_text_snippets(*, results: list[Any], limit: int) -> list[str]:
    snippets: list[str] = []
    for hit in results:
        payload = getattr(hit, "payload", None) or {}
        candidate = payload.get("rule") or payload.get("text") or payload.get("content")
        if isinstance(candidate, str) and candidate.strip():
            snippets.append(candidate.strip())
        if len(snippets) >= limit:
            break
    return snippets
