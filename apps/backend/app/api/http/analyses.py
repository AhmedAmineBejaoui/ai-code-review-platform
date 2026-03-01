from __future__ import annotations

import json
from typing import Any, Literal

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, ConfigDict, Field

from app.api.deps import get_analysis_service
from app.api.errors import ApiError
from app.api.middleware.auth import AuthenticatedPrincipal, require_permission
from app.core.services.analysis_service import (
    AnalysisService,
    CreateAnalysisCommand,
    CreateFindingCommand,
    ServiceError,
    UpdateAnalysisStatusCommand,
)
from app.data.models.analysis import Analysis
from app.data.models.finding import Finding
from app.data.models.parsed_diff import AnalysisFileData, AnalysisHunkData, AnalysisHunkLineData
from app.data.models.tool_run import ToolRun
from app.settings import settings
from app.workers.queue import QueueUnavailableError, enqueue_analysis_job

router = APIRouter(prefix="/v1", tags=["analyses"])


class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    source: Literal["github_actions", "github_webhook", "cli", "manual"] = "github_actions"
    repo: str = Field(max_length=255)
    pr_number: int | None = Field(default=None, ge=1)
    commit_sha: str | None = Field(default=None, min_length=6, max_length=64, pattern=r"^[0-9a-fA-F]+$")
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
    diff_redacted: str | None
    has_secrets: bool
    redaction_stats: dict[str, Any] = Field(default_factory=dict)
    static_stats: dict[str, Any] = Field(default_factory=dict)
    change_type: Literal["bugfix", "feature", "refactor"] | None = None
    change_type_confidence: float | None = Field(default=None, ge=0, le=1)
    change_type_source: Literal["heuristic", "llm"] | None = None
    change_type_signals: dict[str, Any] = Field(default_factory=dict)
    error_code: str | None
    error_message: str | None
    metadata: dict[str, Any] = Field(default_factory=dict)
    findings: list[FindingResponse] = Field(default_factory=list)
    security_findings: list[FindingResponse] = Field(default_factory=list)
    static_findings: list[FindingResponse] = Field(default_factory=list)
    tool_runs: list["ToolRunResponse"] = Field(default_factory=list)
    files_changed: list["AnalysisFileResponse"] = Field(default_factory=list)


class AnalysisListResponse(BaseModel):
    items: list[AnalysisResponse]
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
    issue_type: str | None = Field(default=None, min_length=1, max_length=64)
    rule_id: str | None = Field(default=None, min_length=1, max_length=255)
    evidence: dict[str, Any] = Field(default_factory=dict)


class AnalysisHunkLineResponse(BaseModel):
    id: str
    line_type: Literal["context", "add", "remove"]
    content: str
    old_line_no: int | None
    new_line_no: int | None


class AnalysisHunkResponse(BaseModel):
    id: str
    old_start: int
    old_lines: int
    new_start: int
    new_lines: int
    header: str | None
    raw_text: str | None
    lines: list[AnalysisHunkLineResponse] = Field(default_factory=list)


class AnalysisFileResponse(BaseModel):
    id: str
    path_old: str | None
    path_new: str
    change_type: Literal["added", "modified", "deleted", "renamed"]
    is_binary: bool
    additions_count: int
    deletions_count: int
    hunks: list[AnalysisHunkResponse] = Field(default_factory=list)


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


AnalysisResponse.model_rebuild()


def _raise_api_error(exc: ServiceError) -> None:
    raise ApiError(
        status_code=exc.status_code,
        code=exc.code,
        message=exc.message,
        details=exc.details,
    ) from exc


def _parse_metadata_query(raw: str | None) -> dict[str, Any]:
    if raw is None or not raw.strip():
        return {}
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ApiError(
            status_code=400,
            code="INVALID_METADATA",
            message="metadata query must be valid JSON object",
            details={"field": "metadata"},
        ) from exc
    if not isinstance(parsed, dict):
        raise ApiError(
            status_code=400,
            code="INVALID_METADATA",
            message="metadata query must be a JSON object",
            details={"field": "metadata"},
        )
    return parsed


