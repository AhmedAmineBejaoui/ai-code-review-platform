"""
Data models for Analysis Service.
"""

from dataclasses import dataclass, field
from typing import Any, Literal, Optional


@dataclass
class Analysis:
    """Analysis model."""
    id: str
    repo: str
    provider: str = "github"
    project_id: Optional[str] = None
    pr_number: Optional[int] = None
    commit_sha: Optional[str] = None
    source: str = "manual"
    status: str = "RECEIVED"
    stage: Optional[str] = None
    progress: Optional[int] = None
    nb_files_changed: Optional[int] = None
    additions_total: Optional[int] = None
    deletions_total: Optional[int] = None
    created_at: str = ""
    updated_at: str = ""
    diff_hash: str = ""
    diff_raw: str = ""
    summary: Optional[str] = None
    diff_redacted: Optional[str] = None
    has_secrets: bool = False
    redaction_stats: dict[str, Any] = field(default_factory=dict)
    static_stats: dict[str, Any] = field(default_factory=dict)
    change_type: Optional[Literal["bugfix", "feature", "refactor"]] = None
    change_type_confidence: Optional[float] = None
    change_type_source: Optional[Literal["heuristic", "llm"]] = None
    change_type_signals: dict[str, Any] = field(default_factory=dict)
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    metadata: dict[str, Any] = field(default_factory=dict)
    findings_count: int = 0
    blocker_count: int = 0
    warn_count: int = 0
    info_count: int = 0


@dataclass
class Finding:
    """Analysis finding model."""
    id: str
    analysis_id: str
    source: str
    file_path: Optional[str] = None
    line_start: Optional[int] = None
    line_end: Optional[int] = None
    severity: Literal["INFO", "WARN", "BLOCKER"] = "WARN"
    category: str = "quality"
    message: str = ""
    suggestion: Optional[str] = None
    confidence: Optional[float] = None
    issue_type: Optional[str] = None
    rule_id: Optional[str] = None
    evidence: dict[str, Any] = field(default_factory=dict)
    fingerprint: str = ""
    created_at: str = ""


@dataclass
class ToolRun:
    """Tool run record."""
    id: str
    analysis_id: str
    tool_name: str
    status: Literal["SUCCESS", "FAILED", "SKIPPED"] = "SUCCESS"
    started_at: str = ""
    finished_at: Optional[str] = None
    duration_ms: int = 0
    exit_code: Optional[int] = None
    findings_count: int = 0
    scanned_files: int = 0
    version: Optional[str] = None
    warning: Optional[str] = None
    command: Optional[str] = None
    workspace_path: Optional[str] = None
    stdout_snippet: Optional[str] = None
    stderr_snippet: Optional[str] = None
    created_at: str = ""


@dataclass
class AnalysisFile:
    """File changed in an analysis."""
    id: str
    analysis_id: str
    path_old: Optional[str] = None
    path_new: str = ""
    change_type: Literal["added", "modified", "deleted", "renamed"] = "modified"
    is_binary: bool = False
    additions_count: int = 0
    deletions_count: int = 0


@dataclass
class PageResult:
    """Paginated result."""
    items: list
    page: int
    size: int
    total: int
    pages: int
