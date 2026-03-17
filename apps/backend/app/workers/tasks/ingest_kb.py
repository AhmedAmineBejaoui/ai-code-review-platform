from __future__ import annotations

import asyncio
from typing import Any

from app.core.knowledge_base.ingestor import RepoContextIngestor
from app.core.knowledge_base.rag_engines import build_rag_engines
from app.core.knowledge_base.retriever import build_llm_context
from app.core.review_intelligence.engines import build_langchain_review_generation_engine, build_legacy_review_generation_engine
from app.core.summarization import SummaryService
from app.data.repos.repo_profiles_repo import RepoProfilesRepo
from app.integrations.llm_providers.ollama_client import OllamaClient
from app.integrations.vector_store.qdrant_client import QdrantClient
from app.settings import settings
from app.workers.celery_app import celery_app


def _select_primary_review_engine():
    if settings.langchain_primary_stack == "langchain" and settings.langchain_enabled:
        engine = build_langchain_review_generation_engine()
        if engine.available:
            return engine
    return build_legacy_review_generation_engine()


@celery_app.task(name="kb.onboard_repo", bind=True)
def run_repo_onboarding(self, repo_id: str, repo_path: str, source: str = "event") -> dict[str, Any]:
    return asyncio.run(_run_repo_onboarding_async(repo_id=repo_id, repo_path=repo_path, source=source))


@celery_app.task(name="kb.process_diff", bind=True)
def run_repo_diff_processing(
    self,
    repo_id: str,
    repo_path: str,
    diff_text: str = "",
    base_ref: str | None = None,
    head_ref: str = "HEAD",
    source: str = "event",
) -> dict[str, Any]:
    return asyncio.run(
        _run_repo_diff_processing_async(
            repo_id=repo_id,
            repo_path=repo_path,
            diff_text=diff_text,
            base_ref=base_ref,
            head_ref=head_ref,
            source=source,
        )
    )


async def _run_repo_onboarding_async(*, repo_id: str, repo_path: str, source: str) -> dict[str, Any]:
    qdrant_client = QdrantClient()
    ingestor = RepoContextIngestor(vector_store=qdrant_client)
    legacy_rag, langchain_rag = build_rag_engines(vector_store=qdrant_client)
    rag_engine = langchain_rag if settings.langchain_primary_stack == "langchain" and langchain_rag is not None else legacy_rag
    review_engine = _select_primary_review_engine()

    index_result = await ingestor.onboard_repo(repo_id=repo_id, repo_path=repo_path, source=source, force_full=True)
    bootstrap_result = await rag_engine.retrieve_for_repo_bootstrap(repo_id=repo_id, limit=16)
    overview_chunks = bootstrap_result.chunks
    profile = bootstrap_result.profile
    overview_context = bootstrap_result.context_text or build_llm_context(overview_chunks)
    overview_summary: str | None = None
    overview_highlights: list[str] = []
    summary_source = "none"
    summary_fallback = False

    if profile:
        try:
            generated = review_engine.generate_repo_overview(
                repo_id=repo_id,
                repo_profile=profile,
                context_excerpt=overview_context,
            )
            overview_summary = generated.summary
            overview_highlights = generated.highlights
            summary_source = review_engine.stack_name
        except Exception:
            fallback = SummaryService.fallback_repo_overview(repo_id=repo_id, repo_profile=profile)
            overview_summary = fallback.summary
            overview_highlights = fallback.highlights
            summary_source = "heuristic"
            summary_fallback = True

    if profile:
        enriched_profile = dict(profile)
        enriched_profile["llm_overview"] = {
            "summary": overview_summary,
            "highlights": overview_highlights,
            "source": summary_source,
            "fallback_used": summary_fallback,
            "model": settings.OLLAMA_MODEL,
        }
        RepoProfilesRepo().upsert_profile(
            repo_id=repo_id,
            repo_path=repo_path,
            indexed_commit=_as_optional_str(profile.get("indexed_commit")),
            default_branch=_as_optional_str(profile.get("default_branch")),
            profile=enriched_profile,
            overview_context=overview_context,
        )

    return {
        "status": "ok",
        "mode": "onboarding",
        "repo_id": repo_id,
        "repo_path": repo_path,
        "chunks_upserted": index_result.chunks_upserted,
        "files_indexed": index_result.files_indexed,
        "overview_chunks": len(overview_chunks),
        "overview_summary": overview_summary,
        "summary_source": summary_source,
        "summary_fallback": summary_fallback,
    }


async def _run_repo_diff_processing_async(
    *,
    repo_id: str,
    repo_path: str,
    diff_text: str,
    base_ref: str | None,
    head_ref: str,
    source: str,
) -> dict[str, Any]:
    qdrant_client = QdrantClient()
    ingestor = RepoContextIngestor(vector_store=qdrant_client)
    legacy_rag, langchain_rag = build_rag_engines(vector_store=qdrant_client)
    rag_engine = langchain_rag if settings.langchain_primary_stack == "langchain" and langchain_rag is not None else legacy_rag

    update_result = await ingestor.update_repo_incremental(
        repo_id=repo_id,
        repo_path=repo_path,
        base_ref=base_ref,
        head_ref=head_ref,
        source=source,
    )
    if diff_text.strip():
        diff_result = await rag_engine.retrieve_for_diff(repo_id=repo_id, diff_text=diff_text, limit=12)
        diff_chunks = diff_result.chunks
        profile = diff_result.profile
        llm_context = diff_result.context_text or build_llm_context(diff_chunks)
    else:
        diff_chunks = []
        profile = await ingestor.get_repo_profile(repo_id)
        llm_context = None

    if profile:
        existing_profile = RepoProfilesRepo().get_profile(repo_id)
        enriched_profile = dict(profile)
        if existing_profile and isinstance(existing_profile.profile, dict):
            previous_overview = existing_profile.profile.get("llm_overview")
            if isinstance(previous_overview, dict):
                enriched_profile["llm_overview"] = previous_overview

        RepoProfilesRepo().upsert_profile(
            repo_id=repo_id,
            repo_path=repo_path,
            indexed_commit=_as_optional_str(profile.get("indexed_commit")),
            default_branch=_as_optional_str(profile.get("default_branch")),
            profile=enriched_profile,
            overview_context=llm_context,
        )

    return {
        "status": "ok",
        "mode": "diff",
        "repo_id": repo_id,
        "repo_path": repo_path,
        "files_indexed": update_result.files_indexed,
        "chunks_upserted": update_result.chunks_upserted,
        "changed_files": update_result.changed_files,
        "context_chunks": len(diff_chunks),
    }


def _as_optional_str(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    normalized = value.strip()
    return normalized or None
