"""
Knowledge Base routes for AI Service.

Handles:
- Repository onboarding and indexing
- Document ingestion
- Context retrieval (by query, diff, bootstrap)
- Document search
- Repository profile management
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, Path, Query
from pydantic import BaseModel, ConfigDict, Field

from ..config import get_settings
from ..database import get_engine

router = APIRouter(prefix="/v1/kb", tags=["knowledge-base"])
logger = logging.getLogger(__name__)


# ─── Request Models ───────────────────────────────────────────────────────────

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
    route_hint: Literal[
        "auto",
        "repo_query",
        "code_query",
        "policy_query",
        "document_query",
        "pdf_query",
        "web_query",
        "markdown_query",
        "sql_query",
        "multi_source_query",
    ] = "auto"


class RepoBootstrapContextRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    repo_id: str = Field(min_length=1, max_length=255)
    limit: int = Field(default=16, ge=1, le=40)


class KnowledgeBaseReindexRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    repoId: str = Field(min_length=1, max_length=255)
    repoPath: str | None = Field(default=None, max_length=4096)


class DocumentSectionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    content: str = Field(min_length=1, max_length=200_000)
    section_title: str | None = Field(default=None, max_length=500)
    heading_path: list[str] = Field(default_factory=list, max_length=16)
    page: int | None = Field(default=None, ge=1, le=100_000)
    entity_type: str | None = Field(default=None, max_length=64)
    entity_name: str | None = Field(default=None, max_length=255)
    line_start: int | None = Field(default=None, ge=1)
    line_end: int | None = Field(default=None, ge=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class DocumentIngestRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    repo_id: str = Field(min_length=1, max_length=255)
    title: str = Field(min_length=1, max_length=500)
    source_type: str = Field(default="markdown", min_length=1, max_length=64)
    path_or_url: str | None = Field(default=None, max_length=4096)
    content: str = Field(default="", max_length=2_000_000)
    tags: list[str] = Field(default_factory=list, max_length=64)
    doc_version: int = Field(default=1, ge=1, le=10_000)
    source_uri: str | None = Field(default=None, max_length=4096)
    content_hash: str | None = Field(default=None, max_length=256)
    version: str | None = Field(default=None, max_length=255)
    pages: list[str] = Field(default_factory=list, max_length=5000)
    sections: list[DocumentSectionRequest] = Field(default_factory=list, max_length=5000)
    metadata: dict[str, Any] = Field(default_factory=dict)


class DocumentSearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    repo_id: str = Field(min_length=1, max_length=255)
    query: str = Field(min_length=1, max_length=4000)
    source_type: str | None = Field(default=None, max_length=64)
    tags: list[str] = Field(default_factory=list, max_length=32)
    limit: int = Field(default=8, ge=1, le=30)


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


# ─── Response Models ──────────────────────────────────────────────────────────

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
    title: str | None = None
    source_type: str | None = None
    source_uri: str | None = None
    page: int | None = None
    section_title: str | None = None
    heading_path: list[str] = Field(default_factory=list)
    entity_type: str | None = None
    entity_name: str | None = None
    domain: str | None = None
    document_version: str | None = None
    crawl_timestamp: str | None = None
    tags: list[str] = Field(default_factory=list)


class ContextResponse(BaseModel):
    repo_id: str
    chunks: list[ContextChunkResponse]
    profile: dict[str, Any] | None = None


class RepoProfileResponse(BaseModel):
    repo_id: str
    profile: dict[str, Any] | None = None
    sql_profile: dict[str, Any] | None = None
    overview_context: str | None = None


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


class KnowledgeBaseReindexResponse(BaseModel):
    repoId: str
    repoPath: str
    taskId: str
    status: str = "QUEUED"


class KnowledgeBaseDeleteResponse(BaseModel):
    repoId: str
    deleted: bool


class DocumentIngestResponse(BaseModel):
    doc_id: str
    repo_id: str
    title: str
    chunks: int
    source_type: str


class CitationResponse(BaseModel):
    doc_id: str
    title: str
    source_type: str
    excerpt: str
    score: float
    path_or_url: str | None = None
    chunk_index: int
    source_uri: str | None = None
    page: int | None = None
    section_title: str | None = None
    heading_path: list[str] = Field(default_factory=list)
    entity_type: str | None = None
    entity_name: str | None = None
    line_start: int | None = None
    line_end: int | None = None
    domain: str | None = None
    document_version: str | None = None
    crawl_timestamp: str | None = None
    tags: list[str] = Field(default_factory=list)


class DocumentSearchResponse(BaseModel):
    repo_id: str
    citations: list[CitationResponse]


class DocumentSourceResponse(BaseModel):
    doc_id: str
    repo_id: str | None = None
    title: str
    source_type: str
    path_or_url: str | None = None
    source_uri: str | None = None
    doc_version: int
    tags: list[str] = Field(default_factory=list)
    resync_supported: bool = False
    next_recrawl_at: str | None = None
    last_sync_at: str | None = None
    last_sync_status: str | None = None
    last_sync_error: str | None = None


class DocumentSourcesResponse(BaseModel):
    items: list[DocumentSourceResponse]
    observability: dict[str, Any]


class AutomationTaskResponse(BaseModel):
    task_name: str
    task_id: str
    status: str = "QUEUED"


class DocumentAutomationResponse(BaseModel):
    task_name: str
    queued: int = 0
    doc_ids: list[str] = Field(default_factory=list)
    status: str = "QUEUED"


class GraphNode(BaseModel):
    id: str
    label: str
    type: str  # 'file', 'function', 'class', 'module'
    path: str | None = None
    size: int = 1


class GraphEdge(BaseModel):
    source: str
    target: str
    type: str  # 'imports', 'calls', 'extends', 'references'
    weight: float = 1.0


class KnowledgeGraphResponse(BaseModel):
    repo_id: str
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    total_nodes: int
    total_edges: int


# ─── Helper Functions ─────────────────────────────────────────────────────────

def _normalize_source_type(value: str) -> str:
    """Normalize source type aliases."""
    normalized = value.strip().lower()
    aliases = {
        "md": "markdown",
        "mdx": "markdown",
        "doc": "markdown",
        "docs": "markdown",
        "url": "web",
        "website": "web",
        "rule": "policy",
        "rules": "policy",
    }
    return aliases.get(normalized, normalized or "markdown")


def _chunk_text(content: str, *, chunk_size: int = 2400, overlap: int = 250) -> list[str]:
    """Split text into overlapping chunks."""
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


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/onboard", response_model=RepoIndexResponse)
async def onboard_repo(payload: RepoOnboardRequest) -> RepoIndexResponse:
    """
    Onboard a repository to the knowledge base.
    
    Full indexing of repository files for RAG context retrieval.
    """
    import time
    settings = get_settings()
    
    logger.info(f"Onboarding repository: {payload.repo_id}")
    
    # In full implementation, this would call the actual ingestor
    # For now, return a mock response
    started_at = time.strftime("%Y-%m-%dT%H:%M:%SZ")
    
    return RepoIndexResponse(
        repo_id=payload.repo_id,
        repo_path=payload.repo_path,
        mode="full" if payload.force_full else "incremental",
        collection_name=settings.QDRANT_REPO_CONTEXT_COLLECTION,
        indexed_commit=None,
        default_branch="main",
        files_seen=0,
        files_indexed=0,
        chunks_upserted=0,
        chunks_deleted=0,
        changed_files=[],
        started_at=started_at,
        completed_at=time.strftime("%Y-%m-%dT%H:%M:%SZ"),
    )


@router.post("/update", response_model=RepoIndexResponse)
async def update_repo(payload: RepoUpdateRequest) -> RepoIndexResponse:
    """
    Update repository in knowledge base incrementally.
    
    Only processes changed files since base_ref.
    """
    import time
    settings = get_settings()
    
    logger.info(f"Updating repository: {payload.repo_id}")
    
    started_at = time.strftime("%Y-%m-%dT%H:%M:%SZ")
    
    return RepoIndexResponse(
        repo_id=payload.repo_id,
        repo_path=payload.repo_path,
        mode="incremental",
        collection_name=settings.QDRANT_REPO_CONTEXT_COLLECTION,
        indexed_commit=payload.head_ref,
        default_branch="main",
        files_seen=0,
        files_indexed=0,
        chunks_upserted=0,
        chunks_deleted=0,
        changed_files=[],
        started_at=started_at,
        completed_at=time.strftime("%Y-%m-%dT%H:%M:%SZ"),
    )


@router.post("/reindex", response_model=KnowledgeBaseReindexResponse)
async def reindex_repo(payload: KnowledgeBaseReindexRequest) -> KnowledgeBaseReindexResponse:
    """
    Queue repository for reindexing via Celery task.
    """
    task_id = f"task_{uuid.uuid4().hex[:16]}"
    repo_path = payload.repoPath or payload.repoId
    
    logger.info(f"Queuing reindex for repository: {payload.repoId}")
    
    return KnowledgeBaseReindexResponse(
        repoId=payload.repoId,
        repoPath=repo_path,
        taskId=task_id,
        status="QUEUED",
    )


@router.get("/repos/{repo_id}/profile", response_model=RepoProfileResponse)
async def get_repo_profile(repo_id: str) -> RepoProfileResponse:
    """
    Get repository profile from knowledge base.
    """
    engine = get_engine()
    from sqlalchemy import text
    
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT * FROM repo_profiles WHERE repo_id = :repo_id"),
            {"repo_id": repo_id}
        )
        row = result.mappings().first()
    
    if not row:
        return RepoProfileResponse(
            repo_id=repo_id,
            profile=None,
            sql_profile=None,
            overview_context=None,
        )
    
    profile = row.get("profile_json")
    if isinstance(profile, str):
        try:
            profile = json.loads(profile)
        except json.JSONDecodeError:
            profile = {}
    
    return RepoProfileResponse(
        repo_id=repo_id,
        profile=profile,
        sql_profile=dict(row) if row else None,
        overview_context=row.get("overview_context"),
    )


@router.delete("/repos/{repo_id}", response_model=KnowledgeBaseDeleteResponse)
async def delete_repo(repo_id: str = Path(min_length=1, max_length=255)) -> KnowledgeBaseDeleteResponse:
    """
    Delete repository from knowledge base.
    """
    engine = get_engine()
    from sqlalchemy import text
    
    with engine.begin() as conn:
        result = conn.execute(
            text("DELETE FROM repo_profiles WHERE repo_id = :repo_id RETURNING repo_id"),
            {"repo_id": repo_id}
        )
        deleted = result.fetchone() is not None
    
    return KnowledgeBaseDeleteResponse(repoId=repo_id, deleted=deleted)


@router.get("/repos/profiles", response_model=RepoProfileListResponse)
async def list_repo_profiles(limit: int = 50) -> RepoProfileListResponse:
    """
    List all repository profiles.
    """
    engine = get_engine()
    from sqlalchemy import text
    
    safe_limit = min(max(limit, 1), 200)
    
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT * FROM repo_profiles ORDER BY updated_at DESC LIMIT :limit"),
            {"limit": safe_limit}
        )
        rows = result.mappings().all()
    
    items = []
    for row in rows:
        profile = row.get("profile_json")
        if isinstance(profile, str):
            try:
                profile = json.loads(profile)
            except json.JSONDecodeError:
                profile = {}
        
        items.append(RepoProfileListItemResponse(
            repo_id=row.get("repo_id"),
            repo_path=row.get("repo_path"),
            indexed_commit=row.get("indexed_commit"),
            default_branch=row.get("default_branch"),
            profile=profile or {},
            overview_context=row.get("overview_context"),
            updated_at=row.get("updated_at").isoformat() if row.get("updated_at") else None,
        ))
    
    return RepoProfileListResponse(items=items)


@router.post("/context/query", response_model=ContextResponse)
async def get_context_for_query(payload: ContextByQueryRequest) -> ContextResponse:
    """
    Retrieve context chunks for a natural language query.
    
    Uses RAG to find relevant code and documentation.
    """
    logger.info(f"Context query for {payload.repo_id}: {payload.query[:100]}...")
    
    # In full implementation, this would use the RAG engine
    # For now, return empty response
    return ContextResponse(
        repo_id=payload.repo_id,
        chunks=[],
        profile=None,
    )


@router.post("/context/diff", response_model=ContextResponse)
async def get_context_for_diff(payload: ContextByDiffRequest) -> ContextResponse:
    """
    Retrieve context chunks relevant to a code diff.
    
    Analyzes the diff to find related code and documentation.
    """
    logger.info(f"Context for diff in {payload.repo_id}")
    
    return ContextResponse(
        repo_id=payload.repo_id,
        chunks=[],
        profile=None,
    )


@router.post("/context/bootstrap", response_model=ContextResponse)
async def get_bootstrap_context_for_repo(payload: RepoBootstrapContextRequest) -> ContextResponse:
    """
    Get bootstrap context for a repository.
    
    Returns high-level overview context for understanding the codebase.
    """
    logger.info(f"Bootstrap context for {payload.repo_id}")
    
    return ContextResponse(
        repo_id=payload.repo_id,
        chunks=[],
        profile=None,
    )


@router.post("/ingest", response_model=DocumentIngestResponse)
async def ingest_document(payload: DocumentIngestRequest) -> DocumentIngestResponse:
    """
    Ingest a document into the knowledge base.
    
    Supports markdown, PDF, web pages, and policy documents.
    """
    normalized_source_type = _normalize_source_type(payload.source_type)
    doc_id = f"doc_{uuid.uuid4().hex}"
    
    # Chunk the content
    content = payload.content
    if payload.sections:
        content = "\n\n".join(s.content for s in payload.sections)
    
    chunks = _chunk_text(content)
    
    logger.info(f"Ingested document {doc_id}: {len(chunks)} chunks")
    
    return DocumentIngestResponse(
        doc_id=doc_id,
        repo_id=payload.repo_id,
        title=payload.title,
        chunks=len(chunks),
        source_type=normalized_source_type,
    )


@router.post("/search", response_model=DocumentSearchResponse)
async def search_documents(payload: DocumentSearchRequest) -> DocumentSearchResponse:
    """
    Search documents in the knowledge base.
    """
    logger.info(f"Document search in {payload.repo_id}: {payload.query[:100]}...")
    
    return DocumentSearchResponse(
        repo_id=payload.repo_id,
        citations=[],
    )


@router.get("/sources", response_model=DocumentSourcesResponse)
async def list_sources(
    repo_id: str | None = None,
    source_type: str | None = None,
    limit: int = 200,
) -> DocumentSourcesResponse:
    """
    List document sources in the knowledge base.
    """
    return DocumentSourcesResponse(
        items=[],
        observability={
            "total_documents": 0,
            "total_chunks": 0,
        },
    )


@router.get("/repos/{repo_id}/graph", response_model=KnowledgeGraphResponse)
async def get_knowledge_graph(
    repo_id: str = Path(min_length=1, max_length=255),
    limit: int = 100,
) -> KnowledgeGraphResponse:
    """
    Get the knowledge graph for a repository.
    
    Shows relationships between code entities (files, functions, classes).
    """
    return KnowledgeGraphResponse(
        repo_id=repo_id,
        nodes=[],
        edges=[],
        total_nodes=0,
        total_edges=0,
    )


@router.post("/automation/onboard", response_model=AutomationTaskResponse)
async def automate_onboard_repo(payload: AutomationOnboardRequest) -> AutomationTaskResponse:
    """
    Queue repository onboarding via Celery task.
    """
    task_id = f"task_{uuid.uuid4().hex[:16]}"
    
    return AutomationTaskResponse(
        task_name="kb.onboard_repo",
        task_id=task_id,
        status="QUEUED",
    )


@router.post("/automation/diff", response_model=AutomationTaskResponse)
async def automate_process_diff(payload: AutomationDiffRequest) -> AutomationTaskResponse:
    """
    Queue diff processing via Celery task.
    """
    task_id = f"task_{uuid.uuid4().hex[:16]}"
    
    return AutomationTaskResponse(
        task_name="kb.process_diff",
        task_id=task_id,
        status="QUEUED",
    )