def _to_finding_response(model: Finding) -> FindingResponse:
    return FindingResponse(
        id=model.id,
        analysis_id=model.analysis_id,
        source=model.source,
        file_path=model.file_path,
        line_start=model.line_start,
        line_end=model.line_end,
        severity=model.severity,
        category=model.category,
        message=model.message,
        suggestion=model.suggestion,
        confidence=model.confidence,
        issue_type=model.issue_type,
        rule_id=model.rule_id,
        evidence=model.evidence,
        fingerprint=model.fingerprint,
        created_at=model.created_at,
    )


def _to_hunk_line_response(model: AnalysisHunkLineData) -> AnalysisHunkLineResponse:
    return AnalysisHunkLineResponse(
        id=model.id,
        line_type=model.line_type,
        content=model.content,
        old_line_no=model.old_line_no,
        new_line_no=model.new_line_no,
    )


def _to_hunk_response(model: AnalysisHunkData) -> AnalysisHunkResponse:
    return AnalysisHunkResponse(
        id=model.id,
        old_start=model.old_start,
        old_lines=model.old_lines,
        new_start=model.new_start,
        new_lines=model.new_lines,
        header=model.header,
        raw_text=model.raw_text,
        lines=[_to_hunk_line_response(line) for line in model.lines],
    )


def _to_file_response(model: AnalysisFileData) -> AnalysisFileResponse:
    return AnalysisFileResponse(
        id=model.id,
        path_old=model.path_old,
        path_new=model.path_new,
        change_type=model.change_type,
        is_binary=model.is_binary,
        additions_count=model.additions_count,
        deletions_count=model.deletions_count,
        hunks=[_to_hunk_response(hunk) for hunk in model.hunks],
    )


def _to_tool_run_response(model: ToolRun) -> ToolRunResponse:
    return ToolRunResponse(
        id=model.id,
        analysis_id=model.analysis_id,
        tool_name=model.tool_name,
        status=model.status,
        started_at=model.started_at,
        finished_at=model.finished_at,
        duration_ms=model.duration_ms,
        exit_code=model.exit_code,
        findings_count=model.findings_count,
        scanned_files=model.scanned_files,
        version=model.version,
        warning=model.warning,
        command=model.command,
        workspace_path=model.workspace_path,
        stdout_snippet=model.stdout_snippet,
        stderr_snippet=model.stderr_snippet,
        created_at=model.created_at,
    )


def _to_analysis_response(
    model: Analysis,
    findings: list[Finding] | None = None,
    files_changed: list[AnalysisFileData] | None = None,
    tool_runs: list[ToolRun] | None = None,
) -> AnalysisResponse:
    findings_response = [] if findings is None else [_to_finding_response(item) for item in findings]
    security_findings = [item for item in findings_response if item.category == "security"]
    static_findings = [item for item in findings_response if item.source.startswith("STATIC_")]
    return AnalysisResponse(
        analysis_id=model.id,
        status=model.status,
        stage=model.stage,
        progress=model.progress,
        nb_files_changed=model.nb_files_changed,
        additions_total=model.additions_total,
        deletions_total=model.deletions_total,
        repo=model.repo,
        provider=model.provider,
        pr_number=model.pr_number,
        commit_sha=model.commit_sha,
        source=model.source,
        created_at=model.created_at,
        updated_at=model.updated_at,
        diff_hash=model.diff_hash,
        diff_redacted=model.diff_redacted,
        has_secrets=model.has_secrets,
        redaction_stats=model.redaction_stats,
        static_stats=model.static_stats,
        change_type=model.change_type,
        change_type_confidence=model.change_type_confidence,
        change_type_source=model.change_type_source,
        change_type_signals=model.change_type_signals,
        error_code=model.error_code,
        error_message=model.error_message,
        metadata=model.metadata,
        findings=findings_response,
        security_findings=security_findings,
        static_findings=static_findings,
        tool_runs=[] if tool_runs is None else [_to_tool_run_response(item) for item in tool_runs],
        files_changed=[] if files_changed is None else [_to_file_response(item) for item in files_changed],
    )


