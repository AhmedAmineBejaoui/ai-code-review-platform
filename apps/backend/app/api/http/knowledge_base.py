from __future__ import annotations

import asyncio
import json
import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from app.api.deps import get_qdrant_client
from app.api.errors import ApiError
from app.api.middleware.auth import AuthenticatedPrincipal, require_permission
from app.data.database import get_engine
from app.core.knowledge_base.ingestor import RepoContextIngestor, RepoIndexResult
from app.core.knowledge_base.retriever import RepoContextRetriever, RetrievedContextChunk, build_llm_context
from app.core.summarization import SummaryService
from app.integrations.llm_providers.ollama_client import OllamaClient
from app.integrations.vector_store.qdrant_client import QdrantClient, QdrantPoint
from app.data.repos.repo_profiles_repo import RepoProfilesRepo
from app.settings import settings
from app.core.knowledge_base.embeddings import hash_embed_text
from sqlalchemy import text
from app.workers.tasks.ingest_kb import run_repo_diff_processing, run_repo_onboarding

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/kb", tags=["knowledge-base"])

_SUMMARY_SERVICE = SummaryService(
    llm_client=OllamaClient(
        base_url=settings.OLLAMA_BASE_URL,
        model=settings.OLLAMA_MODEL,
        timeout_s=settings.OLLAMA_TIMEOUT_SECONDS,
    )
)


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


class RepoProfileListItemResponse(BaseModel):
    repo_id: str
    repo_path: str | None = None
    indexed_commit: str | None = None
    default_branch: str | None = None
    profile: dict[str, Any] = Field(default_factory=dict)
    overview_context: str | None = None
    updated_at: str | None = None


class RepoProfileListResponse(BaseModel):
    items: list[RepoProfileListItemResponse]


class DocumentIngestRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    repo_id: str = Field(min_length=1, max_length=255)
    title: str = Field(min_length=1, max_length=500)
    source_type: str = Field(default="markdown", min_length=1, max_length=64)
    path_or_url: str | None = Field(default=None, max_length=4096)
    content: str = Field(min_length=1, max_length=2_000_000)
    tags: list[str] = Field(default_factory=list, max_length=64)
    doc_version: int = Field(default=1, ge=1, le=10_000)


class DocumentIngestResponse(BaseModel):
    doc_id: str
    repo_id: str
    title: str
    chunks: int
    source_type: str


class DocumentSearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    repo_id: str = Field(min_length=1, max_length=255)
    query: str = Field(min_length=1, max_length=4000)
    source_type: str | None = Field(default=None, max_length=64)
    tags: list[str] = Field(default_factory=list, max_length=32)
    limit: int = Field(default=8, ge=1, le=30)


class CitationResponse(BaseModel):
    doc_id: str
    title: str
    source_type: str
    excerpt: str
    score: float
    path_or_url: str | None = None
    chunk_index: int


class DocumentSearchResponse(BaseModel):
    repo_id: str
    citations: list[CitationResponse]


def _chunk_text(content: str, *, chunk_size: int = 2400, overlap: int = 250) -> list[str]:
    clean = content.strip()
    if not clean:
        return []

    chunks: list[str] = []
    start = 0
    while start < len(clean):
        end = min(len(clean), start + chunk_size)
        part = clean[start:end].strip()
        if part:
            chunks.append(part)
        if end >= len(clean):
            break
        start = max(0, end - overlap)
    return chunks


