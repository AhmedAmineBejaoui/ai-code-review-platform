from __future__ import annotations

import asyncio


class QdrantClient:
    async def search_related_rules(self, repo: str, diff_text: str, limit: int = 3) -> list[str]:
        # Placeholder async I/O integration point for vector search.
        await asyncio.sleep(0)
        return []
