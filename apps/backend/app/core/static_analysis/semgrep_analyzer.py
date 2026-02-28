from __future__ import annotations

import json
import subprocess
import time
from datetime import datetime, timezone
from typing import Any, Literal

from app.core.static_analysis.base import StaticRawFinding, StaticToolResult


def parse_semgrep_output(stdout: str) -> list[StaticRawFinding]:
    if not stdout.strip():
        return []
    payload: Any = json.loads(stdout)
    if not isinstance(payload, dict):
        return []
    results = payload.get("results", [])
    if not isinstance(results, list):
        return []

    findings: list[StaticRawFinding] = []
    for item in results:
        if not isinstance(item, dict):
            continue
        extra = item.get("extra") or {}
        start = item.get("start") or {}
        end = item.get("end") or {}
        metadata = extra.get("metadata") if isinstance(extra, dict) else {}
        metadata = metadata if isinstance(metadata, dict) else {}

        findings.append(
            StaticRawFinding(
                tool="semgrep",
                rule_id=str(item.get("check_id") or "semgrep.rule"),
                file_path=str(item.get("path") or ""),
                line_start=int(start.get("line")) if isinstance(start.get("line"), int) else None,
                line_end=int(end.get("line")) if isinstance(end.get("line"), int) else None,
                severity=str(extra.get("severity") or "WARNING"),
                message=str(extra.get("message") or "Semgrep finding"),
                suggestion=None,
                evidence={
                    "tool": "semgrep",
                    "metadata_category": metadata.get("category"),
                },
            )
        )
    return findings


class SemgrepAnalyzer:
    tool_name = "semgrep"

    def run(self, *, paths: list[str], workspace: str, timeout_seconds: int) -> StaticToolResult:
        started = time.perf_counter()
        started_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        if not paths:
            return StaticToolResult(
                tool="semgrep",
                findings=[],
                duration_ms=0,
                scanned_files=0,
                version=None,
                status="SKIPPED",
                started_at=started_at,
                finished_at=started_at,
                command=[],
                workspace_path=workspace,
            )

        command = ["semgrep", "scan", "--config=auto", "--json", "--quiet", "--timeout", str(timeout_seconds), *paths]
        warning: str | None = None
        findings: list[StaticRawFinding] = []
        version: str | None = None
        exit_code: int | None = None
        stdout_snippet: str | None = None
        stderr_snippet: str | None = None
        status: Literal["SUCCESS", "FAILED", "SKIPPED"] = "SUCCESS"

        try:
            version_run = subprocess.run(
                ["semgrep", "--version"],
                cwd=workspace,
                capture_output=True,
                text=True,
                timeout=max(5, timeout_seconds // 2),
                check=False,
            )
            if version_run.returncode == 0:
                version = version_run.stdout.strip() or None
            elif version_run.stderr.strip():
                warning = "semgrep command failed"
        except Exception:
            version = None

        try:
            completed = subprocess.run(
                command,
                cwd=workspace,
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
                check=False,
            )
            exit_code = completed.returncode
            stdout_snippet = completed.stdout[:1000] if completed.stdout else None
            stderr_snippet = completed.stderr[:1000] if completed.stderr else None
            if completed.returncode not in (0, 1):
                warning = "semgrep command failed"
                status = "FAILED"
            try:
                findings = parse_semgrep_output(completed.stdout)
                if completed.returncode == 1 and not findings and completed.stderr.strip():
                    warning = "semgrep command failed"
                    status = "FAILED"
            except Exception:
                warning = "semgrep output parsing failed"
                findings = []
                status = "FAILED"
        except FileNotFoundError:
            warning = "semgrep is not installed"
            status = "FAILED"
        except subprocess.TimeoutExpired:
            warning = "semgrep command timed out"
            status = "FAILED"
        except Exception:
            warning = "semgrep execution failed"
            status = "FAILED"

        duration_ms = int((time.perf_counter() - started) * 1000)
        finished_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        return StaticToolResult(
            tool="semgrep",
            findings=findings,
            duration_ms=duration_ms,
            scanned_files=len(paths),
            version=version,
            status=status,
            started_at=started_at,
            finished_at=finished_at,
            exit_code=exit_code,
            command=command,
            workspace_path=workspace,
            stdout_snippet=stdout_snippet,
            stderr_snippet=stderr_snippet,
            warning=warning,
        )
