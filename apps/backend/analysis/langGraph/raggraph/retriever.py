from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from analysis.langGraph.context.repo_context_manager import RepoContextManager
from analysis.langGraph.models import RetrievalFilters, RetrievalResult, RetrievedContextReference
from app.core.knowledge_base.re_ranker import ReRanker
from app.core.knowledge_base.query_router import QueryRouter
from app.core.knowledge_base.retrieval_models import QueryRoute, RetrievalCandidate, RetrievedContextChunk
from app.core.knowledge_base.retriever import (
    RepoContextRetriever,
    build_llm_context_with_chunks,
)
from app.data.repos.repo_context_chunks_repo import RepoContextChunkRow, RepoContextChunksRepo
from app.integrations.vector_store.qdrant_client import QdrantClient
from app.settings import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RetrieverTrace:
    vector_hits: int
    graph_hits: int
    hyde_hits: int
    reranked_count: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "vector_hits": self.vector_hits,
            "graph_hits": self.graph_hits,
            "hyde_hits": self.hyde_hits,
            "reranked_count": self.reranked_count,
        }


class RagGraphRetriever:
    """Hybrid retrieval over vector index + dependency graph + optional HyDE."""

    def __init__(
        self,
        *,
        vector_store: QdrantClient | None = None,
        repo_context_retriever: RepoContextRetriever | None = None,
        context_manager: RepoContextManager | None = None,
        chunks_repo: RepoContextChunksRepo | None = None,
        reranker: ReRanker | None = None,
    ) -> None:
        self._vector_store = vector_store or QdrantClient()
        self._repo_context_retriever = repo_context_retriever or RepoContextRetriever(vector_store=self._vector_store)
        self._context_manager = context_manager or RepoContextManager()
        self._chunks_repo = chunks_repo or RepoContextChunksRepo()
        self._reranker = reranker or ReRanker()
        self._router = QueryRouter()

    async def retrieve_for_diff(
        self,
        *,
        repo_id: str,
        diff_text: str,
        changed_files: list[str],
        filters: RetrievalFilters | None = None,
        limit: int = 12,
    ) -> RetrievalResult:
        retrieval_filters = filters or RetrievalFilters()

        vector_chunks, _ = await self._repo_context_retriever.retrieve_for_diff(
            repo_id=repo_id,
            diff_text=diff_text,
            changed_files=changed_files,
            limit=max(limit, 8),
        )

        graph_chunks = self._collect_graph_chunks(repo_id=repo_id, changed_files=changed_files, limit=limit)
        hyde_chunks = await self._collect_hyde_chunks(repo_id=repo_id, diff_text=diff_text, limit=limit)

        candidates: list[RetrievalCandidate] = []
        candidates.extend(_to_candidates(vector_chunks, channel="semantic_code"))
        candidates.extend(_to_candidates(graph_chunks, channel="graph_connected"))
        candidates.extend(_to_candidates(hyde_chunks, channel="semantic_code"))

        filtered_candidates = self._apply_filters(candidates=candidates, filters=retrieval_filters)
        ranked = self._reranker.rank(
            query=diff_text[:3000],
            candidates=filtered_candidates,
            route=QueryRoute.DIFF_REVIEW,
            limit=max(limit * 2, 16),
        )

        selected_chunks = [item.chunk for item in ranked[:limit]]
        context_text, used_chunks = build_llm_context_with_chunks(selected_chunks, max_chars=8000)
        if context_text == "[NO_CONTEXT_AVAILABLE]":
            context_text = None

        trace = RetrieverTrace(
            vector_hits=len(vector_chunks),
            graph_hits=len(graph_chunks),
            hyde_hits=len(hyde_chunks),
            reranked_count=len(ranked),
        )

        references = [_to_reference(chunk) for chunk in used_chunks]
        retrieval_mode = "hybrid_graph_vector_hyde" if hyde_chunks else "hybrid_graph_vector"
        return RetrievalResult(
            context_text=context_text,
            references=references,
            vector_hits=trace.vector_hits,
            graph_hits=trace.graph_hits,
            hyde_hits=trace.hyde_hits,
            reranked_count=trace.reranked_count,
            retrieval_mode=retrieval_mode,
            retrieval_trace=trace.to_dict(),
        )

    async def retrieve_for_query(
        self,
        *,
        repo_id: str,
        query: str,
        changed_files: list[str] | None = None,
        filters: RetrievalFilters | None = None,
        limit: int = 8,
        route_hint: str = "auto",
    ) -> RetrievalResult:
        retrieval_filters = filters or RetrievalFilters()
        base_chunks, _profile = await self._repo_context_retriever.retrieve_for_query(
            repo_id=repo_id,
            query=query,
            changed_files=changed_files,
            limit=max(limit, 8),
            route_hint=route_hint,
        )
        route = self._router.route_query(query=query, route_hint=route_hint)
        graph_paths = [item.path for item in base_chunks[: max(limit, 4)] if item.path.strip()]
        graph_chunks = self._collect_graph_chunks(repo_id=repo_id, changed_files=graph_paths or (changed_files or []), limit=limit)
        hyde_chunks = await self._collect_hyde_chunks(repo_id=repo_id, diff_text=query, limit=limit)
        return self._build_result(
            repo_id=repo_id,
            query_text=query,
            route=route,
            primary_chunks=base_chunks,
            graph_chunks=graph_chunks,
            hyde_chunks=hyde_chunks,
            filters=retrieval_filters,
            limit=limit,
            retrieval_mode="graph_rag_query",
        )

    async def retrieve_for_repo_bootstrap(
        self,
        *,
        repo_id: str,
        limit: int = 16,
    ) -> RetrievalResult:
        base_chunks, _profile = await self._repo_context_retriever.retrieve_for_repo_bootstrap(
            repo_id=repo_id,
            limit=max(limit, 8),
        )
        graph_paths = [item.path for item in base_chunks[: max(limit, 4)] if item.path.strip()]
        graph_chunks = self._collect_graph_chunks(repo_id=repo_id, changed_files=graph_paths, limit=limit)
        return self._build_result(
            repo_id=repo_id,
            query_text="repository bootstrap context",
            route=QueryRoute.REPO_QUERY,
            primary_chunks=base_chunks,
            graph_chunks=graph_chunks,
            hyde_chunks=[],
            filters=RetrievalFilters(),
            limit=limit,
            retrieval_mode="graph_rag_bootstrap",
        )

    def _collect_graph_chunks(self, *, repo_id: str, changed_files: list[str], limit: int) -> list[RetrievedContextChunk]:
        neighbors: list[str] = []
        for changed_file in changed_files:
            neighbors.extend(
                self._context_manager.get_neighbors(
                    repo_id=repo_id,
                    path=changed_file,
                    depth=2,
                    limit=max(limit, 8),
                )
            )

        unique_neighbors = list(dict.fromkeys(item for item in neighbors if item))
        if not unique_neighbors:
            return []

        collected: list[RetrievedContextChunk] = []
        for path in unique_neighbors[: max(limit, 8)]:
            rows = self._chunks_repo.list_by_path(repo_id=repo_id, path=path, limit=2)
            for row in rows:
                collected.append(_row_to_chunk(row, source="graph"))
                if len(collected) >= limit:
                    return collected
        return collected

    async def _collect_hyde_chunks(self, *, repo_id: str, diff_text: str, limit: int) -> list[RetrievedContextChunk]:
        try:
            from app.core.knowledge_base.hyde import build_hyde_expander
        except Exception:
            return []

        expander = build_hyde_expander()
        if not expander.available:
            return []

        vector = expander.expand_query(diff_text[:1800], query_type="code")
        if vector is None:
            return []

        if not self._vector_store.enabled:
            return []

        hits = await self._vector_store.search(
            collection_name=settings.QDRANT_REPO_CONTEXT_COLLECTION,
            query_vector=vector,
            limit=max(limit, 6),
            filter_payload={"repo_id": repo_id, "type": "chunk"},
        )
        return _hits_to_chunks(hits, source="hyde")

    def _build_result(
        self,
        *,
        repo_id: str,
        query_text: str,
        route: QueryRoute,
        primary_chunks: list[RetrievedContextChunk],
        graph_chunks: list[RetrievedContextChunk],
        hyde_chunks: list[RetrievedContextChunk],
        filters: RetrievalFilters,
        limit: int,
        retrieval_mode: str,
    ) -> RetrievalResult:
        candidates: list[RetrievalCandidate] = []
        candidates.extend(_to_candidates(primary_chunks, channel="semantic_code"))
        candidates.extend(_to_candidates(graph_chunks, channel="graph_connected"))
        candidates.extend(_to_candidates(hyde_chunks, channel="semantic_code"))

        filtered_candidates = self._apply_filters(candidates=candidates, filters=filters)
        ranked = self._reranker.rank(
            query=query_text[:3000],
            candidates=filtered_candidates,
            route=route,
            limit=max(limit * 2, 16),
        )
        selected_chunks = [item.chunk for item in ranked[:limit]]
        context_text, used_chunks = build_llm_context_with_chunks(selected_chunks, max_chars=8000)
        if context_text == "[NO_CONTEXT_AVAILABLE]":
            context_text = None

        trace = RetrieverTrace(
            vector_hits=len(primary_chunks),
            graph_hits=len(graph_chunks),
            hyde_hits=len(hyde_chunks),
            reranked_count=len(ranked),
        )

        return RetrievalResult(
            context_text=context_text,
            references=[_to_reference(chunk) for chunk in used_chunks],
            vector_hits=trace.vector_hits,
            graph_hits=trace.graph_hits,
            hyde_hits=trace.hyde_hits,
            reranked_count=trace.reranked_count,
            retrieval_mode=retrieval_mode,
            retrieval_trace={
                **trace.to_dict(),
                "repo_id": repo_id,
            },
        )

    @staticmethod
    def _apply_filters(
        *,
        candidates: list[RetrievalCandidate],
        filters: RetrievalFilters,
    ) -> list[RetrievalCandidate]:
        normalized_tags = filters.normalized_tags()
        output: list[RetrievalCandidate] = []
        for item in candidates:
            chunk = item.chunk
            if filters.language and chunk.language.lower() != filters.language.lower():
                continue
            if filters.module and not chunk.path.startswith(filters.module.strip("/")):
                continue
            if normalized_tags:
                chunk_tags = {tag.lower() for tag in chunk.tags}
                if not chunk_tags.intersection(normalized_tags):
                    continue
            output.append(item)
        return output


