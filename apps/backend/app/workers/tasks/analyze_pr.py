from __future__ import annotations

import hashlib
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from app.core.review_engine.diff_engine import parse_unified_diff
from app.core.review_engine.security import redact_unified_diff_added_lines, scan_parsed_diff_for_secrets
from app.core.static_analysis import RuffAnalyzer, SemgrepAnalyzer, StaticAnalysisService
from app.core.static_analysis.base import StaticAnalysisResult
from app.core.static_analysis.workspace import prepare_workspace
from app.data.repos.analyses_repo import AnalysesRepo, CreateFindingInput, CreateToolRunInput
from app.settings import settings
from app.workers.celery_app import celery_app


def _security_message(rule_id: str, default_message: str) -> str:
    if rule_id == "SECRET_ENTROPY":
        return "Suspicious high-entropy token detected in added code."
    return default_message


def _security_fingerprint(analysis_id: str, file_path: str, line_no: int | None, rule_id: str, masked_preview: str) -> str:
    payload = "|".join([analysis_id, file_path, str(line_no or ""), "security", "secret_exposure", rule_id, masked_preview])
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _static_fingerprint(
    analysis_id: str,
    source: str,
    rule_id: str,
    file_path: str,
    line_start: int | None,
    line_end: int | None,
    message: str,
) -> str:
    payload = "|".join(
        [
            analysis_id,
            source,
            rule_id,
            file_path,
            str(line_start or ""),
            str(line_end or ""),
            message.strip(),
        ]
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def run_static_analysis_stage(parsed: Any, *, repo_name: str, commit_sha: str | None) -> StaticAnalysisResult:
    if not settings.STATIC_ANALYSIS_ENABLED:
        return StaticAnalysisResult(findings=[], stats={"scan_disabled": True}, warnings=[], tool_runs=[])

    analyzers = []
    if settings.STATIC_ANALYSIS_RUFF_ENABLED:
        analyzers.append(RuffAnalyzer())
    if settings.STATIC_ANALYSIS_SEMGREP_ENABLED:
        analyzers.append(SemgrepAnalyzer())

    if not analyzers:
        return StaticAnalysisResult(
            findings=[],
            stats={"scan_disabled": True, "reason": "no_tool_enabled"},
            warnings=[],
            tool_runs=[],
        )

    service = StaticAnalysisService(analyzers=analyzers)
    workspace = prepare_workspace(
        repo=repo_name,
        commit_sha=commit_sha,
        default_workspace_path=settings.STATIC_ANALYSIS_WORKSPACE_PATH,
        auto_checkout_enabled=settings.STATIC_ANALYSIS_AUTO_CHECKOUT_ENABLED,
        git_host=settings.STATIC_ANALYSIS_REPO_HOST,
        git_token=settings.STATIC_ANALYSIS_GIT_TOKEN,
        checkout_timeout_seconds=settings.STATIC_ANALYSIS_CHECKOUT_TIMEOUT_SECONDS,
        checkout_base_path=settings.STATIC_ANALYSIS_CHECKOUT_BASE_PATH,
    )
    try:
        result = service.run(
            parsed=parsed,
            workspace_path=workspace.path,
            timeout_seconds=settings.STATIC_ANALYSIS_TIMEOUT_SECONDS,
            max_files=settings.STATIC_ANALYSIS_MAX_FILES,
            max_findings=settings.STATIC_ANALYSIS_MAX_FINDINGS,
            filter_changed_lines=settings.STATIC_ANALYSIS_FILTER_CHANGED_LINES,
        )
        warnings = [*workspace.warnings, *result.warnings]
        stats = {
            **result.stats,
            "workspace": {
                "source": workspace.source,
                "path": workspace.path,
            },
        }
        if warnings:
            stats["warnings"] = warnings
        return StaticAnalysisResult(findings=result.findings, stats=stats, warnings=warnings, tool_runs=result.tool_runs)
    finally:
        workspace.cleanup()


@celery_app.task(name="analysis.run_minimal_pipeline", bind=True)
def run_minimal_analysis_pipeline(self, analysis_id: str) -> dict[str, Any]:
    repo = AnalysesRepo()
    started_at = time.perf_counter()

    analysis = repo.get_by_id(analysis_id)
    if analysis is None:
        return {
            "analysis_id": analysis_id,
            "status": "FAILED",
            "error_code": "ANALYSIS_NOT_FOUND",
        }

    try:
        repo.update_status(
            analysis_id=analysis_id,
            status="RUNNING",
            stage="RUNNING",
            progress=50,
            metadata_updates={"pipeline": {"task_id": self.request.id, "started": True}},
        )

        parsed = parse_unified_diff(analysis.diff_raw)
        files_count, additions_total, deletions_total = repo.replace_parsed_diff(analysis_id, parsed)

        security_findings_count = 0
        scan_failed = False
        scan_disabled = not settings.SECRET_SCAN_ENABLED
        has_secrets = False
        redaction_stats: dict[str, Any] = {
            "masked_count": 0,
            "rules_hit": {},
            "entropy_hits": 0,
            "scan_scope": "added_lines",
            "scanner_version": "t5-v1",
        }
        diff_redacted = "[REDACTION_DISABLED]" if scan_disabled else analysis.diff_raw

        if settings.SECRET_SCAN_ENABLED:
            try:
                scan_result = scan_parsed_diff_for_secrets(
                    parsed,
                    min_token_len=settings.SECRET_SCAN_MIN_TOKEN_LEN,
                    entropy_threshold=settings.SECRET_SCAN_ENTROPY_THRESHOLD,
                    max_findings=settings.SECRET_SCAN_MAX_FINDINGS,
                )
                redaction_result = redact_unified_diff_added_lines(
                    analysis.diff_raw,
                    min_token_len=settings.SECRET_SCAN_MIN_TOKEN_LEN,
                    entropy_threshold=settings.SECRET_SCAN_ENTROPY_THRESHOLD,
                )

                diff_redacted = redaction_result.diff_redacted
                has_secrets = scan_result.has_secrets or redaction_result.has_secrets
                redaction_stats = {
                    "masked_count": redaction_result.masked_count,
                    "rules_hit": redaction_result.rules_hit,
                    "entropy_hits": redaction_result.entropy_hits,
                    "scan_scope": redaction_result.scan_scope,
                    "scanner_version": redaction_result.scanner_version,
                    "findings_count": len(scan_result.detections),
                }

                for detection in scan_result.detections:
                    evidence = {
                        "rule_id": detection.match.rule_id,
                        "masked_preview": detection.match.masked_value[:120],
                    }
                    if detection.match.entropy_score is not None:
                        evidence["entropy_score"] = round(detection.match.entropy_score, 4)

                    try:
                        repo.create_finding(
                            CreateFindingInput(
                                finding_id=hashlib.md5(
                                    f"{analysis_id}:{detection.file_path}:{detection.line_no}:{detection.match.rule_id}:{detection.match.masked_value}".encode(
                                        "utf-8"
                                    )
                                ).hexdigest(),
                                analysis_id=analysis_id,
                                source="secret_scan",
                                file_path=detection.file_path,
                                line_start=detection.line_no,
                                line_end=detection.line_no,
                                severity=detection.match.severity,
                                category="security",
                                message=_security_message(detection.match.rule_id, detection.match.description),
                                suggestion="Remove the secret from code and rotate the credential using vault/secrets manager.",
                                confidence=detection.match.confidence,
                                issue_type=detection.issue_type,
                                evidence=evidence,
                                fingerprint=_security_fingerprint(
                                    analysis_id=analysis_id,
                                    file_path=detection.file_path,
                                    line_no=detection.line_no,
                                    rule_id=detection.match.rule_id,
                                    masked_preview=detection.match.masked_value,
                                ),
                            )
                        )
                        security_findings_count += 1
                    except Exception:
                        # Keep pipeline resilient if a single finding insert conflicts.
                        continue
            except Exception:
                scan_failed = True
                has_secrets = False
                diff_redacted = "[REDACTION_FAILED]"
                redaction_stats = {
                    "masked_count": 0,
                    "rules_hit": {},
                    "entropy_hits": 0,
                    "scan_scope": "added_lines",
                    "scanner_version": "t5-v1",
                    "scan_failed": True,
                }

        repo.update_security_scan_result(
            analysis_id=analysis_id,
            diff_redacted=diff_redacted,
            has_secrets=has_secrets,
            redaction_stats=redaction_stats,
            purge_raw_diff=(
                settings.PURGE_RAW_DIFF_AFTER_REDACTION
                and settings.SECRET_SCAN_ENABLED
                and not scan_failed
            ),
        )

        static_findings_count = 0
        static_stats: dict[str, Any] = {"scan_disabled": True}
        static_warnings: list[str] = []
        static_tool_runs: list[CreateToolRunInput] = []
        try:
            static_result = run_static_analysis_stage(
                parsed,
                repo_name=analysis.repo,
                commit_sha=analysis.commit_sha,
            )
            static_stats = static_result.stats
            static_warnings = static_result.warnings
            static_tool_runs = [
                CreateToolRunInput(
                    tool_run_id=uuid.uuid4().hex,
                    analysis_id=analysis_id,
                    tool_name=tool_result.tool,
                    status=tool_result.status,
                    started_at=tool_result.started_at or _utc_now_iso(),
                    finished_at=tool_result.finished_at,
                    duration_ms=tool_result.duration_ms,
                    exit_code=tool_result.exit_code,
                    findings_count=len(tool_result.findings),
                    scanned_files=tool_result.scanned_files,
                    version=tool_result.version,
                    warning=tool_result.warning,
                    command=" ".join(tool_result.command) if tool_result.command else None,
                    workspace_path=tool_result.workspace_path,
                    stdout_snippet=tool_result.stdout_snippet,
                    stderr_snippet=tool_result.stderr_snippet,
                )
                for tool_result in static_result.tool_runs
            ]
            repo.replace_tool_runs(analysis_id, static_tool_runs)

            for finding in static_result.findings:
                try:
                    repo.create_finding(
                        CreateFindingInput(
                            finding_id=hashlib.md5(
                                f"{analysis_id}:{finding.source}:{finding.rule_id}:{finding.file_path}:{finding.line_start}:{finding.message}".encode(
                                    "utf-8"
                                )
                            ).hexdigest(),
                            analysis_id=analysis_id,
                            source=finding.source,
                            file_path=finding.file_path,
                            line_start=finding.line_start,
                            line_end=finding.line_end,
                            severity=finding.severity,
                            category=finding.category,
                            message=finding.message,
                            suggestion=finding.suggestion,
                            confidence=finding.confidence,
                            issue_type=None,
                            rule_id=finding.rule_id,
                            evidence=finding.evidence,
                            fingerprint=_static_fingerprint(
                                analysis_id=analysis_id,
                                source=finding.source,
                                rule_id=finding.rule_id,
                                file_path=finding.file_path,
                                line_start=finding.line_start,
                                line_end=finding.line_end,
                                message=finding.message,
                            ),
                        )
                    )
                    static_findings_count += 1
                except Exception:
                    continue
        except Exception:
            repo.replace_tool_runs(analysis_id, [])
            static_stats = {
                "scan_failed": True,
                "tools": {},
                "findings_count": 0,
            }
            static_warnings = ["static analysis stage failed"]

        repo.update_static_analysis_result(analysis_id=analysis_id, static_stats=static_stats)

        duration_ms = int((time.perf_counter() - started_at) * 1000)
        metrics = {
            "diff_size_bytes": len(analysis.diff_raw.encode("utf-8")),
            "files_changed": files_count,
            "additions_total": additions_total,
            "deletions_total": deletions_total,
            "findings_count": security_findings_count + static_findings_count,
            "security_findings_count": security_findings_count,
            "static_findings_count": static_findings_count,
            "duration_ms": duration_ms,
        }
        if scan_disabled:
            metrics["security_scan"] = {"scan_disabled": True}
        elif scan_failed:
            metrics["security_scan"] = {"scan_failed": True}
        metrics["static_analysis"] = {
            "scan_disabled": bool(static_stats.get("scan_disabled", False)),
            "scan_failed": bool(static_stats.get("scan_failed", False)),
            "warnings": static_warnings,
        }

        repo.update_status(
            analysis_id=analysis_id,
            status="COMPLETED",
            stage="COMPLETED",
            progress=100,
            nb_files_changed=files_count,
            additions_total=additions_total,
            deletions_total=deletions_total,
            metadata_updates={"pipeline": metrics},
        )
        return {"analysis_id": analysis_id, "status": "COMPLETED", "metrics": metrics}
    except Exception:
        duration_ms = int((time.perf_counter() - started_at) * 1000)
        repo.update_status(
            analysis_id=analysis_id,
            status="FAILED",
            stage="FAILED",
            progress=100,
            error_code="PIPELINE_ERROR",
            error_message="Pipeline execution failed",
            metadata_updates={"pipeline": {"duration_ms": duration_ms, "failed": True}},
        )
        raise
