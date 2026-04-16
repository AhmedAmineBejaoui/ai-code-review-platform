"""
Analysis Service — /v1/analyses routes
────────────────────────────────────────
MOVED FROM: apps/backend/app/api/http/analyses.py
LOGIC:      Unchanged. Enqueues jobs to Worker Service via Redis/Celery.

Principal is read from X-Principal-* headers injected by the API Gateway.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, Header, Query, Request
from pydantic import BaseModel, ConfigDict, Field

from app.data.analyses_repo import AnalysesRepo, get_analyses_repo
from app.queue import enqueue_analysis_job, QueueUnavailableError
from app.settings import settings
from shared.errors import ApiError
from shared.models import AnalysisStatus

router = APIRouter(prefix="/v1/analyses", tags=["analyses"])


# ── Request / Response models ─────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    source:     Literal["github_actions", "github_webhook", "cli", "manual"] = "github_actions"
    repo:       str       = Field(max_length=255)
    project_id: str       = Field(min_length=1, max_length=255)
    pr_number:  int | None = Field(default=None, ge=1)
    commit_sha: str | None = Field(default=None, min_length=6, max_length=64, pattern=r"^[0-9a-fA-F]+$")
    diff:       str | None = Field(default=None, max_length=settings.MAX_DIFF_BYTES)
    metadata:   dict[str, Any] = Field(default_factory=dict)


def _principal_from_headers(
    x_principal_id:    str | None = Header(default=None, alias="x-principal-id"),
    x_principal_email: str | None = Header(default=None, alias="x-principal-email"),
    x_principal_roles: str | None = Header(default=None, alias="x-principal-roles"),
) -> dict[str, Any]:
    return {
        "user_id":     x_principal_id    or "anonymous",
        "email":       x_principal_email or "",
        "roles":       json.loads(x_principal_roles) if x_principal_roles else [],
    }


# ── POST /v1/analyses ─────────────────────────────────────────────────────────

@router.post("", status_code=202)
async def create_analysis(body: AnalyzeRequest, request: Request) -> dict:
    """
    Intake an analysis request.
    1. Validates project exists.
    2. Stores analysis record (status=RECEIVED).
    3. Enqueues Celery task to Worker Service.
    Returns 202 Accepted immediately.
    """
    repo: AnalysesRepo = get_analyses_repo()

    # Verify project exists
    if not repo.project_exists(body.project_id):
        raise ApiError(status_code=404, code="PROJECT_NOT_FOUND",
                       message=f"Project '{body.project_id}' not found")

    # Check duplicate
    diff_hash = None
    if body.diff:
        import hashlib
        diff_hash = hashlib.sha256(body.diff.encode()).hexdigest()
        existing = repo.find_by_diff_hash(body.repo, diff_hash)
        if existing:
            raise ApiError(status_code=409, code="DUPLICATE_ANALYSIS",
                           message="Identical diff already analysed",
                           details={"existing_id": existing["id"]})

    # Create analysis record
    analysis_id = f"an_{uuid.uuid4().hex}"
    principal   = _principal_from_headers(
        x_principal_id=request.headers.get("x-principal-id"),
        x_principal_email=request.headers.get("x-principal-email"),
        x_principal_roles=request.headers.get("x-principal-roles"),
    )

    repo.create(
        id=analysis_id,
        repo=body.repo,
        project_id=body.project_id,
        pr_number=body.pr_number,
        commit_sha=body.commit_sha,
        source=body.source,
        diff=body.diff,
        diff_hash=diff_hash,
        metadata=body.metadata,
        submitter_id=principal["user_id"],
    )

    # Enqueue to Celery worker
    try:
        enqueue_result = enqueue_analysis_job(analysis_id)
        task_id = enqueue_result.task_id
        repo.update_status(analysis_id, AnalysisStatus.QUEUED)
    except QueueUnavailableError as exc:
        repo.update_status(analysis_id, AnalysisStatus.FAILED,
                           error_message=str(exc))
        raise ApiError(status_code=503, code="QUEUE_UNAVAILABLE",
                       message="Worker queue is not available") from exc

    return {
        "id":      analysis_id,
        "status":  AnalysisStatus.QUEUED,
        "task_id": task_id,
    }


# ── GET /v1/analyses/{id} ─────────────────────────────────────────────────────

@router.get("/{analysis_id}")
async def get_analysis(analysis_id: str) -> dict:
    repo = get_analyses_repo()
    row  = repo.get_by_id(analysis_id)
    if row is None:
        raise ApiError(status_code=404, code="ANALYSIS_NOT_FOUND",
                       message=f"Analysis '{analysis_id}' not found")
    return {"item": row}


# ── GET /v1/analyses ──────────────────────────────────────────────────────────

@router.get("")
async def list_analyses(
    project_id: str | None  = Query(default=None),
    repo:       str | None  = Query(default=None),
    status:     str | None  = Query(default=None),
    limit:      int         = Query(default=settings.API_DEFAULT_PAGE_SIZE,
                                    le=settings.API_MAX_PAGE_SIZE),
    offset:     int         = Query(default=0, ge=0),
) -> dict:
    analyses_repo = get_analyses_repo()
    items, total = analyses_repo.list_paginated(
        project_id=project_id, repo=repo, status=status,
        limit=limit, offset=offset,
    )
    return {"items": items, "total": total, "limit": limit, "offset": offset}


# ── DELETE /v1/analyses/{id} ──────────────────────────────────────────────────

@router.delete("/{analysis_id}", status_code=204)
async def delete_analysis(analysis_id: str) -> None:
    repo = get_analyses_repo()
    if repo.get_by_id(analysis_id) is None:
        raise ApiError(status_code=404, code="ANALYSIS_NOT_FOUND",
                       message=f"Analysis '{analysis_id}' not found")
    repo.delete(analysis_id)


# ── GET /v1/analyses/{id}/findings ────────────────────────────────────────────

@router.get("/{analysis_id}/findings")
async def get_findings(analysis_id: str) -> dict:
    repo     = get_analyses_repo()
    findings = repo.get_findings(analysis_id)
    return {"items": findings, "total": len(findings)}
