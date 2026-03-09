from __future__ import annotations

import logging
from typing import Any
import asyncio

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from app.api.deps import get_qdrant_client
from app.api.errors import ApiError
from app.api.middleware.auth import AuthenticatedPrincipal, require_permission
from app.core.knowledge_base.ingestor import RepoContextIngestor, RepoIndexResult
from app.core.knowledge_base.retriever import RepoContextRetriever, RetrievedContextChunk, build_llm_context
from app.integrations.vector_store.qdrant_client import QdrantClient
from app.data.repos.repo_profiles_repo import RepoProfilesRepo
from app.settings import settings
from app.workers.tasks.ingest_kb import run_repo_diff_processing, run_repo_onboarding

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/kb", tags=["knowledge-base"])


class RepoOnboardRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    repo_id: str = Field(min_length=1, max_length=255)
    repo_path: str = Field(min_length=1, max_length=4096)
    source: str = Field(default="manual", min_length=1, max_length=64)
    force_full: bool = False


class RepoUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    repo_id: str = Field(min_length=1, max_length=255)
    repo_path: str = Field(min_length=1, max_length=4096)
    base_ref: str | None = Field(default=None, max_length=255)
    head_ref: str = Field(default="HEAD", min_length=1, max_length=255)
    source: str = Field(default="manual", min_length=1, max_length=64)


class ContextByDiffRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    repo_id: str = Field(min_length=1, max_length=255)
    diff_text: str = Field(min_length=1)
    changed_files: list[str] = Field(default_factory=list, max_length=200)
    limit: int = Field(default=8, ge=1, le=30)


class ContextByQueryRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    repo_id: str = Field(min_length=1, max_length=255)
    query: str = Field(min_length=1)
    changed_files: list[str] = Field(default_factory=list, max_length=200)
    limit: int = Field(default=8, ge=1, le=30)


class RepoBootstrapContextRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    repo_id: str = Field(min_length=1, max_length=255)
    limit: int = Field(default=16, ge=1, le=40)


class RepoIndexResponse(BaseModel):
    repo_id: str
    repo_path: str
    mode: str
    collection_name: str
    indexed_commit: str | None
    default_branch: str | None
    files_seen: int
    files_indexed: int
    chunks_upserted: int
    chunks_deleted: int
    changed_files: list[str]
    started_at: str
    completed_at: str


class ContextChunkResponse(BaseModel):
    score: float
    path: str
    chunk_index: int
    language: str
    content: str
    token_count: int
    file_type: str | None = None
    chunk_type: str | None = None
    symbol_name: str | None = None
    start_line: int | None = None
    end_line: int | None = None
    source: str | None = None


class ContextResponse(BaseModel):
    repo_id: str
    chunks: list[ContextChunkResponse]
    profile: dict[str, Any] | None = None


class RepoProfileResponse(BaseModel):
    repo_id: str
    profile: dict[str, Any] | None = None
    sql_profile: dict[str, Any] | None = None
    overview_context: str | None = None


class AutomationOnboardRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    repo_id: str = Field(min_length=1, max_length=255)
    repo_path: str = Field(min_length=1, max_length=4096)
    source: str = Field(default="manual", min_length=1, max_length=64)


class AutomationDiffRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    repo_id: str = Field(min_length=1, max_length=255)
    repo_path: str = Field(min_length=1, max_length=4096)
    diff_text: str = Field(default="")
    base_ref: str | None = Field(default=None, max_length=255)
    head_ref: str = Field(default="HEAD", min_length=1, max_length=255)
    source: str = Field(default="manual", min_length=1, max_length=64)


class AutomationTaskResponse(BaseModel):
    task_name: str
    task_id: str
    status: str = "QUEUED"


def _map_index_result(result: RepoIndexResult) -> RepoIndexResponse:
    return RepoIndexResponse(
        repo_id=result.repo_id,
        repo_path=result.repo_path,
        mode=result.mode,
        collection_name=result.collection_name,
        indexed_commit=result.indexed_commit,
        default_branch=result.default_branch,
        files_seen=result.files_seen,
        files_indexed=result.files_indexed,
        chunks_upserted=result.chunks_upserted,
        chunks_deleted=result.chunks_deleted,
        changed_files=result.changed_files,
        started_at=result.started_at,
        completed_at=result.completed_at,
    )


