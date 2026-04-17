"""
Analysis API routes.
"""

import logging
from typing import Any, List, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field

from ..database import get_engine
from ..repositories import AnalysesRepo, FindingsRepo, ToolRunsRepo, DuplicateAnalysisError

logger = logging.getLogger(__name__)
router = APIRouter(tags=["analyses"])


# ============ Request/Response Models ============

class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    
    source: Literal["github_actions", "github_webhook", "cli", "manual"] = "github_actions"
    repo: str = Field(max_length=255)
    project_id: str = Field(min_length=1, max_length=255)
    pr_number: int | None = Field(default=None, ge=1)
    commit_sha: str | None = Field(default=None, min_length=6, max_length=64)
    diff_text: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class AnalyzeAcceptedResponse(BaseModel):
    analysis_id: str
    status: Literal["QUEUED"]
    task_id: str | None = None


class FindingResponse(BaseModel):
    id: str
    analysis_id: str
    source: str
    file_path: str | None
    line_start: int | None
    line_end: int | None
    severity: Literal["INFO", "WARN", "BLOCKER"]
    category: str
    message: str
    suggestion: str | None
    confidence: float | None
    issue_type: str | None
    rule_id: str | None
    evidence: dict[str, Any] = Field(default_factory=dict)
    fingerprint: str
    created_at: str


class ToolRunResponse(BaseModel):
    id: str
    analysis_id: str
    tool_name: str
    status: Literal["SUCCESS", "FAILED", "SKIPPED"]
    started_at: str
    finished_at: str | None
    duration_ms: int
    exit_code: int | None
    findings_count: int
    scanned_files: int
    version: str | None
    warning: str | None
    command: str | None
    workspace_path: str | None
    stdout_snippet: str | None
    stderr_snippet: str | None
    created_at: str


class AnalysisResponse(BaseModel):
    analysis_id: str
    status: str
    stage: str | None
    progress: int | None
    nb_files_changed: int | None
    additions_total: int | None
    deletions_total: int | None
    repo: str
    provider: str
    pr_number: int | None
    commit_sha: str | None
    source: str
    created_at: str
    updated_at: str
    diff_hash: str
    summary: str | None
    diff_redacted: str | None
    has_secrets: bool
    redaction_stats: dict[str, Any] = Field(default_factory=dict)
    static_stats: dict[str, Any] = Field(default_factory=dict)
    change_type: Literal["bugfix", "feature", "refactor"] | None = None
    change_type_confidence: float | None = None
    change_type_source: Literal["heuristic", "llm"] | None = None
    change_type_signals: dict[str, Any] = Field(default_factory=dict)
    error_code: str | None
    error_message: str | None
    metadata: dict[str, Any] = Field(default_factory=dict)
    findings_count: int = 0
    blocker_count: int = 0
    warn_count: int = 0
    info_count: int = 0
    findings: List[FindingResponse] = Field(default_factory=list)
    tool_runs: List[ToolRunResponse] = Field(default_factory=list)


class AnalysisListResponse(BaseModel):
    items: List[AnalysisResponse]
    page: int
    size: int
    total: int
    pages: int


class UpdateStatusRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    
    status: Literal["RECEIVED", "QUEUED", "RUNNING", "COMPLETED", "FAILED"]
    error_code: str | None = None
    error_message: str | None = None
    stage: str | None = None
    progress: int | None = Field(default=None, ge=0, le=100)


class CreateFindingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    
    source: str = Field(default="manual")
    file_path: str | None = None
    line_start: int | None = Field(default=None, ge=1)
    line_end: int | None = Field(default=None, ge=1)
    severity: Literal["INFO", "WARN", "BLOCKER"] = "WARN"
    category: str = Field(default="quality", min_length=1, max_length=64)
    message: str = Field(min_length=1)
    suggestion: str | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)
    issue_type: str | None = None
    rule_id: str | None = None
    evidence: dict[str, Any] = Field(default_factory=dict)


class DeleteAnalysisResponse(BaseModel):
    analysis_id: str
    deleted: bool


# ============ Helper Functions ============

def get_analyses_repo() -> AnalysesRepo:
    return AnalysesRepo(get_engine())


def get_findings_repo() -> FindingsRepo:
    return FindingsRepo(get_engine())


def get_tool_runs_repo() -> ToolRunsRepo:
    return ToolRunsRepo(get_engine())


