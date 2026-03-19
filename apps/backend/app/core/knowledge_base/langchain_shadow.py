from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from app.core.knowledge_base.qdrant_ids import build_document_chunk_point_id, build_repo_chunk_point_id
from app.core.langchain_runtime import LangChainEmbeddingService
from app.data.repos.kb_repo import KBRepo, KBDocumentChunkRow
from app.data.repos.repo_context_chunks_repo import RepoContextChunkRow, RepoContextChunksRepo
from app.integrations.vector_store.qdrant_client import QdrantClient, QdrantHit, QdrantPoint
from app.settings import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class LangChainIndexTrace:
    collection_name: str
    vector_size: int
    backfilled_repo_chunks: int = 0
    backfilled_document_chunks: int = 0


class LangChainShadowIndexingService:
    def __init__(
        self,
        *,
        vector_store: QdrantClient,
        embeddings: LangChainEmbeddingService | None = None,
        repo_context_chunks_repo: RepoContextChunksRepo | None = None,
        kb_repo: KBRepo | None = None,
    ) -> None:
        self._vector_store = vector_store
        self._embeddings = embeddings or LangChainEmbeddingService()
        self._repo_chunks_repo = repo_context_chunks_repo or RepoContextChunksRepo()
        self._kb_repo = kb_repo or KBRepo()
        self._physical_collection = settings.langchain_qdrant_physical_collection
        self._shadow_alias = settings.LANGCHAIN_QDRANT_COLLECTION_ALIAS_SHADOW
        self._active_alias = settings.LANGCHAIN_QDRANT_COLLECTION_ALIAS_ACTIVE
        self._backfilled_repo_ids: set[str] = set()
        self._backfilled_document_repo_ids: set[str] = set()

    @property
    def available(self) -> bool:
        return self._vector_store.enabled and self._embeddings.available and settings.langchain_enabled

    async def ensure_index_ready(self, *, promote_active_alias: bool = False) -> LangChainIndexTrace:
        if not self.available:
            raise RuntimeError("LangChain shadow indexing is unavailable")
        vector_size = self._embeddings.get_vector_size()
        await self._vector_store.ensure_collection(collection_name=self._physical_collection, vector_size=vector_size)
        existing_size = await self._vector_store.get_collection_vector_size(collection_name=self._physical_collection)
        if existing_size is not None and existing_size != vector_size:
            raise RuntimeError(
                f"LangChain collection vector size mismatch: existing={existing_size}, expected={vector_size}"
            )
        await self._vector_store.ensure_alias(alias_name=self._shadow_alias, collection_name=self._physical_collection)
        if promote_active_alias or settings.langchain_primary_stack == "langchain":
            await self._vector_store.ensure_alias(alias_name=self._active_alias, collection_name=self._physical_collection)
        return LangChainIndexTrace(collection_name=self._physical_collection, vector_size=vector_size)

    async def upsert_repo_context_rows(self, *, repo_id: str, rows: list[RepoContextChunkRow]) -> LangChainIndexTrace:
        trace = await self.ensure_index_ready()
        if not rows:
            return trace
        texts = [self._build_repo_chunk_embedding_text(row) for row in rows]
        vectors = self._embeddings.embed_documents(texts)
        points = [
            QdrantPoint(
                id=build_repo_chunk_point_id(
                    repo_id=repo_id,
                    relative_path=row.path,
                    chunk_index=row.chunk_index,
                    chunk_type=row.chunk_type,
                    symbol_name=row.symbol_name,
                ),
                vector=vector,
                payload=self._repo_row_to_payload(repo_id=repo_id, row=row),
            )
            for row, vector in zip(rows, vectors, strict=False)
        ]
        await self._vector_store.upsert_points(collection_name=self._shadow_alias, points=points)
        return LangChainIndexTrace(
            collection_name=trace.collection_name,
            vector_size=trace.vector_size,
            backfilled_repo_chunks=len(points),
        )

    async def upsert_kb_document_rows(self, *, repo_id: str | None, rows: list[KBDocumentChunkRow]) -> LangChainIndexTrace:
        trace = await self.ensure_index_ready()
        if not rows:
            return trace
        texts = [self._build_document_embedding_text(row) for row in rows]
        vectors = self._embeddings.embed_documents(texts)
        points = [
            QdrantPoint(
                id=build_document_chunk_point_id(
                    repo_id=repo_id or row.repo_id or "global",
                    doc_id=row.doc_id,
                    chunk_index=row.chunk_index,
                ),
                vector=vector,
                payload=self._document_row_to_payload(repo_id=repo_id or row.repo_id, row=row),
            )
            for row, vector in zip(rows, vectors, strict=False)
        ]
        await self._vector_store.upsert_points(collection_name=self._shadow_alias, points=points)
        return LangChainIndexTrace(
            collection_name=trace.collection_name,
            vector_size=trace.vector_size,
            backfilled_document_chunks=len(points),
        )

    async def backfill_repo(self, *, repo_id: str) -> LangChainIndexTrace:
        trace = await self.ensure_index_ready()
        repo_rows = []
        document_rows = []
        if repo_id not in self._backfilled_repo_ids:
            repo_rows = self._repo_chunks_repo.list_repo_chunks(repo_id=repo_id)
            if repo_rows:
                await self.upsert_repo_context_rows(repo_id=repo_id, rows=repo_rows)
            self._backfilled_repo_ids.add(repo_id)
        if repo_id not in self._backfilled_document_repo_ids:
            document_rows = self._kb_repo.list_document_chunks(repo_id=repo_id)
            if document_rows:
                await self.upsert_kb_document_rows(repo_id=repo_id, rows=document_rows)
            self._backfilled_document_repo_ids.add(repo_id)
        return LangChainIndexTrace(
            collection_name=trace.collection_name,
            vector_size=trace.vector_size,
            backfilled_repo_chunks=len(repo_rows),
            backfilled_document_chunks=len(document_rows),
        )

    async def search(
        self,
        *,
        query_text: str,
        limit: int,
        filter_payload: dict[str, Any],
        use_active_alias: bool = False,
    ) -> list[QdrantHit]:
        await self.ensure_index_ready(promote_active_alias=use_active_alias)
        query_vector = self._embeddings.embed_query(query_text)
        collection_name = self._active_alias if use_active_alias else self._shadow_alias
        return await self._vector_store.search(
            collection_name=collection_name,
            query_vector=query_vector,
            limit=limit,
            filter_payload=filter_payload,
        )

    def _repo_row_to_payload(self, *, repo_id: str, row: RepoContextChunkRow) -> dict[str, Any]:
        metadata = dict(row.metadata)
        token_count = int(metadata.get("token_count") or max(1, len(row.content.split())))
        return {
            "repo_id": repo_id,
            "type": "chunk",
            "path": row.path,
            "file_type": row.file_type,
            "chunk_type": row.chunk_type,
            "symbol_name": row.symbol_name,
            "start_line": row.start_line,
            "end_line": row.end_line,
            "chunk_index": row.chunk_index,
            "language": row.language,
            "token_count": token_count,
            "indexed_commit": row.indexed_commit,
            "indexed_at": metadata.get("indexed_at"),
            "content": row.content,
            "source_type": "repo_context",
            "source_id": row.id,
            "chunk_id": row.id,
            "document_version": row.indexed_commit,
            "section_title": row.symbol_name or row.path,
            "collection_version": self._physical_collection,
        }

    def _document_row_to_payload(self, *, repo_id: str | None, row: KBDocumentChunkRow) -> dict[str, Any]:
        resolved_repo_id = repo_id or row.repo_id
        metadata = dict(row.metadata or {})
        return {
            "type": "kb_document_chunk",
            "repo_id": resolved_repo_id,
            "doc_id": row.doc_id,
            "title": row.title,
            "source_type": row.source_type,
            "path_or_url": row.path_or_url,
            "path": metadata.get("source_uri") or row.path_or_url or row.title,
            "chunk_index": row.chunk_index,
            "content": row.content,
            "language": "text",
            "token_count": row.token_count,
            "file_type": row.source_type,
            "chunk_type": "document_chunk",
            "tags": row.tags,
            "source_id": row.doc_id,
            "chunk_id": f"{row.doc_id}:{row.chunk_index}",
            "document_version": row.doc_version,
            "section_title": metadata.get("section_title") or row.title,
            "heading_path": metadata.get("heading_path"),
            "page": metadata.get("page"),
            "source_uri": metadata.get("source_uri") or row.path_or_url,
            "content_hash": metadata.get("content_hash"),
            "version": metadata.get("version") or row.doc_version,
            "entity_type": metadata.get("entity_type"),
            "entity_name": metadata.get("entity_name"),
            "line_start": metadata.get("line_start"),
            "line_end": metadata.get("line_end"),
            "domain": metadata.get("domain"),
            "crawl_timestamp": metadata.get("crawl_timestamp"),
            "collection_version": self._physical_collection,
        }

    @staticmethod
    def _build_repo_chunk_embedding_text(row: RepoContextChunkRow) -> str:
        symbol = row.symbol_name or ""
        return (
            f"path:{row.path}\n"
            f"file_type:{row.file_type}\n"
            f"chunk_type:{row.chunk_type}\n"
            f"symbol:{symbol}\n"
            f"{row.content}"
        )

    @staticmethod
    def _build_document_embedding_text(row: KBDocumentChunkRow) -> str:
        metadata = dict(row.metadata or {})
        path = str(metadata.get("source_uri") or row.path_or_url or row.title)
        tags = ", ".join(row.tags)
        section_title = str(metadata.get("section_title") or row.title)
        heading_path = metadata.get("heading_path")
        heading_label = " > ".join(heading_path) if isinstance(heading_path, list) else ""
        lines = [
            f"title:{row.title}",
            f"source_type:{row.source_type}",
            f"path:{path}",
            f"section:{section_title}",
            f"tags:{tags}",
        ]
        if heading_label:
            lines.append(f"heading_path:{heading_label}")
        if metadata.get("page") is not None:
            lines.append(f"page:{metadata.get('page')}")
        if metadata.get("entity_type"):
            lines.append(f"entity_type:{metadata.get('entity_type')}")
        if metadata.get("entity_name"):
            lines.append(f"entity_name:{metadata.get('entity_name')}")
        lines.append(row.content)
        return "\n".join(lines)