def _map_chunk(item: RetrievedContextChunk) -> ContextChunkResponse:
    return ContextChunkResponse(
        score=item.score,
        path=item.path,
        chunk_index=item.chunk_index,
        language=item.language,
        content=item.content,
        token_count=item.token_count,
        file_type=item.file_type,
        chunk_type=item.chunk_type,
        symbol_name=item.symbol_name,
        start_line=item.start_line,
        end_line=item.end_line,
        source=item.source,
    )


def _to_api_error(exc: Exception) -> ApiError:
    if isinstance(exc, ValueError):
        return ApiError(status_code=400, code="INVALID_REQUEST", message=str(exc))
    if isinstance(exc, RuntimeError):
        return ApiError(status_code=400, code="FEATURE_NOT_AVAILABLE", message=str(exc))
    logger.exception("Knowledge-base operation failed")
    return ApiError(status_code=500, code="KB_INTERNAL_ERROR", message="Knowledge-base operation failed")


@router.post("/onboard", response_model=RepoIndexResponse)
async def onboard_repo(
    payload: RepoOnboardRequest,
    _principal: AuthenticatedPrincipal | None = Depends(require_permission("analyses.write")),
    vector_store: QdrantClient = Depends(get_qdrant_client),
) -> RepoIndexResponse:
    ingestor = RepoContextIngestor(vector_store=vector_store)
    try:
        result = await ingestor.onboard_repo(
            repo_id=payload.repo_id,
            repo_path=payload.repo_path,
            source=payload.source,
            force_full=payload.force_full,
        )
        # Auto-bootstrap retrieval for a newly indexed repo.
        retriever = RepoContextRetriever(vector_store=vector_store)
        bootstrap_chunks, profile = await retriever.retrieve_for_repo_bootstrap(repo_id=payload.repo_id, limit=16)
        if profile:
            await asyncio.to_thread(
                RepoProfilesRepo().upsert_profile,
                repo_id=payload.repo_id,
                repo_path=payload.repo_path,
                indexed_commit=str(profile.get("indexed_commit") or "") or None,
                default_branch=str(profile.get("default_branch") or "") or None,
                profile=profile,
                overview_context=build_llm_context(bootstrap_chunks),
            )
        return _map_index_result(result)
    except Exception as exc:  # noqa: BLE001
        raise _to_api_error(exc) from exc


@router.post("/update", response_model=RepoIndexResponse)
async def update_repo(
    payload: RepoUpdateRequest,
    _principal: AuthenticatedPrincipal | None = Depends(require_permission("analyses.write")),
    vector_store: QdrantClient = Depends(get_qdrant_client),
) -> RepoIndexResponse:
    ingestor = RepoContextIngestor(vector_store=vector_store)
    try:
        result = await ingestor.update_repo_incremental(
            repo_id=payload.repo_id,
            repo_path=payload.repo_path,
            base_ref=payload.base_ref,
            head_ref=payload.head_ref,
            source=payload.source,
        )
        return _map_index_result(result)
    except Exception as exc:  # noqa: BLE001
        raise _to_api_error(exc) from exc


@router.get("/repos/{repo_id}/profile", response_model=RepoProfileResponse)
async def get_repo_profile(
    repo_id: str,
    _principal: AuthenticatedPrincipal | None = Depends(require_permission("analyses.read")),
    vector_store: QdrantClient = Depends(get_qdrant_client),
) -> RepoProfileResponse:
    retriever = RepoContextRetriever(vector_store=vector_store)
    try:
        profile = await retriever.get_repo_profile(repo_id)
        sql_profile = await asyncio.to_thread(RepoProfilesRepo().get_profile, repo_id)
        return RepoProfileResponse(
            repo_id=repo_id,
            profile=profile,
            sql_profile=sql_profile.profile if sql_profile else None,
            overview_context=sql_profile.overview_context if sql_profile else None,
        )
    except Exception as exc:  # noqa: BLE001
        raise _to_api_error(exc) from exc