@router.post("/analyze", response_model=AnalyzeAcceptedResponse, status_code=202)
@router.post("/analyses", response_model=AnalyzeAcceptedResponse, status_code=202)
async def create_analysis(
    payload: AnalyzeRequest,
    _principal: AuthenticatedPrincipal | None = Depends(require_permission("analyses.create")),
    service: AnalysisService = Depends(get_analysis_service),
) -> AnalyzeAcceptedResponse:
    created: Analysis | None = None
    try:
        created = await service.create_analysis(
            CreateAnalysisCommand(
                source=payload.source,
                repo=payload.repo,
                pr_number=payload.pr_number,
                commit_sha=payload.commit_sha,
                diff_text=payload.diff_text,
                metadata=payload.metadata,
            )
        )
        queued = await service.update_analysis_status(
            UpdateAnalysisStatusCommand(
                analysis_id=created.id,
                status="QUEUED",
                stage="QUEUED",
                progress=10,
                metadata_updates={"pipeline": {"queued": True}},
            )
        )
        enqueued = enqueue_analysis_job(created.id)
    except QueueUnavailableError as exc:
        if created is not None:
            try:
                await service.update_analysis_status(
                    UpdateAnalysisStatusCommand(
                        analysis_id=created.id,
                        status="FAILED",
                        stage="FAILED",
                        progress=100,
                        error_code="QUEUE_DOWN",
                        error_message="Unable to enqueue analysis job",
                        metadata_updates={"pipeline": {"queued": False}},
                    )
                )
            except ServiceError:
                pass
        raise ApiError(
            status_code=503,
            code="QUEUE_UNAVAILABLE",
            message="Queue unavailable while enqueuing analysis",
            details={"analysis_id": created.id if created is not None else None},
        ) from exc
    except ServiceError as exc:
        _raise_api_error(exc)

    return AnalyzeAcceptedResponse(analysis_id=queued.id, status="QUEUED", task_id=enqueued.task_id)


@router.post("/analyze/stream", response_model=AnalyzeAcceptedResponse, status_code=202)
@router.post("/analyses/stream", response_model=AnalyzeAcceptedResponse, status_code=202)
async def create_analysis_stream(
    request: Request,
    source: Literal["github_actions", "github_webhook", "cli", "manual"] = Query(default="github_actions"),
    repo: str = Query(max_length=255),
    pr_number: int | None = Query(default=None, ge=1),
    commit_sha: str | None = Query(default=None, min_length=6, max_length=64, pattern=r"^[0-9a-fA-F]+$"),
    metadata: str | None = Query(default=None),
    _principal: AuthenticatedPrincipal | None = Depends(require_permission("analyses.create")),
    service: AnalysisService = Depends(get_analysis_service),
) -> AnalyzeAcceptedResponse:
    created: Analysis | None = None
    try:
        created = await service.create_analysis_from_stream(
            source=source,
            repo=repo,
            pr_number=pr_number,
            commit_sha=commit_sha,
            metadata=_parse_metadata_query(metadata),
            diff_stream=request.stream(),
        )
        queued = await service.update_analysis_status(
            UpdateAnalysisStatusCommand(
                analysis_id=created.id,
                status="QUEUED",
                stage="QUEUED",
                progress=10,
                metadata_updates={"pipeline": {"queued": True}},
            )
        )
        enqueued = enqueue_analysis_job(created.id)
    except QueueUnavailableError as exc:
        if created is not None:
            try:
                await service.update_analysis_status(
                    UpdateAnalysisStatusCommand(
                        analysis_id=created.id,
                        status="FAILED",
                        stage="FAILED",
                        progress=100,
                        error_code="QUEUE_DOWN",
                        error_message="Unable to enqueue analysis job",
                        metadata_updates={"pipeline": {"queued": False}},
                    )
                )
            except ServiceError:
                pass
        raise ApiError(
            status_code=503,
            code="QUEUE_UNAVAILABLE",
            message="Queue unavailable while enqueuing analysis",
            details={"analysis_id": created.id if created is not None else None},
        ) from exc
    except ServiceError as exc:
        _raise_api_error(exc)

    return AnalyzeAcceptedResponse(analysis_id=queued.id, status="QUEUED", task_id=enqueued.task_id)


