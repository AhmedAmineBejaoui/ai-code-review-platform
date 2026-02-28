from __future__ import annotations

import asyncio
import hashlib
import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from math import ceil
from typing import Any, Protocol

from app.data.models.analysis import Analysis
from app.data.models.finding import Finding
from app.data.models.parsed_diff import AnalysisFileData
from app.data.models.tool_run import ToolRun
from app.data.repos.analyses_repo import CreateAnalysisInput, CreateFindingInput, DuplicateAnalysisError
from app.settings import settings

_REPO_PATTERN = re.compile(r"^[^/\s]+/[^/\s]+$")
_ALLOWED_STATUSES = {"RECEIVED", "QUEUED", "RUNNING", "COMPLETED", "FAILED"}
_STATUS_TRANSITIONS: dict[str, set[str]] = {
    "RECEIVED": {"QUEUED", "FAILED"},
    "QUEUED": {"RUNNING", "FAILED"},
    "RUNNING": {"COMPLETED", "FAILED"},
    "COMPLETED": set(),
    "FAILED": set(),
}


class AnalysesStore(Protocol):
    def find_duplicate(self, repo: str, diff_hash: str) -> str | None: ...
    def create(self, payload: CreateAnalysisInput) -> Analysis: ...
    def get_by_id(self, analysis_id: str) -> Analysis | None: ...
    def list_paginated(self, page: int, size: int) -> tuple[list[Analysis], int]: ...
    def update_status(
        self,
        *,
        analysis_id: str,
        status: str,
        error_code: str | None = None,
        error_message: str | None = None,
        stage: str | None = None,
        progress: int | None = None,
        metadata_updates: dict[str, Any] | None = None,
    ) -> Analysis | None: ...
    def create_finding(self, payload: CreateFindingInput) -> Finding: ...
    def list_findings_by_analysis(self, analysis_id: str) -> list[Finding]: ...
    def list_analysis_files_with_hunks(self, analysis_id: str) -> list[AnalysisFileData]: ...
    def list_tool_runs_by_analysis(self, analysis_id: str) -> list[ToolRun]: ...


class GitProvider(Protocol):
    async def fetch_pr_context(self, repo: str, pr_number: int | None, commit_sha: str | None) -> dict[str, Any]: ...


class LLMProvider(Protocol):
    async def summarize_diff(self, diff_text: str, max_chars: int = 500) -> str: ...


class VectorProvider(Protocol):
    async def search_related_rules(self, repo: str, diff_text: str, limit: int = 3) -> list[str]: ...


class PolicyProvider(Protocol):
    async def evaluate_intake(self, repo: str, metadata: dict[str, Any]) -> dict[str, Any]: ...


@dataclass(frozen=True)
class CreateAnalysisCommand:
    source: str
    repo: str
    pr_number: int | None
    commit_sha: str | None
    diff_text: str
    metadata: dict[str, Any]


@dataclass(frozen=True)
class UpdateAnalysisStatusCommand:
    analysis_id: str
    status: str
    error_code: str | None = None
    error_message: str | None = None
    stage: str | None = None
    progress: int | None = None
    metadata_updates: dict[str, Any] | None = None


@dataclass(frozen=True)
class CreateFindingCommand:
    analysis_id: str
    source: str
    file_path: str | None
    line_start: int | None
    line_end: int | None
    severity: str
    category: str
    message: str
    suggestion: str | None = None
    confidence: float | None = None
    issue_type: str | None = None
    rule_id: str | None = None
    evidence: dict[str, Any] | None = None


@dataclass(frozen=True)
class PaginatedAnalyses:
    items: list[Analysis]
    page: int
    size: int
    total: int

    @property
    def pages(self) -> int:
        if self.total == 0:
            return 0
        return ceil(self.total / self.size)


@dataclass(frozen=True)
class ServiceError(Exception):
    code: str
    message: str
    status_code: int
    details: dict[str, Any] | None = None

    def __str__(self) -> str:
        return self.message


