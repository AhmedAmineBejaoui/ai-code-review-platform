from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Any, Sequence

import httpx

from app.core.knowledge_base.embeddings import hash_embed_text
from app.settings import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class QdrantPoint:
    id: str | int
    vector: Sequence[float]
    payload: dict[str, Any]


@dataclass(frozen=True)
class QdrantHit:
    id: str | int | None
    payload: dict[str, Any]
    score: float = 0.0


class QdrantClient:
    """Thin async wrapper around the Qdrant REST API for semantic rule search.

    When QDRANT_ENABLED=false every call returns an empty list so the rest of
    the pipeline is unaffected.
    """

    def __init__(self) -> None:
        self._enabled = settings.QDRANT_ENABLED
        self._url = settings.QDRANT_URL.rstrip("/")
        self._collection = settings.QDRANT_COLLECTION
        self._api_key = settings.QDRANT_API_KEY
        self._vector_size = settings.REPO_CONTEXT_VECTOR_SIZE
        self._client: httpx.AsyncClient | None = None

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

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            headers: dict[str, str] = {}
            if self._api_key:
                headers["api-key"] = self._api_key
            self._client = httpx.AsyncClient(base_url=self._url, headers=headers, timeout=30.0)
        return self._client

    @staticmethod
    def _build_filter(filter_payload: dict[str, Any] | None) -> dict[str, Any] | None:
        if not filter_payload:
            return None
        must = []
        for key, value in filter_payload.items():
            must.append({"key": key, "match": {"value": value}})
        return {"must": must}

    async def _request(
        self,
        *,
        method: str,
        path: str,
        json_body: dict[str, Any] | None = None,
        expected_statuses: tuple[int, ...] = (200,),
    ) -> Any:
        client = self._get_client()
        response = await client.request(method=method, url=path, json=json_body)
        if response.status_code not in expected_statuses:
            raise RuntimeError(f"Unexpected Response: {response.status_code} ({response.text})")
        if not response.content:
            return None
        payload = response.json()
        status = payload.get("status")
        if status not in {None, "ok"}:
            raise RuntimeError(f"Unexpected Qdrant status: {status}")
        return payload.get("result")

    async def ensure_collection(self, *, collection_name: str, vector_size: int | None = None) -> None:
        if not self._enabled:
            return

        try:
            client = self._get_client()
            response = await client.get(f"/collections/{collection_name}")
            if response.status_code == 200:
                return
            if response.status_code != 404:
                raise RuntimeError(f"Unexpected Response: {response.status_code} ({response.text})")

            target_size = vector_size or self._vector_size
            await self._request(
                method="PUT",
                path=f"/collections/{collection_name}",
                json_body={"vectors": {"size": target_size, "distance": "Cosine"}},
            )
        except Exception as exc:  # noqa: BLE001
            self._disable(reason=f"ensure_collection({collection_name})", exc=exc)
            logger.warning("Qdrant ensure_collection failed; continuing without vectors: %s", exc)

    async def upsert_points(self, *, collection_name: str, points: list[QdrantPoint]) -> None:
        if not self._enabled or not points:
            return

        try:
            await self._request(
                method="PUT",
                path=f"/collections/{collection_name}/points?wait=true",
                json_body={
                    "points": [
                        {"id": point.id, "vector": list(point.vector), "payload": point.payload}
                        for point in points
                    ]
                },
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
            result = await self._request(
                method="POST",
                path=f"/collections/{collection_name}/points/search",
                json_body={
                    "vector": list(query_vector),
                    "limit": limit,
                    "with_payload": True,
                    "with_vector": False,
                    "filter": self._build_filter(filter_payload),
                },
            )
            return [
                QdrantHit(
                    id=item.get("id"),
                    payload=item.get("payload") if isinstance(item.get("payload"), dict) else {},
                    score=float(item.get("score") or 0.0),
                )
                for item in (result or [])
                if isinstance(item, dict)
            ]
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
            result = await self._request(
                method="POST",
                path=f"/collections/{collection_name}/points/scroll",
                json_body={
                    "limit": limit,
                    "with_payload": True,
                    "with_vector": False,
                    "filter": self._build_filter(filter_payload),
                },
            )
            points = result.get("points") if isinstance(result, dict) else []
            return [
                QdrantHit(
                    id=item.get("id"),
                    payload=item.get("payload") if isinstance(item.get("payload"), dict) else {},
                    score=0.0,
                )
                for item in (points or [])
                if isinstance(item, dict)
            ]
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

            await self._request(
                method="POST",
                path=f"/collections/{collection_name}/points/delete?wait=true",
                json_body={"filter": query_filter},
            )
        except Exception as exc:  # noqa: BLE001
            self._disable(reason=f"delete_by_filter({collection_name})", exc=exc)
            logger.warning("Qdrant delete failed; continuing without vectors: %s", exc)

    async def search_related_rules(self, repo: str, diff_text: str, limit: int = 3) -> list[str]:
        """Return up to *limit* rule snippets relevant to the given diff."""
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
