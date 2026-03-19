from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, Protocol

from app.core.knowledge_base.context_packer import ContextPacker
from app.core.knowledge_base.exact_retriever import ExactRetriever
from app.core.knowledge_base.langchain_retrievers import (
    CandidateDocumentRetriever,
    documents_to_candidates,
    vector_hits_to_documents,
)
from app.core.knowledge_base.langchain_shadow import LangChainShadowIndexingService
from app.core.knowledge_base.lexical_retriever import LexicalRetriever
from app.core.knowledge_base.query_router import QueryRouter
from app.core.knowledge_base.re_ranker import ReRanker
from app.core.knowledge_base.retrieval_models import QueryRoute, RetrievedContextChunk
from app.core.knowledge_base.retriever import (
    RepoContextRetriever,
    _build_lexical_query_from_diff,
    _extract_diff_signals,
    build_llm_context_with_chunks,
)
from app.data.repos.repo_profiles_repo import RepoProfilesRepo
from app.integrations.vector_store.qdrant_client import QdrantClient
from app.settings import settings


@dataclass(frozen=True)
class RagEngineResult:
    stack: str
    mode: str
    chunks: list[RetrievedContextChunk]
    profile: dict[str, Any] | None
    context_text: str | None
    context_references: list[dict[str, Any]]
    grounded: bool
    qdrant_enabled: bool
    rag_confidence_score: float
    trace: dict[str, Any]
    error: str | None = None


class RagEngine(Protocol):
    stack_name: str
    available: bool

    async def retrieve_for_diff(
        self,
        *,
        repo_id: str,
        diff_text: str,
        changed_files: list[str] | None = None,
        limit: int = 8,
    ) -> RagEngineResult: ...

    async def retrieve_for_query(
        self,
        *,
        repo_id: str,
        query: str,
        changed_files: list[str] | None = None,
        limit: int = 8,
        route_hint: str = "auto",
    ) -> RagEngineResult: ...

    async def retrieve_for_repo_bootstrap(
        self,
        *,
        repo_id: str,
        limit: int = 16,
    ) -> RagEngineResult: ...


class LegacyRagEngine:
    stack_name = "legacy"

    def __init__(self, *, vector_store: QdrantClient) -> None:
        self._vector_store = vector_store
        self._retriever = RepoContextRetriever(vector_store=vector_store)

    @property
    def available(self) -> bool:
        return True

    async def retrieve_for_diff(
        self,
        *,
        repo_id: str,
        diff_text: str,
        changed_files: list[str] | None = None,
        limit: int = 8,
    ) -> RagEngineResult:
        started = time.perf_counter()
        chunks, profile = await self._retriever.retrieve_for_diff(
            repo_id=repo_id,
            diff_text=diff_text,
            changed_files=changed_files,
            limit=limit,
        )
        return _result_from_chunks(
            stack=self.stack_name,
            mode="legacy_hybrid",
            chunks=chunks,
            profile=profile,
            qdrant_enabled=self._vector_store.enabled,
            duration_ms=int((time.perf_counter() - started) * 1000),
        )

    async def retrieve_for_query(
        self,
        *,
        repo_id: str,
        query: str,
        changed_files: list[str] | None = None,
        limit: int = 8,
        route_hint: str = "auto",
    ) -> RagEngineResult:
        started = time.perf_counter()
        chunks, profile = await self._retriever.retrieve_for_query(
            repo_id=repo_id,
            query=query,
            changed_files=changed_files,
            limit=limit,
            route_hint=route_hint,
        )
        return _result_from_chunks(
            stack=self.stack_name,
            mode="legacy_hybrid",
            chunks=chunks,
            profile=profile,
            qdrant_enabled=self._vector_store.enabled,
            duration_ms=int((time.perf_counter() - started) * 1000),
        )

    async def retrieve_for_repo_bootstrap(
        self,
        *,
        repo_id: str,
        limit: int = 16,
    ) -> RagEngineResult:
        started = time.perf_counter()
        chunks, profile = await self._retriever.retrieve_for_repo_bootstrap(repo_id=repo_id, limit=limit)
        return _result_from_chunks(
            stack=self.stack_name,
            mode="legacy_bootstrap",
            chunks=chunks,
            profile=profile,
            qdrant_enabled=self._vector_store.enabled,
            duration_ms=int((time.perf_counter() - started) * 1000),
        )