def _to_analysis_response(analysis, findings=None, tool_runs=None) -> AnalysisResponse:
    findings_response = []
    if findings:
        for f in findings:
            findings_response.append(FindingResponse(
                id=f.id,
                analysis_id=f.analysis_id,
                source=f.source,
                file_path=f.file_path,
                line_start=f.line_start,
                line_end=f.line_end,
                severity=f.severity,
                category=f.category,
                message=f.message,
                suggestion=f.suggestion,
                confidence=f.confidence,
                issue_type=f.issue_type,
                rule_id=f.rule_id,
                evidence=f.evidence,
                fingerprint=f.fingerprint,
                created_at=f.created_at,
            ))
    
    tool_runs_response = []
    if tool_runs:
        for tr in tool_runs:
            tool_runs_response.append(ToolRunResponse(
                id=tr.id,
                analysis_id=tr.analysis_id,
                tool_name=tr.tool_name,
                status=tr.status,
                started_at=tr.started_at,
                finished_at=tr.finished_at,
                duration_ms=tr.duration_ms,
                exit_code=tr.exit_code,
                findings_count=tr.findings_count,
                scanned_files=tr.scanned_files,
                version=tr.version,
                warning=tr.warning,
                command=tr.command,
                workspace_path=tr.workspace_path,
                stdout_snippet=tr.stdout_snippet,
                stderr_snippet=tr.stderr_snippet,
                created_at=tr.created_at,
            ))
    
    return AnalysisResponse(
        analysis_id=analysis.id,
        status=analysis.status,
        stage=analysis.stage,
        progress=analysis.progress,
        nb_files_changed=analysis.nb_files_changed,
        additions_total=analysis.additions_total,
        deletions_total=analysis.deletions_total,
        repo=analysis.repo,
        provider=analysis.provider,
        pr_number=analysis.pr_number,
        commit_sha=analysis.commit_sha,
        source=analysis.source,
        created_at=analysis.created_at,
        updated_at=analysis.updated_at,
        diff_hash=analysis.diff_hash,
        summary=analysis.summary,
        diff_redacted=analysis.diff_redacted,
        has_secrets=analysis.has_secrets,
        redaction_stats=analysis.redaction_stats,
        static_stats=analysis.static_stats,
        change_type=analysis.change_type,
        change_type_confidence=analysis.change_type_confidence,
        change_type_source=analysis.change_type_source,
        change_type_signals=analysis.change_type_signals,
        error_code=analysis.error_code,
        error_message=analysis.error_message,
        metadata=analysis.metadata,
        findings_count=len(findings_response) if findings else analysis.findings_count,
        blocker_count=sum(1 for f in findings_response if f.severity == "BLOCKER") if findings else analysis.blocker_count,
        warn_count=sum(1 for f in findings_response if f.severity == "WARN") if findings else analysis.warn_count,
        info_count=sum(1 for f in findings_response if f.severity == "INFO") if findings else analysis.info_count,
        findings=findings_response,
        tool_runs=tool_runs_response,
    )


# ============ Analysis Endpoints ============

