from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.core.knowledge_base.embeddings import hash_embed_text
from app.core.knowledge_base.ingestor import RepoContextIngestor
from app.core.review_engine.diff_engine import DiffParseError, parse_unified_diff
from app.integrations.vector_store.qdrant_client import QdrantClient
from app.settings import settings


@dataclass(frozen=True)
class RetrievedContextChunk:
    score: float
    path: str
    chunk_index: int
    language: str
    content: str
    token_count: int


class RepoContextRetriever:
    def __init__(self, vector_store: QdrantClient) -> None:
        self._vector_store = vector_store
        self._collection = settings.QDRANT_REPO_CONTEXT_COLLECTION
        self._vector_size = settings.REPO_CONTEXT_VECTOR_SIZE
        self._ingestor = RepoContextIngestor(vector_store=vector_store)

    async def get_repo_profile(self, repo_id: str) -> dict[str, Any] | None:
        return await self._ingestor.get_repo_profile(repo_id)

    async def retrieve_for_query(
        self,
        *,
        repo_id: str,
        query: str,
        changed_files: list[str] | None = None,
        limit: int = 8,
    ) -> tuple[list[RetrievedContextChunk], dict[str, Any] | None]:
        if limit < 1:
            limit = 1

        self._vector_store.ensure_enabled()
        await self._vector_store.ensure_collection(collection_name=self._collection, vector_size=self._vector_size)

        query_vector = hash_embed_text(query, vector_size=self._vector_size)
        filter_payload: dict[str, Any] = {"repo_id": repo_id, "type": "chunk"}

        hits = await self._vector_store.search(
            collection_name=self._collection,
            query_vector=query_vector,
            filter_payload=filter_payload,
            limit=limit * 3,
        )

        chunks: list[RetrievedContextChunk] = []
        changed_files_set = set(changed_files or [])
        for hit in hits:
            payload = getattr(hit, "payload", None) or {}
            path = str(payload.get("path") or "")
            if not path:
                continue
            if changed_files_set and path not in changed_files_set:
                continue

            chunks.append(
                RetrievedContextChunk(
                    score=float(getattr(hit, "score", 0.0) or 0.0),
                    path=path,
                    chunk_index=int(payload.get("chunk_index") or 0),
                    language=str(payload.get("language") or "text"),
                    content=str(payload.get("content") or ""),
                    token_count=int(payload.get("token_count") or 0),
                )
            )
            if len(chunks) >= limit:
                break

        profile = await self._ingestor.get_repo_profile(repo_id)
        return chunks, profile

    async def retrieve_for_diff(
        self,
        *,
        repo_id: str,
        diff_text: str,
        changed_files: list[str] | None = None,
        limit: int = 8,
    ) -> tuple[list[RetrievedContextChunk], dict[str, Any] | None]:
        inferred_files = changed_files or _extract_paths_from_diff(diff_text)
        query = _build_query_from_diff(diff_text=diff_text, changed_files=inferred_files)
        return await self.retrieve_for_query(
            repo_id=repo_id,
            query=query,
            changed_files=inferred_files,
            limit=limit,
        )


def retrieve(query: str) -> list[str]:
    _ = query
    return []


def _extract_paths_from_diff(diff_text: str) -> list[str]:
    try:
        parsed = parse_unified_diff(diff_text)
        paths = [item.path_new for item in parsed.files if item.path_new]
        return sorted(set(path for path in paths if path))
    except DiffParseError:
        paths: list[str] = []
        for line in diff_text.splitlines():
            if not line.startswith("diff --git a/"):
                continue
            right = line.split(" b/", maxsplit=1)
            if len(right) != 2:
                continue
            candidate = right[1].strip()
            if candidate:
                paths.append(candidate)
        return sorted(set(paths))


def _build_query_from_diff(*, diff_text: str, changed_files: list[str]) -> str:
    file_hint = ", ".join(changed_files[:20])
    excerpt = diff_text[:3000]
    return (
        "Repository diff context request.\n"
        f"Changed files: {file_hint}\n"
        "Diff excerpt:\n"
        f"{excerpt}"
    )
