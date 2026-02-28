from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal, Protocol


StaticSeverity = Literal["INFO", "WARN", "BLOCKER"]
StaticCategory = Literal["security", "quality", "style", "perf", "maintainability", "other"]


@dataclass(frozen=True)
class StaticRawFinding:
    tool: Literal["ruff", "semgrep"]
    rule_id: str
    file_path: str
    line_start: int | None
    line_end: int | None
    severity: str
    message: str
    suggestion: str | None = None
    evidence: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class StaticFinding:
    source: Literal["STATIC_RUFF", "STATIC_SEMGREP"]
    rule_id: str
    file_path: str
    line_start: int | None
    line_end: int | None
    severity: StaticSeverity
    category: StaticCategory
    message: str
    suggestion: str | None
    confidence: float
    evidence: dict[str, Any]


@dataclass(frozen=True)
class StaticToolResult:
    tool: Literal["ruff", "semgrep"]
    findings: list[StaticRawFinding]
    duration_ms: int
    scanned_files: int
    version: str | None
    status: Literal["SUCCESS", "FAILED", "SKIPPED"] = "SUCCESS"
    started_at: str | None = None
    finished_at: str | None = None
    exit_code: int | None = None
    command: list[str] = field(default_factory=list)
    workspace_path: str | None = None
    stdout_snippet: str | None = None
    stderr_snippet: str | None = None
    warning: str | None = None


@dataclass(frozen=True)
class StaticAnalysisResult:
    findings: list[StaticFinding]
    stats: dict[str, Any]
    warnings: list[str]
    tool_runs: list[StaticToolResult] = field(default_factory=list)


class StaticToolAnalyzer(Protocol):
    tool_name: Literal["ruff", "semgrep"]

    def run(self, *, paths: list[str], workspace: str, timeout_seconds: int) -> StaticToolResult: ...