@router.post("/context/query", response_model=ContextResponse)
async def get_context_for_query(
    payload: ContextByQueryRequest,
    _principal: AuthenticatedPrincipal | None = Depends(require_permission("analyses.read")),
    vector_store: QdrantClient = Depends(get_qdrant_client),
) -> ContextResponse:
    retriever = RepoContextRetriever(vector_store=vector_store)
    try:
        chunks, profile = await retriever.retrieve_for_query(
            repo_id=payload.repo_id,
            query=payload.query,
            changed_files=payload.changed_files or None,
            limit=payload.limit,
        )
        return ContextResponse(
            repo_id=payload.repo_id,
            chunks=[_map_chunk(item) for item in chunks],
            profile=profile,
        )
    except Exception as exc:  # noqa: BLE001
        raise _to_api_error(exc) from exc


@router.post("/context/diff", response_model=ContextResponse)
async def get_context_for_diff(
    payload: ContextByDiffRequest,
    _principal: AuthenticatedPrincipal | None = Depends(require_permission("analyses.read")),
    vector_store: QdrantClient = Depends(get_qdrant_client),
) -> ContextResponse:
    retriever = RepoContextRetriever(vector_store=vector_store)
    try:
        chunks, profile = await retriever.retrieve_for_diff(
            repo_id=payload.repo_id,
            diff_text=payload.diff_text,
            changed_files=payload.changed_files or None,
            limit=payload.limit,
        )
        return ContextResponse(
            repo_id=payload.repo_id,
            chunks=[_map_chunk(item) for item in chunks],
            profile=profile,
        )
    except Exception as exc:  # noqa: BLE001
        raise _to_api_error(exc) from exc


@router.post("/context/bootstrap", response_model=ContextResponse)
async def get_bootstrap_context_for_repo(
    payload: RepoBootstrapContextRequest,
    _principal: AuthenticatedPrincipal | None = Depends(require_permission("analyses.read")),
    vector_store: QdrantClient = Depends(get_qdrant_client),
) -> ContextResponse:
    retriever = RepoContextRetriever(vector_store=vector_store)
    try:
        chunks, profile = await retriever.retrieve_for_repo_bootstrap(
            repo_id=payload.repo_id,
            limit=payload.limit,
        )
        return ContextResponse(
            repo_id=payload.repo_id,
            chunks=[_map_chunk(item) for item in chunks],
            profile=profile,
        )
    except Exception as exc:  # noqa: BLE001
        raise _to_api_error(exc) from exc


@router.post("/automation/onboard", response_model=AutomationTaskResponse)
async def automate_onboard_repo(
    payload: AutomationOnboardRequest,
    _principal: AuthenticatedPrincipal | None = Depends(require_permission("analyses.write")),
) -> AutomationTaskResponse:
    try:
        async_result = run_repo_onboarding.apply_async(
            args=[payload.repo_id, payload.repo_path, payload.source],
            queue=settings.ANALYSIS_QUEUE_NAME,
        )
        return AutomationTaskResponse(task_name="kb.onboard_repo", task_id=str(async_result.id or ""))
    except Exception as exc:  # noqa: BLE001
        raise _to_api_error(exc) from exc


@router.post("/automation/diff", response_model=AutomationTaskResponse)
async def automate_process_diff(
    payload: AutomationDiffRequest,
    _principal: AuthenticatedPrincipal | None = Depends(require_permission("analyses.write")),
) -> AutomationTaskResponse:
    try:
        async_result = run_repo_diff_processing.apply_async(
            args=[
                payload.repo_id,
                payload.repo_path,
                payload.diff_text,
                payload.base_ref,
                payload.head_ref,
                payload.source,
            ],
            queue=settings.ANALYSIS_QUEUE_NAME,
        )
        return AutomationTaskResponse(task_name="kb.process_diff", task_id=str(async_result.id or ""))
    except Exception as exc:  # noqa: BLE001
        raise _to_api_error(exc) from exc
