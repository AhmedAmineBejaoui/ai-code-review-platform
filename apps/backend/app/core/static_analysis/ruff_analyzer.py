from __future__ import annotations

import json
import subprocess
import time
from datetime import datetime, timezone
from typing import Any, Literal

from app.core.static_analysis.base import StaticRawFinding, StaticToolResult


def parse_ruff_output(stdout: str) -> list[StaticRawFinding]:
    payload: Any
    if not stdout.strip():
        return []
    payload = json.loads(stdout)
    if not isinstance(payload, list):
        return []

    findings: list[StaticRawFinding] = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        rule_id = str(item.get("code") or "RUFF")
        file_path = str(item.get("filename") or "")
        message = str(item.get("message") or "Ruff finding")
        line_start = item.get("location", {}).get("row")
        line_end = item.get("end_location", {}).get("row", line_start)
        fix = item.get("fix")
        suggestion = None
        if isinstance(fix, dict):
            suggestion = str(fix.get("message") or "") or None
        findings.append(
            StaticRawFinding(
                tool="ruff",
                rule_id=rule_id,
                file_path=file_path,
                line_start=int(line_start) if isinstance(line_start, int) else None,
                line_end=int(line_end) if isinstance(line_end, int) else None,
                severity="WARN",
                message=message,
                suggestion=suggestion,
                evidence={"tool": "ruff"},
            )
        )
    return findings


class RuffAnalyzer:
    tool_name = "ruff"

    def run(self, *, paths: list[str], workspace: str, timeout_seconds: int) -> StaticToolResult:
        started = time.perf_counter()
        started_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        if not paths:
            return StaticToolResult(
                tool="ruff",
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

        command = ["ruff", "check", "--output-format=json", *paths]
        warning: str | None = None
        findings: list[StaticRawFinding] = []
        version: str | None = None
        exit_code: int | None = None
        stdout_snippet: str | None = None
        stderr_snippet: str | None = None
        status: Literal["SUCCESS", "FAILED", "SKIPPED"] = "SUCCESS"

        try:
            version_run = subprocess.run(
                ["ruff", "--version"],
                cwd=workspace,
                capture_output=True,
                text=True,
                timeout=max(5, timeout_seconds // 2),
                check=False,
            )
            if version_run.returncode == 0:
                version = version_run.stdout.strip() or None
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
                warning = "ruff command failed"
                status = "FAILED"
            try:
                findings = parse_ruff_output(completed.stdout)
            except Exception:
                warning = "ruff output parsing failed"
                findings = []
                status = "FAILED"
        except FileNotFoundError:
            warning = "ruff is not installed"
            status = "FAILED"
        except subprocess.TimeoutExpired:
            warning = "ruff command timed out"
            status = "FAILED"
        except Exception:
            warning = "ruff execution failed"
            status = "FAILED"

        duration_ms = int((time.perf_counter() - started) * 1000)
        finished_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        return StaticToolResult(
            tool="ruff",
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