def _insert_kb_document(
    *,
    doc_id: str,
    title: str,
    source_type: str,
    path_or_url: str | None,
    tags: list[str],
    doc_version: int,
    chunks: list[str],
) -> None:
    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO kb_documents (id, title, source_type, path_or_url, tags_json, doc_version)
                VALUES (:id, :title, :source_type, :path_or_url, CAST(:tags_json AS jsonb), :doc_version)
                ON CONFLICT (id) DO UPDATE
                SET title = EXCLUDED.title,
                    source_type = EXCLUDED.source_type,
                    path_or_url = EXCLUDED.path_or_url,
                    tags_json = EXCLUDED.tags_json,
                    doc_version = EXCLUDED.doc_version
                """
            ),
            {
                "id": doc_id,
                "title": title,
                "source_type": source_type,
                "path_or_url": path_or_url,
                "tags_json": json.dumps({"tags": tags}),
                "doc_version": doc_version,
            },
        )
        conn.execute(text("DELETE FROM kb_chunks WHERE doc_id = :doc_id"), {"doc_id": doc_id})
        for index, chunk in enumerate(chunks):
            conn.execute(
                text(
                    """
                    INSERT INTO kb_chunks (id, doc_id, chunk_index, content, token_count, metadata_json)
                    VALUES (:id, :doc_id, :chunk_index, :content, :token_count, CAST(:metadata_json AS jsonb))
                    """
                ),
                {
                    "id": f"kbc_{uuid.uuid4().hex}",
                    "doc_id": doc_id,
                    "chunk_index": index,
                    "content": chunk,
                    "token_count": max(1, len(chunk) // 4),
                    "metadata_json": json.dumps({}),
                },
            )


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
            overview_context = build_llm_context(bootstrap_chunks)
            try:
                generated = _SUMMARY_SERVICE.generate_repo_overview(
                    repo_id=payload.repo_id,
                    repo_profile=profile,
                    context_excerpt=overview_context,
                )
                llm_summary = generated.summary
                llm_highlights = generated.highlights
                llm_source = "ollama"
                llm_fallback = False
            except Exception:
                fallback = SummaryService.fallback_repo_overview(repo_id=payload.repo_id, repo_profile=profile)
                llm_summary = fallback.summary
                llm_highlights = fallback.highlights
                llm_source = "heuristic"
                llm_fallback = True

            enriched_profile = dict(profile)
            enriched_profile["llm_overview"] = {
                "summary": llm_summary,
                "highlights": llm_highlights,
                "source": llm_source,
                "fallback_used": llm_fallback,
                "model": settings.OLLAMA_MODEL,
            }
            await asyncio.to_thread(
                RepoProfilesRepo().upsert_profile,
                repo_id=payload.repo_id,
                repo_path=payload.repo_path,
                indexed_commit=str(profile.get("indexed_commit") or "") or None,
                default_branch=str(profile.get("default_branch") or "") or None,
                profile=enriched_profile,
                overview_context=overview_context,
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


@router.get("/repos/profiles", response_model=RepoProfileListResponse)
async def list_repo_profiles(
    limit: int = 50,
    _principal: AuthenticatedPrincipal | None = Depends(require_permission("analyses.read")),
) -> RepoProfileListResponse:
    try:
        safe_limit = min(max(limit, 1), 200)
        profiles = await asyncio.to_thread(RepoProfilesRepo().list_profiles, safe_limit)
        return RepoProfileListResponse(
            items=[
                RepoProfileListItemResponse(
                    repo_id=item.repo_id,
                    repo_path=item.repo_path,
                    indexed_commit=item.indexed_commit,
                    default_branch=item.default_branch,
                    profile=item.profile,
                    overview_context=item.overview_context,
                    updated_at=item.updated_at,
                )
                for item in profiles
            ]
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


@router.post("/ingest", response_model=DocumentIngestResponse)
async def ingest_document(
    payload: DocumentIngestRequest,
    _principal: AuthenticatedPrincipal | None = Depends(require_permission("analyses.write")),
    vector_store: QdrantClient = Depends(get_qdrant_client),
) -> DocumentIngestResponse:
    chunks = _chunk_text(payload.content)
    if not chunks:
        raise ApiError(status_code=400, code="INVALID_REQUEST", message="Document content is empty after cleaning")

    doc_id = f"doc_{uuid.uuid4().hex}"
    await asyncio.to_thread(
        _insert_kb_document,
        doc_id=doc_id,
        title=payload.title,
        source_type=payload.source_type,
        path_or_url=payload.path_or_url,
        tags=payload.tags,
        doc_version=payload.doc_version,
        chunks=chunks,
    )

    if vector_store.enabled:
        collection_name = settings.QDRANT_REPO_CONTEXT_COLLECTION
        await vector_store.ensure_collection(collection_name=collection_name)
        points: list[QdrantPoint] = []
        for index, chunk in enumerate(chunks):
            points.append(
                QdrantPoint(
                    id=f"{doc_id}:{index}",
                    vector=hash_embed_text(chunk, vector_size=settings.REPO_CONTEXT_VECTOR_SIZE),
                    payload={
                        "type": "kb_document_chunk",
                        "repo_id": payload.repo_id,
                        "doc_id": doc_id,
                        "title": payload.title,
                        "source_type": payload.source_type,
                        "path_or_url": payload.path_or_url,
                        "chunk_index": index,
                        "content": chunk,
                        "tags": payload.tags,
                    },
                )
            )
        await vector_store.upsert_points(collection_name=collection_name, points=points)

    return DocumentIngestResponse(
        doc_id=doc_id,
        repo_id=payload.repo_id,
        title=payload.title,
        chunks=len(chunks),
        source_type=payload.source_type,
    )


@router.post("/search", response_model=DocumentSearchResponse)
async def search_documents(
    payload: DocumentSearchRequest,
    _principal: AuthenticatedPrincipal | None = Depends(require_permission("analyses.read")),
    vector_store: QdrantClient = Depends(get_qdrant_client),
) -> DocumentSearchResponse:
    if not vector_store.enabled:
        return DocumentSearchResponse(repo_id=payload.repo_id, citations=[])

    collection_name = settings.QDRANT_REPO_CONTEXT_COLLECTION
    await vector_store.ensure_collection(collection_name=collection_name)

    query_vector = hash_embed_text(payload.query, vector_size=settings.REPO_CONTEXT_VECTOR_SIZE)
    filter_payload: dict[str, Any] = {"repo_id": payload.repo_id, "type": "kb_document_chunk"}
    if payload.source_type:
        filter_payload["source_type"] = payload.source_type

    hits = await vector_store.search(
        collection_name=collection_name,
        query_vector=query_vector,
        limit=max(payload.limit * 3, payload.limit),
        filter_payload=filter_payload,
    )

    wanted_tags = {tag.strip().lower() for tag in payload.tags if tag.strip()}
    citations: list[CitationResponse] = []
    for hit in hits:
        payload_hit = getattr(hit, "payload", None) or {}
        hit_tags = {str(item).strip().lower() for item in (payload_hit.get("tags") or []) if str(item).strip()}
        if wanted_tags and not wanted_tags.intersection(hit_tags):
            continue

        citations.append(
            CitationResponse(
                doc_id=str(payload_hit.get("doc_id") or ""),
                title=str(payload_hit.get("title") or "Document"),
                source_type=str(payload_hit.get("source_type") or "unknown"),
                excerpt=str(payload_hit.get("content") or ""),
                score=float(getattr(hit, "score", 0.0) or 0.0),
                path_or_url=(str(payload_hit.get("path_or_url")) if payload_hit.get("path_or_url") else None),
                chunk_index=int(payload_hit.get("chunk_index") or 0),
            )
        )
        if len(citations) >= payload.limit:
            break

    return DocumentSearchResponse(repo_id=payload.repo_id, citations=citations)


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
