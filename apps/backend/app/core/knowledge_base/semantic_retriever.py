from __future__ import annotations

from typing import Any

from app.core.knowledge_base.embeddings import hash_embed_text
from app.core.knowledge_base.retrieval_models import RetrievalCandidate, RetrievedContextChunk
from app.integrations.vector_store.qdrant_client import QdrantClient
from app.settings import settings


class SemanticRetriever:
    def __init__(self, vector_store: QdrantClient) -> None:
        self._vector_store = vector_store
        self._collection = settings.QDRANT_REPO_CONTEXT_COLLECTION
        self._vector_size = settings.REPO_CONTEXT_VECTOR_SIZE

    async def retrieve_code(
        self,
        *,
        repo_id: str,
        query_text: str,
        limit: int,
        changed_files: set[str] | None = None,
    ) -> list[RetrievalCandidate]:
        hits = await self._search(
            query_text=query_text,
            limit=limit,
            filter_payload={"repo_id": repo_id, "type": "chunk"},
        )
        candidates = _hits_to_candidates(hits, source="semantic_code")
        if changed_files:
            filtered = [candidate for candidate in candidates if candidate.chunk.path in changed_files]
            if filtered:
                return filtered[:limit]
        return candidates[:limit]

    async def retrieve_documents(
        self,
        *,
        repo_id: str,
        query_text: str,
        limit: int,
        source_type: str | None = None,
        tags: list[str] | None = None,
    ) -> list[RetrievalCandidate]:
        filter_payload: dict[str, Any] = {"repo_id": repo_id, "type": "kb_document_chunk"}
        if source_type:
            filter_payload["source_type"] = source_type
        hits = await self._search(query_text=query_text, limit=max(limit * 4, limit), filter_payload=filter_payload)
        candidates = _hits_to_candidates(hits, source="semantic_document")
        wanted_tags = {tag.strip().lower() for tag in (tags or []) if tag.strip()}
        if wanted_tags:
            candidates = [
                candidate
                for candidate in candidates
                if wanted_tags.intersection({tag.lower() for tag in candidate.chunk.tags})
            ]
        return candidates[:limit]

    async def retrieve_repo_bootstrap(self, *, repo_id: str, query_text: str, limit: int) -> list[RetrievalCandidate]:
        hits = await self._search(
            query_text=query_text,
            limit=limit,
            filter_payload={"repo_id": repo_id, "type": "chunk"},
        )
        return _hits_to_candidates(hits, source="repo_bootstrap")

    async def _search(self, *, query_text: str, limit: int, filter_payload: dict[str, Any]) -> list[Any]:
        if not self._vector_store.enabled:
            return []
        await self._vector_store.ensure_collection(collection_name=self._collection, vector_size=self._vector_size)
        query_vector = hash_embed_text(query_text, vector_size=self._vector_size)
        return await self._vector_store.search(
            collection_name=self._collection,
            query_vector=query_vector,
            filter_payload=filter_payload,
            limit=limit,
        )


def _hits_to_candidates(hits: list[Any], *, source: str) -> list[RetrievalCandidate]:
    candidates: list[RetrievalCandidate] = []
    for hit in hits:
        payload = getattr(hit, "payload", None) or {}
        path = str(payload.get("path") or payload.get("path_or_url") or payload.get("title") or payload.get("doc_id") or "")
        content = str(payload.get("content") or payload.get("text") or "")
        if not path or not content:
            continue
        score = float(getattr(hit, "score", 0.0) or 0.0)
        tags = payload.get("tags")
        normalized_tags = tuple(str(tag).strip() for tag in tags if str(tag).strip()) if isinstance(tags, list) else ()
        token_count = int(payload.get("token_count") or max(1, len(content.split())))
        chunk = RetrievedContextChunk(
            score=score,
            path=path,
            chunk_index=int(payload.get("chunk_index") or 0),
            language=str(payload.get("language") or payload.get("source_type") or "text"),
            content=content,
            token_count=token_count,
            file_type=str(payload.get("file_type") or payload.get("source_type") or "text"),
            chunk_type=str(payload.get("chunk_type") or "text_chunk"),
            symbol_name=str(payload.get("symbol_name")) if payload.get("symbol_name") else None,
            start_line=int(payload.get("start_line")) if payload.get("start_line") is not None else None,
            end_line=int(payload.get("end_line")) if payload.get("end_line") is not None else None,
            source=source,
            source_type=str(payload.get("source_type")) if payload.get("source_type") else None,
            tags=normalized_tags,
            document_id=str(payload.get("doc_id")) if payload.get("doc_id") else None,
            title=str(payload.get("title")) if payload.get("title") else None,
        )
        candidates.append(RetrievalCandidate(chunk=chunk, channel=source, raw_score=score, score=score))
    return candidates