class AnalysisService:
    def __init__(
        self,
        *,
        repo_store: AnalysesStore,
        git_provider: GitProvider,
        llm_provider: LLMProvider,
        vector_provider: VectorProvider,
        policy_provider: PolicyProvider,
    ) -> None:
        self._repo_store = repo_store
        self._git_provider = git_provider
        self._llm_provider = llm_provider
        self._vector_provider = vector_provider
        self._policy_provider = policy_provider

    async def create_analysis(self, command: CreateAnalysisCommand) -> Analysis:
        repo, diff_text, commit_sha = self._validate(command)

        diff_hash = hashlib.sha256(diff_text.encode("utf-8")).hexdigest()
        analysis_id = uuid.uuid4().hex
        created_at = self._utc_iso_z_now()

        duplicate_id = await asyncio.to_thread(self._repo_store.find_duplicate, repo, diff_hash)
        if duplicate_id:
            raise ServiceError(
                code="DUPLICATE_ANALYSIS",
                message="An analysis with the same repo and diff_hash already exists",
                status_code=409,
                details={"existing_id": duplicate_id},
            )

        try:
            return await asyncio.to_thread(
                self._repo_store.create,
                CreateAnalysisInput(
                    analysis_id=analysis_id,
                    repo=repo,
                    provider="github",
                    pr_number=command.pr_number,
                    commit_sha=commit_sha,
                    source=command.source,
                    status="RECEIVED",
                    stage="RECEIVED",
                    progress=0,
                    nb_files_changed=0,
                    additions_total=0,
                    deletions_total=0,
                    created_at=created_at,
                    updated_at=created_at,
                    diff_hash=diff_hash,
                    diff_raw=diff_text,
                    diff_redacted=None,
                    has_secrets=False,
                    redaction_stats={},
                    static_stats={},
                    error_code=None,
                    error_message=None,
                    metadata=command.metadata,
                ),
            )
        except DuplicateAnalysisError as exc:
            raise ServiceError(
                code="DUPLICATE_ANALYSIS",
                message="An analysis with the same repo and diff_hash already exists",
                status_code=409,
                details={"existing_id": exc.existing_id},
            ) from exc
        except Exception as exc:
            raise ServiceError(
                code="DB_UNAVAILABLE",
                message="Database unavailable while storing analysis",
                status_code=503,
            ) from exc

    async def get_analysis(self, analysis_id: str) -> Analysis:
        try:
            analysis = await asyncio.to_thread(self._repo_store.get_by_id, analysis_id)
        except Exception as exc:
            raise ServiceError(
                code="DB_UNAVAILABLE",
                message="Database unavailable while reading analysis",
                status_code=503,
            ) from exc

        if analysis is None:
            raise ServiceError(
                code="ANALYSIS_NOT_FOUND",
                message="analysis_id not found",
                status_code=404,
                details={"analysis_id": analysis_id},
            )
        return analysis

    async def update_analysis_status(self, command: UpdateAnalysisStatusCommand) -> Analysis:
        current = await self.get_analysis(command.analysis_id)
        target_status = command.status.strip().upper()

        if target_status not in _ALLOWED_STATUSES:
            raise ServiceError(
                code="INVALID_STATUS",
                message="status is invalid",
                status_code=400,
                details={"allowed_statuses": sorted(_ALLOWED_STATUSES)},
            )

        if command.progress is not None and not (0 <= command.progress <= 100):
            raise ServiceError(
                code="INVALID_PROGRESS",
                message="progress must be between 0 and 100",
                status_code=400,
                details={"progress": command.progress},
            )

        if (
            current.status == target_status
            and command.error_code is None
            and command.error_message is None
            and command.stage is None
            and command.progress is None
            and command.metadata_updates is None
        ):
            return current

        allowed_next = _STATUS_TRANSITIONS.get(current.status, set())
        if current.status != target_status and target_status not in allowed_next:
            raise ServiceError(
                code="INVALID_STATUS_TRANSITION",
                message=f"cannot transition from {current.status} to {target_status}",
                status_code=409,
                details={"from": current.status, "to": target_status, "allowed_next": sorted(allowed_next)},
            )

        try:
            updated = await asyncio.to_thread(
                self._repo_store.update_status,
                analysis_id=command.analysis_id,
                status=target_status,
                error_code=command.error_code,
                error_message=command.error_message,
                stage=command.stage,
                progress=command.progress,
                metadata_updates=command.metadata_updates,
            )
        except Exception as exc:
            raise ServiceError(
                code="DB_UNAVAILABLE",
                message="Database unavailable while updating analysis status",
                status_code=503,
            ) from exc

        if updated is None:
            raise ServiceError(
                code="ANALYSIS_NOT_FOUND",
                message="analysis_id not found",
                status_code=404,
                details={"analysis_id": command.analysis_id},
            )

        return updated

    async def create_finding(self, command: CreateFindingCommand) -> Finding:
        if command.severity not in {"INFO", "WARN", "BLOCKER"}:
            raise ServiceError(
                code="INVALID_SEVERITY",
                message="severity must be one of INFO, WARN, BLOCKER",
                status_code=400,
            )

        if command.confidence is not None and not (0 <= command.confidence <= 1):
            raise ServiceError(
                code="INVALID_CONFIDENCE",
                message="confidence must be between 0 and 1",
                status_code=400,
            )

        await self.get_analysis(command.analysis_id)

        fingerprint_source = "|".join(
            [
                command.analysis_id,
                command.file_path or "",
                str(command.line_start or ""),
                str(command.line_end or ""),
                command.category.strip().lower(),
                (command.issue_type or "").strip().lower(),
                command.message.strip(),
            ]
        )
        fingerprint = hashlib.sha256(fingerprint_source.encode("utf-8")).hexdigest()
        finding_id = uuid.uuid4().hex

        try:
            finding = await asyncio.to_thread(
                self._repo_store.create_finding,
                CreateFindingInput(
                    finding_id=finding_id,
                    analysis_id=command.analysis_id,
                    source=command.source,
                    file_path=command.file_path,
                    line_start=command.line_start,
                    line_end=command.line_end,
                    severity=command.severity,
                    category=command.category,
                    message=command.message,
                    suggestion=command.suggestion,
                    confidence=command.confidence,
                    issue_type=command.issue_type,
                    rule_id=command.rule_id,
                    evidence=command.evidence or {},
                    fingerprint=fingerprint,
                ),
            )
        except Exception as exc:
            raise ServiceError(
                code="DB_UNAVAILABLE",
                message="Database unavailable while creating finding",
                status_code=503,
            ) from exc

        return finding

    async def list_findings(self, analysis_id: str) -> list[Finding]:
        await self.get_analysis(analysis_id)
        try:
            return await asyncio.to_thread(self._repo_store.list_findings_by_analysis, analysis_id)
        except Exception as exc:
            raise ServiceError(
                code="DB_UNAVAILABLE",
                message="Database unavailable while listing findings",
                status_code=503,
            ) from exc

    async def list_files_with_hunks(self, analysis_id: str) -> list[AnalysisFileData]:
        await self.get_analysis(analysis_id)
        try:
            return await asyncio.to_thread(self._repo_store.list_analysis_files_with_hunks, analysis_id)
        except Exception as exc:
            raise ServiceError(
                code="DB_UNAVAILABLE",
                message="Database unavailable while listing files and hunks",
                status_code=503,
            ) from exc

    async def list_tool_runs(self, analysis_id: str) -> list[ToolRun]:
        await self.get_analysis(analysis_id)
        try:
            return await asyncio.to_thread(self._repo_store.list_tool_runs_by_analysis, analysis_id)
        except Exception as exc:
            raise ServiceError(
                code="DB_UNAVAILABLE",
                message="Database unavailable while listing tool runs",
                status_code=503,
            ) from exc

    async def list_analyses(self, page: int, size: int) -> PaginatedAnalyses:
        if page < 1:
            raise ServiceError(code="INVALID_PAGE", message="page must be >= 1", status_code=400, details={"page": page})
        if size < 1 or size > settings.API_MAX_PAGE_SIZE:
            raise ServiceError(
                code="INVALID_SIZE",
                message=f"size must be between 1 and {settings.API_MAX_PAGE_SIZE}",
                status_code=400,
                details={"size": size, "max_size": settings.API_MAX_PAGE_SIZE},
            )

        try:
            items, total = await asyncio.to_thread(self._repo_store.list_paginated, page, size)
            return PaginatedAnalyses(items=items, page=page, size=size, total=total)
        except Exception as exc:
            raise ServiceError(
                code="DB_UNAVAILABLE",
                message="Database unavailable while listing analyses",
                status_code=503,
            ) from exc

    def _validate(self, command: CreateAnalysisCommand) -> tuple[str, str, str | None]:
        repo = command.repo.strip()
        if not repo:
            raise ServiceError(
                code="MISSING_REPO",
                message="repo is required",
                status_code=400,
                details={"field": "repo"},
            )
        if not _REPO_PATTERN.match(repo):
            raise ServiceError(
                code="INVALID_REPO_FORMAT",
                message="repo must match owner/name format",
                status_code=400,
                details={"field": "repo"},
            )

        diff_text = command.diff_text
        if not diff_text.strip():
            raise ServiceError(
                code="EMPTY_DIFF",
                message="diff_text is empty",
                status_code=400,
                details={"field": "diff_text"},
            )

        if command.pr_number is None and not (command.commit_sha or "").strip():
            raise ServiceError(
                code="MISSING_TARGET",
                message="pr_number or commit_sha is required",
                status_code=400,
                details={"fields": ["pr_number", "commit_sha"]},
            )

        diff_size = len(diff_text.encode("utf-8"))
        if diff_size > settings.MAX_DIFF_BYTES:
            raise ServiceError(
                code="DIFF_TOO_LARGE",
                message="diff_text exceeds max allowed size",
                status_code=413,
                details={"max_bytes": settings.MAX_DIFF_BYTES, "current_bytes": diff_size},
            )

        if "diff --git" not in diff_text and "@@" not in diff_text:
            raise ServiceError(
                code="INVALID_DIFF_FORMAT",
                message="diff_text must contain a unified diff marker",
                status_code=400,
                details={"accepted_markers": ["diff --git", "@@"]},
            )

        commit_sha = (command.commit_sha or "").strip() or None
        return repo, diff_text, commit_sha

    @staticmethod
    def _utc_iso_z_now() -> str:
        return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
