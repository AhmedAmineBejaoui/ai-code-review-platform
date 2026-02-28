from __future__ import annotations

import asyncio
import logging

from app.settings import settings

logger = logging.getLogger(__name__)


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
        self._client: object | None = None  # qdrant_client.AsyncQdrantClient

    def _get_client(self) -> object:
        if self._client is None:
            try:
                from qdrant_client import AsyncQdrantClient  # type: ignore[import]

                self._client = AsyncQdrantClient(
                    url=self._url,
                    api_key=self._api_key,
                )
            except ImportError:
                logger.warning(
                    "qdrant-client package not installed. "
                    "Install it with: pip install qdrant-client"
                )
                raise
        return self._client

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
            from qdrant_client.models import NamedVector  # type: ignore[import]

            client = self._get_client()
            # Perform a simple text-based scroll as a fallback when no embedder
            # is wired up yet.  Replace with a proper vector search once an
            # embedding model is added.
            results = await client.scroll(  # type: ignore[attr-defined]
                collection_name=self._collection,
                limit=limit,
                with_payload=True,
            )
            payloads = results[0] if results else []
            return [
                str(hit.payload.get("rule", "")) for hit in payloads if hit.payload
            ]
        except Exception as exc:  # noqa: BLE001
            logger.warning("Qdrant search failed (repo=%s): %s", repo, exc)
            return []
