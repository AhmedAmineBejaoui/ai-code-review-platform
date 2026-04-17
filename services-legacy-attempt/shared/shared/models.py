"""
shared/models.py
────────────────
Pydantic models shared across ALL microservices.
Import as:  from shared.models import Principal, AnalysisStatus, Finding
"""
from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# ─── Auth ────────────────────────────────────────────────────────────────────

class Principal(BaseModel):
    """Authenticated principal forwarded from the API Gateway via X-Principal-* headers."""
    user_id: str
    email: str
    display_name: str | None = None
    roles: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)
    org_id: str | None = None
    org_role: str | None = None


# ─── Analysis ────────────────────────────────────────────────────────────────

class AnalysisStatus(str, Enum):
    RECEIVED  = "RECEIVED"
    QUEUED    = "QUEUED"
    RUNNING   = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED    = "FAILED"


class FindingSeverity(str, Enum):
    BLOCKER = "blocker"
    WARN    = "warn"
    INFO    = "info"


class Finding(BaseModel):
    id: str
    analysis_id: str
    source: str                          # ruff | semgrep | llm | secret_scan
    severity: FindingSeverity
    file_path: str
    line_start: int | None = None
    line_end: int | None = None
    rule_id: str | None = None
    message: str
    fingerprint: str
    confidence: float = 1.0
    evidence: dict[str, Any] = Field(default_factory=dict)


class AnalysisSummary(BaseModel):
    id: str
    repo: str
    pr_number: int | None
    status: AnalysisStatus
    stage: str | None
    progress: int
    project_id: str
    findings_count: int = 0
    blocker_count: int = 0
    warn_count: int = 0
    created_at: str | None = None


# ─── Review ──────────────────────────────────────────────────────────────────

class ReviewRequest(BaseModel):
    analysis_id: str
    diff: str
    findings: list[Finding] = Field(default_factory=list)
    context_chunks: list[str] = Field(default_factory=list)
    project_profile: dict[str, Any] = Field(default_factory=dict)


class ReviewResponse(BaseModel):
    analysis_id: str
    review_text: str
    score: float | None = None
    citations: list[str] = Field(default_factory=list)
    model: str | None = None


# ─── RAG ─────────────────────────────────────────────────────────────────────

class RAGContextRequest(BaseModel):
    query: str
    repo_id: str
    top_k: int = 10
    rerank: bool = True


class RAGContextChunk(BaseModel):
    chunk_id: str
    content: str
    file_path: str | None = None
    score: float = 0.0
    metadata: dict[str, Any] = Field(default_factory=dict)


class RAGContextResponse(BaseModel):
    chunks: list[RAGContextChunk]
    total: int
    query: str


# ─── Notification ─────────────────────────────────────────────────────────────

class NotificationPayload(BaseModel):
    event: str                           # analysis.completed | review.assigned | comment.mention
    recipient_user_id: str
    recipient_email: str | None = None
    channels: list[str] = Field(default_factory=lambda: ["email"])
    data: dict[str, Any] = Field(default_factory=dict)


# ─── Generic responses ────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str = "1.0.0"
    dependencies: dict[str, str] = Field(default_factory=dict)