class LangChainRagEngine:
    stack_name = "langchain"

    def __init__(self, *, vector_store: QdrantClient) -> None:
        self._vector_store = vector_store
        self._exact = ExactRetriever()
        self._lexical = LexicalRetriever()
        self._router = QueryRouter()
        self._reranker = ReRanker()
        self._packer = ContextPacker(
            max_chars=settings.KB_CONTEXT_MAX_CHARS,
            max_chunks=settings.KB_CONTEXT_MAX_CHUNKS,
        )
        self._shadow_index = LangChainShadowIndexingService(vector_store=vector_store)
        self._profiles_repo = RepoProfilesRepo()

    @property
    def available(self) -> bool:
        return settings.langchain_enabled

    async def retrieve_for_diff(
        self,
        *,
        repo_id: str,
        diff_text: str,
        changed_files: list[str] | None = None,
        limit: int = 8,
    ) -> RagEngineResult:
        started = time.perf_counter()
        if not self.available:
            return _empty_result(stack=self.stack_name, mode="langchain_unavailable", qdrant_enabled=False)

        signals = _extract_diff_signals(diff_text)
        inferred_files = sorted(set(changed_files or signals.paths))
        lexical_query = _build_lexical_query_from_diff(signals)
        global_document_limit = max(3, settings.KB_LEXICAL_TOP_K // 2)
        if self._shadow_index.available:
            await self._shadow_index.backfill_repo(repo_id=repo_id)

        counts: dict[str, int] = {}
        candidates = []
        candidates.extend(self._exact.retrieve_file_chunks(repo_id=repo_id, paths=inferred_files, per_file_limit=settings.KB_EXACT_TOP_K))
        counts["file_exact"] = len(candidates)
        symbol_candidates = self._exact.retrieve_symbol_chunks(
            repo_id=repo_id,
            symbols=set(signals.symbols),
            per_symbol_limit=max(2, settings.KB_EXACT_TOP_K // 2),
        )
        counts["symbol_exact"] = len(symbol_candidates)
        candidates.extend(symbol_candidates)
        test_candidates = self._exact.retrieve_related_tests(
            repo_id=repo_id,
            changed_files=inferred_files,
            limit=max(4, settings.KB_EXACT_TOP_K // 2),
        )
        counts["test_related"] = len(test_candidates)
        candidates.extend(test_candidates)
        lexical_code = self._lexical.retrieve_code(
            repo_id=repo_id,
            query=lexical_query,
            limit=settings.KB_LEXICAL_TOP_K,
            changed_files=set(inferred_files),
        )
        counts["lexical_code"] = len(lexical_code)
        candidates.extend(lexical_code)
        lexical_docs = self._lexical.retrieve_documents(
            repo_id=repo_id,
            query=lexical_query,
            limit=max(2, settings.KB_LEXICAL_TOP_K // 3),
            tags=["policy", "security", "compliance"],
        )
        counts["lexical_document"] = len(lexical_docs)
        candidates.extend(lexical_docs)
        lexical_global = self._lexical.retrieve_global_documents(query=lexical_query, limit=global_document_limit)
        counts["lexical_global_document"] = len(lexical_global)
        candidates.extend(lexical_global)
        semantic_code = await self._search_vector_candidates(
            query_text=signals.semantic_query,
            filter_payload={"repo_id": repo_id, "type": "chunk"},
            limit=settings.KB_SEMANTIC_TOP_K,
            source="semantic_code",
            changed_files=set(inferred_files),
        )
        counts["semantic_code"] = len(semantic_code)
        candidates.extend(semantic_code)
        semantic_docs = await self._search_vector_candidates(
            query_text=signals.semantic_query,
            filter_payload={"repo_id": repo_id, "type": "kb_document_chunk"},
            limit=max(2, settings.KB_SEMANTIC_TOP_K // 3),
            source="semantic_document",
            required_tags={"policy", "security", "compliance"},
        )
        counts["semantic_document"] = len(semantic_docs)
        candidates.extend(semantic_docs)
        semantic_global = await self._search_vector_candidates(
            query_text=signals.semantic_query,
            filter_payload={"type": "kb_document_chunk"},
            limit=max(3, settings.KB_SEMANTIC_TOP_K // 2),
            source="semantic_global_document",
        )
        counts["semantic_global_document"] = len(semantic_global)
        candidates.extend(semantic_global)

        ranked = self._reranker.rank(
            query=signals.semantic_query,
            candidates=candidates,
            route=QueryRoute.DIFF_REVIEW,
            limit=max(limit * 6, settings.KB_RERANK_TOP_K * 3),
        )
        packed = self._packer.pack(candidates=ranked, route=QueryRoute.DIFF_REVIEW, limit=limit)
        profile = self._get_repo_profile(repo_id=repo_id)
        return _result_from_chunks(
            stack=self.stack_name,
            mode="langchain_hybrid",
            chunks=packed,
            profile=profile,
            qdrant_enabled=self._vector_store.enabled,
            duration_ms=int((time.perf_counter() - started) * 1000),
            trace={
                "route": QueryRoute.DIFF_REVIEW.value,
                "candidate_counts": counts,
                "selected_count": len(packed),
            },
        )

    async def retrieve_for_query(
        self,
        *,
        repo_id: str,
        query: str,
        changed_files: list[str] | None = None,
        limit: int = 8,
        route_hint: str = "auto",
    ) -> RagEngineResult:
        started = time.perf_counter()
        if not self.available:
            return _empty_result(stack=self.stack_name, mode="langchain_unavailable", qdrant_enabled=False)

        if self._shadow_index.available:
            await self._shadow_index.backfill_repo(repo_id=repo_id)
        route = self._router.route_query(query=query, route_hint=route_hint)
        changed_files_set = set(changed_files or [])
        global_document_limit = max(3, settings.KB_LEXICAL_TOP_K // 2)
        counts: dict[str, int] = {}
        candidates = []

        document_source_type = _document_source_type_for_route(route)

        if route in {QueryRoute.REPO_QUERY, QueryRoute.CODE_QUERY, QueryRoute.GENERIC_HYBRID_QUERY, QueryRoute.MULTI_SOURCE_QUERY}:
            exact_hint = self._exact.retrieve_query_hints(repo_id=repo_id, query=query, limit=settings.KB_EXACT_TOP_K)
            counts["file_exact"] = len(exact_hint)
            candidates.extend(exact_hint)
            lexical_code = self._lexical.retrieve_code(
                repo_id=repo_id,
                query=query,
                limit=settings.KB_LEXICAL_TOP_K,
                changed_files=changed_files_set or None,
            )
            counts["lexical_code"] = len(lexical_code)
            candidates.extend(lexical_code)
            semantic_code = await self._search_vector_candidates(
                query_text=query,
                filter_payload={"repo_id": repo_id, "type": "chunk"},
                limit=settings.KB_SEMANTIC_TOP_K,
                source="semantic_code",
                changed_files=changed_files_set or None,
            )
            counts["semantic_code"] = len(semantic_code)
            candidates.extend(semantic_code)
            lexical_global = self._lexical.retrieve_global_documents(query=query, limit=global_document_limit)
            counts["lexical_global_document"] = len(lexical_global)
            candidates.extend(lexical_global)
            semantic_global = await self._search_vector_candidates(
                query_text=query,
                filter_payload={"type": "kb_document_chunk"},
                limit=max(3, settings.KB_SEMANTIC_TOP_K // 2),
                source="semantic_global_document",
                source_type=document_source_type,
            )
            counts["semantic_global_document"] = len(semantic_global)
            candidates.extend(semantic_global)

        if route in {
            QueryRoute.POLICY_QUERY,
            QueryRoute.DOCUMENT_QUERY,
            QueryRoute.PDF_QUERY,
            QueryRoute.WEB_QUERY,
            QueryRoute.MARKDOWN_QUERY,
            QueryRoute.SQL_QUERY,
            QueryRoute.GENERIC_HYBRID_QUERY,
            QueryRoute.MULTI_SOURCE_QUERY,
        }:
            desired_tags = ["policy", "security", "compliance"] if route == QueryRoute.POLICY_QUERY else []
            lexical_docs = self._lexical.retrieve_documents(
                repo_id=repo_id,
                query=query,
                limit=max(4, settings.KB_LEXICAL_TOP_K // 2),
                source_type=document_source_type,
                tags=desired_tags or None,
            )
            counts["lexical_document"] = len(lexical_docs)
            candidates.extend(lexical_docs)
            semantic_docs = await self._search_vector_candidates(
                query_text=query,
                filter_payload={"repo_id": repo_id, "type": "kb_document_chunk"},
                limit=max(4, settings.KB_SEMANTIC_TOP_K // 2),
                source="semantic_document",
                source_type=document_source_type,
                required_tags=set(desired_tags),
            )
            counts["semantic_document"] = len(semantic_docs)
            candidates.extend(semantic_docs)

        ranked = self._reranker.rank(
            query=query,
            candidates=candidates,
            route=route,
            limit=max(limit * 6, settings.KB_RERANK_TOP_K * 3),
        )
        packed = self._packer.pack(candidates=ranked, route=route, limit=limit)
        profile = self._get_repo_profile(repo_id=repo_id)
        return _result_from_chunks(
            stack=self.stack_name,
            mode="langchain_hybrid",
            chunks=packed,
            profile=profile,
            qdrant_enabled=self._vector_store.enabled,
            duration_ms=int((time.perf_counter() - started) * 1000),
            trace={
                "route": route.value,
                "candidate_counts": counts,
                "selected_count": len(packed),
            },
        )

    async def retrieve_for_repo_bootstrap(
        self,
        *,
        repo_id: str,
        limit: int = 16,
    ) -> RagEngineResult:
        started = time.perf_counter()
        if not self.available:
            return _empty_result(stack=self.stack_name, mode="langchain_unavailable", qdrant_enabled=False)

        if self._shadow_index.available:
            await self._shadow_index.backfill_repo(repo_id=repo_id)
        seed_queries = [
            "repository architecture overview entry points main modules",
            "authentication authorization security middleware",
            "configuration environment variables deployment",
            "database models repositories migrations",
            "ci pipeline workflows quality checks",
        ]
        counts: dict[str, int] = {}
        candidates = []
        for query in seed_queries:
            repo_bootstrap_docs = await self._search_vector_documents(
                query_text=query,
                filter_payload={"repo_id": repo_id, "type": "chunk"},
                limit=max(limit, settings.KB_SEMANTIC_TOP_K),
                source="repo_bootstrap",
            )
            repo_bootstrap = documents_to_candidates(repo_bootstrap_docs)
            counts["repo_bootstrap"] = counts.get("repo_bootstrap", 0) + len(repo_bootstrap)
            candidates.extend(repo_bootstrap)

        ranked = self._reranker.rank(
            query=" ".join(seed_queries),
            candidates=candidates,
            route=QueryRoute.GENERIC_HYBRID_QUERY,
            limit=max(limit * 4, settings.KB_RERANK_TOP_K * 2),
        )
        packed = self._packer.pack(candidates=ranked, route=QueryRoute.GENERIC_HYBRID_QUERY, limit=limit)
        profile = self._get_repo_profile(repo_id=repo_id)
        return _result_from_chunks(
            stack=self.stack_name,
            mode="langchain_bootstrap",
            chunks=packed,
            profile=profile,
            qdrant_enabled=self._vector_store.enabled,
            duration_ms=int((time.perf_counter() - started) * 1000),
            trace={"candidate_counts": counts, "selected_count": len(packed)},
        )

    async def _search_vector_candidates(
        self,
        *,
        query_text: str,
        filter_payload: dict[str, Any],
        limit: int,
        source: str,
        source_type: str | None = None,
        changed_files: set[str] | None = None,
        required_tags: set[str] | None = None,
    ) -> list[Any]:
        query_filter = dict(filter_payload)
        if source_type:
            query_filter["source_type"] = source_type
        docs = await self._search_vector_documents(
            query_text=query_text,
            filter_payload=query_filter,
            limit=max(limit * 4, limit),
            source=source,
        )
        candidates = documents_to_candidates(docs)
        if changed_files:
            filtered = [candidate for candidate in candidates if candidate.chunk.path in changed_files]
            if filtered:
                candidates = filtered
        if required_tags:
            candidates = [
                candidate
                for candidate in candidates
                if required_tags.intersection({tag.lower() for tag in candidate.chunk.tags})
            ]
        return candidates[:limit]

    async def _search_vector_documents(
        self,
        *,
        query_text: str,
        filter_payload: dict[str, Any],
        limit: int,
        source: str,
    ) -> list[Any]:
        if not self._shadow_index.available:
            return []
        retriever = CandidateDocumentRetriever(
            retriever_name=source,
            loader=lambda query: self._load_vector_candidates(
                query=query,
                filter_payload=filter_payload,
                limit=limit,
                source=source,
            ),
        )
        return await retriever.ainvoke(query_text)

    async def _load_vector_candidates(
        self,
        *,
        query: str,
        filter_payload: dict[str, Any],
        limit: int,
        source: str,
    ) -> list[Any]:
        hits = await self._shadow_index.search(
            query_text=query,
            filter_payload=filter_payload,
            limit=limit,
            use_active_alias=settings.langchain_primary_stack == "langchain",
        )
        return vector_hits_to_documents(hits, source=source)

    def _get_repo_profile(self, *, repo_id: str) -> dict[str, Any] | None:
        profile = self._profiles_repo.get_profile(repo_id)
        if profile and isinstance(profile.profile, dict):
            return dict(profile.profile)
        return None


def _empty_result(*, stack: str, mode: str, qdrant_enabled: bool) -> RagEngineResult:
    return RagEngineResult(
        stack=stack,
        mode=mode,
        chunks=[],
        profile=None,
        context_text=None,
        context_references=[],
        grounded=False,
        qdrant_enabled=qdrant_enabled,
        rag_confidence_score=0.0,
        trace={"selected_count": 0},
    )


def _result_from_chunks(
    *,
    stack: str,
    mode: str,
    chunks: list[RetrievedContextChunk],
    profile: dict[str, Any] | None,
    qdrant_enabled: bool,
    duration_ms: int,
    trace: dict[str, Any] | None = None,
) -> RagEngineResult:
    context_text, used_chunks = build_llm_context_with_chunks(chunks, max_chars=6000)
    normalized_context = context_text if context_text != "[NO_CONTEXT_AVAILABLE]" else None
    references, internal_references, invalid_references = _build_reference_payloads(used_chunks)
    grounded = bool(normalized_context and references)
    warnings: list[str] = []
    if normalized_context and not references:
        normalized_context = None
        warnings.append("no_valid_citations_for_prompt_context")
    return RagEngineResult(
        stack=stack,
        mode=mode,
        chunks=chunks,
        profile=profile,
        context_text=normalized_context,
        context_references=references,
        grounded=grounded,
        qdrant_enabled=qdrant_enabled,
        rag_confidence_score=_rag_confidence_score(used_chunks or chunks),
        trace={
            "duration_ms": duration_ms,
            "selected_count": len(chunks),
            "prompt_chunks_used": len(used_chunks),
            "references_count": len(references),
            "invalid_references_count": invalid_references,
            "citation_validation_passed": bool(references) if used_chunks else False,
            "prompt_reference_metadata": internal_references,
            "warnings": warnings,
            **(trace or {}),
        },
    )


def _kb_reference(item: RetrievedContextChunk) -> dict[str, Any]:
    return {
        "path": item.path,
        "title": item.title,
        "source": item.source,
        "source_type": item.source_type,
        "chunk_type": item.chunk_type,
        "symbol_name": item.symbol_name,
        "source_uri": item.source_uri,
        "page": item.page,
        "section_title": item.section_title,
        "heading_path": list(item.heading_path),
        "entity_type": item.entity_type,
        "entity_name": item.entity_name,
        "line_start": item.start_line,
        "line_end": item.end_line,
        "domain": item.domain,
        "document_version": item.document_version or item.version,
        "crawl_timestamp": item.crawl_timestamp,
        "score": round(float(item.score_final or item.score), 4),
        "tags": list(item.tags),
    }


def _internal_kb_reference(item: RetrievedContextChunk) -> dict[str, Any]:
    source_id = item.source_id or item.document_id or item.path
    chunk_id = item.chunk_id or (f"{item.document_id}:{item.chunk_index}" if item.document_id else f"{item.path}:{item.chunk_index}")
    return {
        "source_type": item.source_type or item.file_type,
        "source_id": source_id,
        "repo_id": item.repo_id,
        "path": item.path,
        "chunk_id": chunk_id,
        "chunk_index": item.chunk_index,
        "line_start": item.start_line,
        "line_end": item.end_line,
        "document_version": item.document_version,
        "section_title": item.section_title or item.title,
        "heading_path": list(item.heading_path),
        "page": item.page,
        "source_uri": item.source_uri,
        "entity_type": item.entity_type,
        "entity_name": item.entity_name,
        "domain": item.domain,
        "crawl_timestamp": item.crawl_timestamp,
        "retrieval_reason": item.retrieval_reason,
        "retriever_channel": item.retriever_channel or item.source,
        "score_raw": round(float(item.score_raw or item.score), 4),
        "score_final": round(float(item.score_final or item.score), 4),
        "collection_version": item.collection_version,
    }


def _build_reference_payloads(chunks: list[RetrievedContextChunk]) -> tuple[list[dict[str, Any]], list[dict[str, Any]], int]:
    public_references: list[dict[str, Any]] = []
    internal_references: list[dict[str, Any]] = []
    invalid_references = 0
    for item in chunks[:12]:
        internal_reference = _internal_kb_reference(item)
        if not _is_valid_reference(item, internal_reference):
            invalid_references += 1
            continue
        internal_references.append(internal_reference)
        public_references.append(_kb_reference(item))
    return public_references, internal_references, invalid_references


def _is_valid_reference(item: RetrievedContextChunk, internal_reference: dict[str, Any]) -> bool:
    if not item.path or not item.path.strip():
        return False
    if not item.content or not item.content.strip():
        return False
    if not item.source or not item.source.strip():
        return False
    if not internal_reference.get("source_id"):
        return False
    if not internal_reference.get("chunk_id"):
        return False
    if not internal_reference.get("retriever_channel"):
        return False
    line_start = internal_reference.get("line_start")
    line_end = internal_reference.get("line_end")
    if isinstance(line_start, int) and isinstance(line_end, int) and line_start > line_end:
        return False
    return True


def _rag_confidence_score(chunks: list[RetrievedContextChunk]) -> float:
    if not chunks:
        return 0.0
    top_scores = [max(0.0, min(1.0, float(item.score))) for item in chunks[:4]]
    if not top_scores:
        return 0.0
    return round(sum(top_scores) / len(top_scores), 4)


def build_rag_engines(*, vector_store: QdrantClient) -> tuple[RagEngine, RagEngine | None]:
    legacy = LegacyRagEngine(vector_store=vector_store)
    if not settings.langchain_enabled:
        return legacy, None
    langchain = LangChainRagEngine(vector_store=vector_store)
    return legacy, langchain if langchain.available else None


def _document_source_type_for_route(route: QueryRoute) -> str | None:
    mapping = {
        QueryRoute.PDF_QUERY: "pdf",
        QueryRoute.WEB_QUERY: "web",
        QueryRoute.MARKDOWN_QUERY: "markdown",
        QueryRoute.SQL_QUERY: "sql",
    }
    return mapping.get(route)
