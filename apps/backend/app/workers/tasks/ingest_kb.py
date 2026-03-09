from __future__ import annotations

import asyncio
from typing import Any

from app.core.knowledge_base.ingestor import RepoContextIngestor
from app.core.knowledge_base.retriever import RepoContextRetriever, build_llm_context
from app.data.repos.repo_profiles_repo import RepoProfilesRepo
from app.integrations.vector_store.qdrant_client import QdrantClient
from app.workers.celery_app import celery_app


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
    retriever = RepoContextRetriever(vector_store=qdrant_client)

    index_result = await ingestor.onboard_repo(repo_id=repo_id, repo_path=repo_path, source=source, force_full=True)
    overview_chunks, profile = await retriever.retrieve_for_repo_bootstrap(repo_id=repo_id, limit=16)
    overview_context = build_llm_context(overview_chunks)

    if profile:
        RepoProfilesRepo().upsert_profile(
            repo_id=repo_id,
            repo_path=repo_path,
            indexed_commit=_as_optional_str(profile.get("indexed_commit")),
            default_branch=_as_optional_str(profile.get("default_branch")),
            profile=profile,
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
    retriever = RepoContextRetriever(vector_store=qdrant_client)

    update_result = await ingestor.update_repo_incremental(
        repo_id=repo_id,
        repo_path=repo_path,
        base_ref=base_ref,
        head_ref=head_ref,
        source=source,
    )
    if diff_text.strip():
        diff_chunks, profile = await retriever.retrieve_for_diff(repo_id=repo_id, diff_text=diff_text, limit=12)
        llm_context = build_llm_context(diff_chunks)
    else:
        diff_chunks = []
        profile = await ingestor.get_repo_profile(repo_id)
        llm_context = None

    if profile:
        RepoProfilesRepo().upsert_profile(
            repo_id=repo_id,
            repo_path=repo_path,
            indexed_commit=_as_optional_str(profile.get("indexed_commit")),
            default_branch=_as_optional_str(profile.get("default_branch")),
            profile=profile,
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