@router.get("/analyses/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(
    analysis_id: str,
    _principal: AuthenticatedPrincipal | None = Depends(require_permission("analyses.read")),
    service: AnalysisService = Depends(get_analysis_service),
) -> AnalysisResponse:
    try:
        analysis = await service.get_analysis(analysis_id)
        findings = await service.list_findings(analysis_id)
        files_changed = await service.list_files_with_hunks(analysis_id)
        tool_runs = await service.list_tool_runs(analysis_id)
    except ServiceError as exc:
        _raise_api_error(exc)

    return _to_analysis_response(analysis, findings=findings, files_changed=files_changed, tool_runs=tool_runs)


@router.get("/analyses", response_model=AnalysisListResponse)
async def list_analyses(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=settings.API_DEFAULT_PAGE_SIZE, ge=1, le=settings.API_MAX_PAGE_SIZE),
    _principal: AuthenticatedPrincipal | None = Depends(require_permission("analyses.read")),
    service: AnalysisService = Depends(get_analysis_service),
) -> AnalysisListResponse:
    try:
        page_result = await service.list_analyses(page=page, size=size)
    except ServiceError as exc:
        _raise_api_error(exc)

    return AnalysisListResponse(
        items=[_to_analysis_response(item, findings=None, files_changed=None) for item in page_result.items],
        page=page_result.page,
        size=page_result.size,
        total=page_result.total,
        pages=page_result.pages,
    )


@router.post("/analyses/{analysis_id}/status", response_model=AnalysisResponse)
async def update_analysis_status(
    analysis_id: str,
    payload: UpdateStatusRequest,
    _principal: AuthenticatedPrincipal | None = Depends(require_permission("analyses.write")),
    service: AnalysisService = Depends(get_analysis_service),
) -> AnalysisResponse:
    try:
        updated = await service.update_analysis_status(
            UpdateAnalysisStatusCommand(
                analysis_id=analysis_id,
                status=payload.status,
                error_code=payload.error_code,
                error_message=payload.error_message,
                stage=payload.stage,
                progress=payload.progress,
            )
        )
        findings = await service.list_findings(analysis_id)
        files_changed = await service.list_files_with_hunks(analysis_id)
        tool_runs = await service.list_tool_runs(analysis_id)
    except ServiceError as exc:
        _raise_api_error(exc)

    return _to_analysis_response(updated, findings=findings, files_changed=files_changed, tool_runs=tool_runs)


@router.post("/analyses/{analysis_id}/findings", response_model=FindingResponse, status_code=201)
async def create_analysis_finding(
    analysis_id: str,
    payload: CreateFindingRequest,
    _principal: AuthenticatedPrincipal | None = Depends(require_permission("analyses.write")),
    service: AnalysisService = Depends(get_analysis_service),
) -> FindingResponse:
    try:
        finding = await service.create_finding(
            CreateFindingCommand(
                analysis_id=analysis_id,
                source=payload.source,
                file_path=payload.file_path,
                line_start=payload.line_start,
                line_end=payload.line_end,
                severity=payload.severity,
                category=payload.category,
                message=payload.message,
                suggestion=payload.suggestion,
                confidence=payload.confidence,
                issue_type=payload.issue_type,
                rule_id=payload.rule_id,
                evidence=payload.evidence,
            )
        )
    except ServiceError as exc:
        _raise_api_error(exc)

    return _to_finding_response(finding)
