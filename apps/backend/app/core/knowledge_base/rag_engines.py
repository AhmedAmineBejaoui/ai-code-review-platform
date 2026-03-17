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
from app.core.knowledge_base.repo_path_resolver import resolve_repo_context_repo_path
from app.core.knowledge_base.retrieval_models import QueryRoute, RetrievedContextChunk
from app.core.knowledge_base.retriever import (
    DiffSignals,
    RepoContextRetriever,
    _build_lexical_query_from_diff,
    _extract_diff_signals,
    build_llm_context,
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
        return self._shadow_index.available

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

        await self._shadow_index.backfill_repo(repo_id=repo_id)
        route = self._router.route_query(query=query, route_hint=route_hint)
        changed_files_set = set(changed_files or [])
        global_document_limit = max(3, settings.KB_LEXICAL_TOP_K // 2)
        counts: dict[str, int] = {}
        candidates = []

        if route in {QueryRoute.REPO_QUERY, QueryRoute.GENERIC_HYBRID_QUERY}:
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
            )
            counts["semantic_global_document"] = len(semantic_global)
            candidates.extend(semantic_global)

        if route in {QueryRoute.POLICY_QUERY, QueryRoute.DOCUMENT_QUERY, QueryRoute.GENERIC_HYBRID_QUERY}:
            desired_tags = ["policy", "security", "compliance"] if route == QueryRoute.POLICY_QUERY else []
            lexical_docs = self._lexical.retrieve_documents(
                repo_id=repo_id,
                query=query,
                limit=max(4, settings.KB_LEXICAL_TOP_K // 2),
                tags=desired_tags or None,
            )
            counts["lexical_document"] = len(lexical_docs)
            candidates.extend(lexical_docs)
            semantic_docs = await self._search_vector_candidates(
                query_text=query,
                filter_payload={"repo_id": repo_id, "type": "kb_document_chunk"},
                limit=max(4, settings.KB_SEMANTIC_TOP_K // 2),
                source="semantic_document",
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
        changed_files: set[str] | None = None,
        required_tags: set[str] | None = None,
    ) -> list[Any]:
        docs = await self._search_vector_documents(
            query_text=query_text,
            filter_payload=filter_payload,
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
    references = [_kb_reference(item) for item in chunks[:12]]
    return RagEngineResult(
        stack=stack,
        mode=mode,
        chunks=chunks,
        profile=profile,
        context_text=build_llm_context(chunks)[:6000] if chunks else None,
        context_references=references,
        grounded=bool(chunks),
        qdrant_enabled=qdrant_enabled,
        rag_confidence_score=_rag_confidence_score(chunks),
        trace={
            "duration_ms": duration_ms,
            "selected_count": len(chunks),
            "references_count": len(references),
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
        "score": round(float(item.score), 4),
        "tags": list(item.tags),
    }


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