def _to_candidates(chunks: list[RetrievedContextChunk], *, channel: str) -> list[RetrievalCandidate]:
    return [
        RetrievalCandidate(
            chunk=item,
            channel=channel,
            raw_score=float(item.score),
            score=float(item.score),
        )
        for item in chunks
    ]


def _row_to_chunk(row: RepoContextChunkRow, *, source: str) -> RetrievedContextChunk:
    indexed_at = row.metadata.get("indexed_at")
    return RetrievedContextChunk(
        score=0.66,
        path=row.path,
        chunk_index=row.chunk_index,
        language=row.language,
        content=row.content,
        token_count=max(1, len(row.content.split())),
        file_type=row.file_type,
        chunk_type=row.chunk_type,
        symbol_name=row.symbol_name,
        start_line=row.start_line,
        end_line=row.end_line,
        source=source,
        source_type="code",
        tags=tuple(),
        repo_id=row.repo_id,
        score_raw=0.66,
        score_final=0.66,
        crawl_timestamp=str(indexed_at) if indexed_at is not None else None,
    )


def _to_reference(chunk: RetrievedContextChunk) -> RetrievedContextReference:
    return RetrievedContextReference(
        path=chunk.path,
        source=chunk.source,
        source_type=chunk.source_type,
        chunk_type=chunk.chunk_type,
        symbol_name=chunk.symbol_name,
        line_start=chunk.start_line,
        line_end=chunk.end_line,
        score=chunk.score_final if chunk.score_final is not None else chunk.score,
        tags=tuple(chunk.tags),
        content=chunk.content,
        title=chunk.title,
        indexed_at=chunk.crawl_timestamp,
    )


def _hits_to_chunks(hits: list[Any], *, source: str) -> list[RetrievedContextChunk]:
    output: list[RetrievedContextChunk] = []
    for hit in hits:
        payload = getattr(hit, "payload", None) or {}
        content = str(payload.get("content") or "").strip()
        path = str(payload.get("path") or "").strip()
        if not content or not path:
            continue
        score = float(getattr(hit, "score", 0.0) or 0.0)
        output.append(
            RetrievedContextChunk(
                score=score,
                path=path,
                chunk_index=int(payload.get("chunk_index") or 0),
                language=str(payload.get("language") or "text"),
                content=content,
                token_count=max(1, len(content.split())),
                file_type=str(payload.get("file_type") or "code"),
                chunk_type=str(payload.get("chunk_type") or "code_block"),
                symbol_name=payload.get("symbol_name"),
                start_line=payload.get("start_line"),
                end_line=payload.get("end_line"),
                source=source,
                source_type="code",
                tags=tuple(payload.get("tags") or []),
                score_raw=score,
                score_final=score,
            )
        )
    return output