@router.post("/analyses", response_model=AnalyzeAcceptedResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_analysis(
    payload: AnalyzeRequest,
    repo: AnalysesRepo = Depends(get_analyses_repo),
):
    """Create a new analysis and queue it for processing."""
    try:
        analysis = repo.create(
            repo=payload.repo,
            diff_text=payload.diff_text,
            source=payload.source,
            project_id=payload.project_id,
            pr_number=payload.pr_number,
            commit_sha=payload.commit_sha,
            metadata=payload.metadata,
        )
        
        # Update status to QUEUED
        repo.update_status(
            analysis_id=analysis.id,
            status="QUEUED",
            stage="QUEUED",
            progress=10,
        )
        
        # TODO: Enqueue to Celery worker
        # For now, return the analysis ID
        
        return AnalyzeAcceptedResponse(
            analysis_id=analysis.id,
            status="QUEUED",
            task_id=None,  # Would be populated by Celery
        )
        
    except DuplicateAnalysisError as e:
        raise HTTPException(
            status_code=409,
            detail={"error": "DUPLICATE_ANALYSIS", "existing_id": e.existing_id}
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/analyses/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(
    analysis_id: str,
    analyses_repo: AnalysesRepo = Depends(get_analyses_repo),
    findings_repo: FindingsRepo = Depends(get_findings_repo),
    tool_runs_repo: ToolRunsRepo = Depends(get_tool_runs_repo),
):
    """Get an analysis by ID with findings and tool runs."""
    analysis = analyses_repo.get_by_id(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    findings = findings_repo.list_by_analysis(analysis_id)
    tool_runs = tool_runs_repo.list_by_analysis(analysis_id)
    
    return _to_analysis_response(analysis, findings, tool_runs)


@router.delete("/analyses/{analysis_id}", response_model=DeleteAnalysisResponse)
async def delete_analysis(
    analysis_id: str,
    repo: AnalysesRepo = Depends(get_analyses_repo),
):
    """Delete an analysis."""
    if not repo.delete(analysis_id):
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return DeleteAnalysisResponse(analysis_id=analysis_id, deleted=True)


@router.get("/analyses", response_model=AnalysisListResponse)
async def list_analyses(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    repo_filter: str | None = Query(default=None, alias="repo"),
    status: str | None = Query(default=None),
    project_id: str | None = Query(default=None),
    analyses_repo: AnalysesRepo = Depends(get_analyses_repo),
):
    """List analyses with pagination."""
    result = analyses_repo.list_paginated(
        page=page,
        size=size,
        repo=repo_filter,
        status=status,
        project_id=project_id,
    )
    
    return AnalysisListResponse(
        items=[_to_analysis_response(item) for item in result.items],
        page=result.page,
        size=result.size,
        total=result.total,
        pages=result.pages,
    )


@router.post("/analyses/{analysis_id}/status", response_model=AnalysisResponse)
async def update_analysis_status(
    analysis_id: str,
    payload: UpdateStatusRequest,
    analyses_repo: AnalysesRepo = Depends(get_analyses_repo),
    findings_repo: FindingsRepo = Depends(get_findings_repo),
    tool_runs_repo: ToolRunsRepo = Depends(get_tool_runs_repo),
):
    """Update an analysis status."""
    analysis = analyses_repo.update_status(
        analysis_id=analysis_id,
        status=payload.status,
        stage=payload.stage,
        progress=payload.progress,
        error_code=payload.error_code,
        error_message=payload.error_message,
    )
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    findings = findings_repo.list_by_analysis(analysis_id)
    tool_runs = tool_runs_repo.list_by_analysis(analysis_id)
    
    return _to_analysis_response(analysis, findings, tool_runs)


@router.post("/analyses/{analysis_id}/findings", response_model=FindingResponse, status_code=status.HTTP_201_CREATED)
async def create_analysis_finding(
    analysis_id: str,
    payload: CreateFindingRequest,
    analyses_repo: AnalysesRepo = Depends(get_analyses_repo),
    findings_repo: FindingsRepo = Depends(get_findings_repo),
):
    """Create a finding for an analysis."""
    # Verify analysis exists
    analysis = analyses_repo.get_by_id(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    finding = findings_repo.create(
        analysis_id=analysis_id,
        source=payload.source,
        message=payload.message,
        category=payload.category,
        severity=payload.severity,
        file_path=payload.file_path,
        line_start=payload.line_start,
        line_end=payload.line_end,
        suggestion=payload.suggestion,
        confidence=payload.confidence,
        issue_type=payload.issue_type,
        rule_id=payload.rule_id,
        evidence=payload.evidence,
    )
    
    return FindingResponse(
        id=finding.id,
        analysis_id=finding.analysis_id,
        source=finding.source,
        file_path=finding.file_path,
        line_start=finding.line_start,
        line_end=finding.line_end,
        severity=finding.severity,
        category=finding.category,
        message=finding.message,
        suggestion=finding.suggestion,
        confidence=finding.confidence,
        issue_type=finding.issue_type,
        rule_id=finding.rule_id,
        evidence=finding.evidence,
        fingerprint=finding.fingerprint,
        created_at=finding.created_at,
    )


@router.get("/analyses/{analysis_id}/findings", response_model=List[FindingResponse])
async def list_analysis_findings(
    analysis_id: str,
    analyses_repo: AnalysesRepo = Depends(get_analyses_repo),
    findings_repo: FindingsRepo = Depends(get_findings_repo),
):
    """List all findings for an analysis."""
    analysis = analyses_repo.get_by_id(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    findings = findings_repo.list_by_analysis(analysis_id)
    
    return [
        FindingResponse(
            id=f.id,
            analysis_id=f.analysis_id,
            source=f.source,
            file_path=f.file_path,
            line_start=f.line_start,
            line_end=f.line_end,
            severity=f.severity,
            category=f.category,
            message=f.message,
            suggestion=f.suggestion,
            confidence=f.confidence,
            issue_type=f.issue_type,
            rule_id=f.rule_id,
            evidence=f.evidence,
            fingerprint=f.fingerprint,
            created_at=f.created_at,
        )
        for f in findings
    ]
