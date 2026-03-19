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

    async def retrieve_global_documents(
        self,
        *,
        query_text: str,
        limit: int,
        source_type: str | None = None,
        tags: list[str] | None = None,
    ) -> list[RetrievalCandidate]:
        filter_payload: dict[str, Any] = {"type": "kb_document_chunk"}
        if source_type:
            filter_payload["source_type"] = source_type
        hits = await self._search(query_text=query_text, limit=max(limit * 4, limit), filter_payload=filter_payload)
        candidates = _hits_to_candidates(hits, source="semantic_global_document")
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
            repo_id=str(payload.get("repo_id")) if payload.get("repo_id") else None,
            source_id=str(payload.get("source_id")) if payload.get("source_id") else None,
            chunk_id=str(payload.get("chunk_id")) if payload.get("chunk_id") else None,
            document_version=str(payload.get("document_version")) if payload.get("document_version") else None,
            section_title=str(payload.get("section_title") or payload.get("title")) if (payload.get("section_title") or payload.get("title")) else None,
            heading_path=_normalize_heading_path(payload.get("heading_path")),
            page=_as_optional_int(payload.get("page")),
            source_uri=_as_optional_str(payload.get("source_uri") or payload.get("path_or_url")),
            content_hash=_as_optional_str(payload.get("content_hash")),
            version=_as_optional_str(payload.get("version") or payload.get("document_version")),
            entity_type=_as_optional_str(payload.get("entity_type")),
            entity_name=_as_optional_str(payload.get("entity_name")),
            domain=_as_optional_str(payload.get("domain")),
            crawl_timestamp=_as_optional_str(payload.get("crawl_timestamp")),
            retrieval_reason=f"semantic_match:{source}",
            retriever_channel=source,
            score_raw=score,
            score_final=score,
            collection_version=str(payload.get("collection_version")) if payload.get("collection_version") else None,
        )
        candidates.append(RetrievalCandidate(chunk=chunk, channel=source, raw_score=score, score=score))
    return candidates


def _as_optional_int(value: Any) -> int | None:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str):
        try:
            return int(value.strip())
        except ValueError:
            return None
    return None


def _as_optional_str(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    normalized = value.strip()
    return normalized or None


def _normalize_heading_path(value: Any) -> tuple[str, ...]:
    if isinstance(value, list):
        return tuple(str(item).strip() for item in value if str(item).strip())
    if isinstance(value, tuple):
        return tuple(str(item).strip() for item in value if str(item).strip())
    if isinstance(value, str):
        return tuple(part.strip() for part in value.split(">") if part.strip())
    return ()
