from __future__ import annotations

import asyncio
import hashlib
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from app.core.ai_orchestration import GroundedReviewService
from app.core.change_classification import ChangeClassifier
from app.core.knowledge_base.ingestor import RepoContextIngestor
from app.core.knowledge_base.rag_engines import RagEngineResult, build_rag_engines
from app.core.knowledge_base.repo_path_resolver import resolve_repo_context_repo_path
from app.core.review_intelligence.engines import build_langchain_review_generation_engine
from app.core.review_intelligence.change_explainer import ChangeExplainer
from app.core.review_intelligence.pr_summary_service import PRSummaryService
from app.core.review_intelligence.risk_detector import RiskDetector
from app.core.review_intelligence.service import ReviewIntelligenceService
from app.core.review_intelligence.test_generator import TestGenerator
from app.core.review_engine.diff_engine import parse_unified_diff
from app.core.review_engine.security import redact_unified_diff_added_lines, scan_parsed_diff_for_secrets
from app.core.security.secret_store import get_secret_store
from app.core.static_analysis import CleanCodeAnalyzer, RuffAnalyzer, SemgrepAnalyzer, StaticAnalysisService
from app.core.static_analysis.base import StaticAnalysisResult
from app.core.static_analysis.workspace import prepare_workspace
from app.core.summarization import SummaryService
from app.data.repos.analyses_repo import AnalysesRepo, CreateFindingInput, CreateToolRunInput
from app.data.repos.repo_profiles_repo import RepoProfilesRepo
from app.data.repos.review_outputs_repo import ReviewOutputsRepo, UpsertReviewOutputInput
from app.integrations.llm_providers.ollama_client import OllamaClient
from app.integrations.vector_store.qdrant_client import QdrantClient
from app.settings import settings
from app.workers.celery_app import celery_app

_CHANGE_CLASSIFIER = ChangeClassifier()
_SUMMARY_SERVICE = SummaryService(
    llm_client=OllamaClient(
        base_url=settings.OLLAMA_BASE_URL,
        model=settings.OLLAMA_MODEL,
        timeout_s=settings.OLLAMA_TIMEOUT_SECONDS,
    )
)
_GROUNDED_REVIEW_SERVICE = GroundedReviewService(
    llm_client=OllamaClient(
        base_url=settings.OLLAMA_BASE_URL,
        model=settings.OLLAMA_MODEL,
        timeout_s=settings.OLLAMA_TIMEOUT_SECONDS,
    )
)
_REVIEW_INTELLIGENCE_SERVICE = ReviewIntelligenceService(
    summary_service=PRSummaryService(
        llm_client=OllamaClient(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_MODEL,
            timeout_s=settings.OLLAMA_TIMEOUT_SECONDS,
        )
    ),
    change_explainer=ChangeExplainer(
        llm_client=OllamaClient(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_MODEL,
            timeout_s=settings.OLLAMA_TIMEOUT_SECONDS,
        )
    ),
    risk_detector=RiskDetector(),
    test_generator=TestGenerator(
        llm_client=OllamaClient(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_MODEL,
            timeout_s=settings.OLLAMA_TIMEOUT_SECONDS,
        )
    ),
)


def _get_langchain_review_engine():
    if not settings.langchain_enabled:
        return None
    engine = build_langchain_review_generation_engine()
    return engine if engine.available else None


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


def _llm_fingerprint(
    analysis_id: str,
    file_path: str | None,
    line_start: int | None,
    category: str,
    message: str,
) -> str:
    payload = "|".join(
        [
            analysis_id,
            "llm_grounded_kb",
            file_path or "",
            str(line_start or ""),
            category,
            message.strip(),
        ]
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _timed_call(func, /, *args, **kwargs):
    started = time.perf_counter()
    result = func(*args, **kwargs)
    duration_ms = int((time.perf_counter() - started) * 1000)
    return result, duration_ms


def _kb_reference(item: Any) -> dict[str, Any]:
    return {
        "path": item.path,
        "title": item.title,
        "source": item.source,
        "source_type": item.source_type,
        "chunk_type": item.chunk_type,
        "symbol_name": item.symbol_name,
        "score": round(float(item.score), 4),
        "tags": list(item.tags),
    }


def _citation_overlap(
    left: list[dict[str, Any]],
    right: list[dict[str, Any]],
) -> float:
    if not left and not right:
        return 1.0
    left_keys = {
        (
            str(item.get("path") or ""),
            str(item.get("title") or ""),
        )
        for item in left
    }
    right_keys = {
        (
            str(item.get("path") or ""),
            str(item.get("title") or ""),
        )
        for item in right
    }
    if not left_keys and not right_keys:
        return 1.0
    union = left_keys.union(right_keys)
    if not union:
        return 0.0
    return round(len(left_keys.intersection(right_keys)) / len(union), 4)


def _summarize_review_divergence(
    *,
    legacy_references: list[dict[str, Any]],
    langchain_references: list[dict[str, Any]],
    legacy_summary: str | None,
    langchain_summary: str | None,
    legacy_risk_count: int | None,
    langchain_risk_count: int | None,
    legacy_test_count: int | None,
    langchain_test_count: int | None,
) -> dict[str, Any]:
    return {
        "citation_overlap": _citation_overlap(legacy_references, langchain_references),
        "summary_changed": bool((legacy_summary or "").strip() != (langchain_summary or "").strip()),
        "risk_count_delta": int((langchain_risk_count or 0) - (legacy_risk_count or 0)),
        "test_count_delta": int((langchain_test_count or 0) - (legacy_test_count or 0)),
    }


def _evaluate_langchain_parity(
    *,
    divergence: dict[str, Any],
    legacy_references: list[dict[str, Any]],
    langchain_references: list[dict[str, Any]],
    langchain_review_status: str,
) -> dict[str, Any]:
    thresholds = {
        "pydantic_validity_min": settings.LANGCHAIN_PARITY_PYDANTIC_VALIDITY_MIN,
        "context_references_presence_min": settings.LANGCHAIN_PARITY_CONTEXT_REFERENCES_PRESENCE_MIN,
        "citation_overlap_min": settings.LANGCHAIN_PARITY_CITATION_OVERLAP_MIN,
        "critical_divergence_max": settings.LANGCHAIN_PARITY_CRITICAL_DIVERGENCE_MAX,
    }
    measurements = {
        "pydantic_validity": 1.0 if langchain_review_status in {"completed", "rule_engine"} else 0.0,
        "context_references_presence": (
            1.0 if not legacy_references else 1.0 if langchain_references else 0.0
        ),
        "citation_overlap": float(divergence.get("citation_overlap") or 0.0),
        "critical_divergence": (
            1.0
            if (
                bool(divergence.get("summary_changed"))
                or int(divergence.get("risk_count_delta") or 0) != 0
                or int(divergence.get("test_count_delta") or 0) != 0
            )
            else 0.0
        ),
    }
    blocking_reasons: list[str] = []
    if measurements["pydantic_validity"] < thresholds["pydantic_validity_min"]:
        blocking_reasons.append("pydantic_validity_below_threshold")
    if measurements["context_references_presence"] < thresholds["context_references_presence_min"]:
        blocking_reasons.append("context_references_presence_below_threshold")
    if measurements["citation_overlap"] < thresholds["citation_overlap_min"]:
        blocking_reasons.append("citation_overlap_below_threshold")
    if measurements["critical_divergence"] > thresholds["critical_divergence_max"]:
        blocking_reasons.append("critical_divergence_above_threshold")

    unavailable_metrics = ["retrieval_p95_ms", "generation_p95_ms"]
    if unavailable_metrics:
        blocking_reasons.append("aggregate_latency_thresholds_require_corpus_validation")

    return {
        "thresholds": thresholds,
        "measurements": measurements,
        "unavailable_metrics": unavailable_metrics,
        "cutover_eligible": not blocking_reasons,
        "blocking_reasons": blocking_reasons,
    }


def run_static_analysis_stage(
    parsed: Any,
    *,
    repo_name: str,
    commit_sha: str | None,
    metadata: dict[str, Any],
) -> StaticAnalysisResult:
    if not settings.STATIC_ANALYSIS_ENABLED:
        return StaticAnalysisResult(findings=[], stats={"scan_disabled": True}, warnings=[], tool_runs=[])

    analyzers = []
    if settings.STATIC_ANALYSIS_RUFF_ENABLED:
        analyzers.append(RuffAnalyzer())
    if settings.STATIC_ANALYSIS_SEMGREP_ENABLED:
        analyzers.append(SemgrepAnalyzer())
    if settings.CLEAN_CODE_RULE_ENGINE_ENABLED:
        analyzers.append(CleanCodeAnalyzer())

    if not analyzers:
        return StaticAnalysisResult(
            findings=[],
            stats={"scan_disabled": True, "reason": "no_tool_enabled"},
            warnings=[],
            tool_runs=[],
        )

    service = StaticAnalysisService(analyzers=analyzers)
    git_token = get_secret_store().resolve_static_analysis_git_token()
    workspace = prepare_workspace(
        repo=repo_name,
        commit_sha=commit_sha,
        default_workspace_path=settings.STATIC_ANALYSIS_WORKSPACE_PATH,
        auto_checkout_enabled=settings.STATIC_ANALYSIS_AUTO_CHECKOUT_ENABLED,
        git_host=settings.STATIC_ANALYSIS_REPO_HOST,
        git_token=git_token,
        checkout_timeout_seconds=settings.STATIC_ANALYSIS_CHECKOUT_TIMEOUT_SECONDS,
        checkout_base_path=settings.STATIC_ANALYSIS_CHECKOUT_BASE_PATH,
        parsed=parsed,
        metadata=metadata,
    )
    try:
        result = service.run(
            parsed=parsed,
            workspace_path=workspace.path,
            timeout_seconds=settings.STATIC_ANALYSIS_TIMEOUT_SECONDS,
            max_files=settings.STATIC_ANALYSIS_MAX_FILES,
            max_findings=settings.STATIC_ANALYSIS_MAX_FINDINGS,
            filter_changed_lines=settings.STATIC_ANALYSIS_FILTER_CHANGED_LINES,
            repo=repo_name,
            metadata=metadata,
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

    # Idempotence guard: prevent re-processing completed or in-progress analyses
    current_status = analysis.status
    current_task_id = (analysis.metadata or {}).get("pipeline", {}).get("task_id")

    if current_status == "COMPLETED":
        return {
            "analysis_id": analysis_id,
            "status": "ALREADY_COMPLETED",
            "message": "Analysis already completed, skipping re-run",
        }

    if current_status == "RUNNING":
        # Allow retry if same task_id (Celery retry), block if different task
        if current_task_id and current_task_id != self.request.id:
            return {
                "analysis_id": analysis_id,
                "status": "ALREADY_RUNNING",
                "message": f"Analysis already running by task {current_task_id}",
                "running_task_id": current_task_id,
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

        kb_context_preview: str | None = None
        kb_context_references: list[dict[str, Any]] = []
        kb_context_chunks_count = 0
        kb_retrieval_mode = "not_attempted"
        kb_retrieval_error: str | None = None
        selected_kb_stack = "legacy"
        qdrant_client: QdrantClient | None = None
        legacy_kb_result: RagEngineResult | None = None
        langchain_kb_result: RagEngineResult | None = None
        try:
            qdrant_client = QdrantClient()
            legacy_rag_engine, langchain_rag_engine = build_rag_engines(vector_store=qdrant_client)
            repo_path = resolve_repo_context_repo_path(repo=analysis.repo, metadata=analysis.metadata)

            if repo_path:
                ingestor = RepoContextIngestor(vector_store=qdrant_client)
                asyncio.run(
                    ingestor.update_repo_incremental(
                        repo_id=analysis.repo,
                        repo_path=repo_path,
                        base_ref=None,
                        head_ref=analysis.commit_sha or "HEAD",
                        source="analysis_pipeline",
                    )
                )
                kb_retrieval_mode = "diff_with_incremental_update"
            else:
                kb_retrieval_mode = "diff_retrieval_only"

            legacy_kb_result = asyncio.run(
                legacy_rag_engine.retrieve_for_diff(
                    repo_id=analysis.repo,
                    diff_text=analysis.diff_raw,
                    limit=12,
                )
            )
            selected_kb_result = legacy_kb_result

            if langchain_rag_engine is not None and (
                settings.LANGCHAIN_COMPARE_OUTPUTS_ENABLED or settings.langchain_primary_stack == "langchain"
            ):
                try:
                    langchain_kb_result = asyncio.run(
                        langchain_rag_engine.retrieve_for_diff(
                            repo_id=analysis.repo,
                            diff_text=analysis.diff_raw,
                            limit=12,
                        )
                    )
                    if settings.langchain_primary_stack == "langchain" and (
                        langchain_kb_result.grounded or settings.LANGCHAIN_ALLOW_LEGACY_FALLBACK is False
                    ):
                        selected_kb_result = langchain_kb_result
                    elif settings.langchain_primary_stack == "langchain" and settings.LANGCHAIN_ALLOW_LEGACY_FALLBACK and not langchain_kb_result.grounded:
                        selected_kb_result = legacy_kb_result
                except Exception:
                    langchain_kb_result = None

            selected_kb_stack = selected_kb_result.stack
            kb_context_chunks_count = len(selected_kb_result.chunks)
            kb_context_preview = selected_kb_result.context_text
            kb_context_references = selected_kb_result.context_references
            kb_retrieval_mode = selected_kb_result.mode
            kb_profile = selected_kb_result.profile

            if kb_profile and repo_path:
                existing_profile = RepoProfilesRepo().get_profile(analysis.repo)
                enriched_profile = dict(kb_profile)
                if existing_profile and isinstance(existing_profile.profile, dict):
                    previous_overview = existing_profile.profile.get("llm_overview")
                    if isinstance(previous_overview, dict):
                        enriched_profile["llm_overview"] = previous_overview
                RepoProfilesRepo().upsert_profile(
                    repo_id=analysis.repo,
                    repo_path=repo_path,
                    indexed_commit=str(kb_profile.get("indexed_commit") or "") or None,
                    default_branch=str(kb_profile.get("default_branch") or "") or None,
                    profile=enriched_profile,
                    overview_context=kb_context_preview,
                )
        except Exception as exc:
            kb_retrieval_mode = "failed"
            kb_retrieval_error = str(exc)

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

        change_type: str | None = None
        change_type_confidence: float | None = None
        change_type_source: str | None = None
        try:
            classification = _CHANGE_CLASSIFIER.classify(
                metadata=analysis.metadata,
                parsed_diff=parsed,
            )
            repo.update_change_classification(
                analysis_id=analysis_id,
                change_type=classification.change_type,
                confidence=classification.confidence,
                source=classification.source,
                signals=classification.signals,
            )
            change_type = classification.change_type
            change_type_confidence = classification.confidence
            change_type_source = classification.source
        except Exception:
            # Change categorization must not block the rest of the review pipeline.
            pass

        sorted_files = sorted(
            parsed.files,
            key=lambda file_item: (file_item.additions_count + file_item.deletions_count),
            reverse=True,
        )
        files_changed = [file_item.path_new for file_item in sorted_files]

        static_findings_count = 0
        static_stats: dict[str, Any] = {"scan_disabled": True}
        static_warnings: list[str] = []
        static_tool_runs: list[CreateToolRunInput] = []
        try:
            static_result = run_static_analysis_stage(
                parsed,
                repo_name=analysis.repo,
                commit_sha=analysis.commit_sha,
                metadata=analysis.metadata,
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

        langchain_review_engine = _get_langchain_review_engine()
        run_langchain_shadow = bool(
            langchain_review_engine
            and (settings.LANGCHAIN_COMPARE_OUTPUTS_ENABLED or settings.langchain_primary_stack == "langchain")
        )
        serve_langchain = bool(langchain_review_engine and settings.langchain_primary_stack == "langchain")

        llm_grounded_findings_count = 0
        llm_grounded_findings_status = "skipped"
        langchain_grounded_findings_count = 0
        langchain_grounded_findings_status = "skipped"
        if settings.LLM_REVIEW_FINDINGS_ENABLED and kb_context_preview:
            try:
                grounded_output = (
                    langchain_review_engine.generate_grounded_findings(
                        repo=analysis.repo,
                        pr_number=analysis.pr_number,
                        diff_redacted=diff_redacted or "",
                        files_changed=files_changed,
                        knowledge_base_context=kb_context_preview,
                        max_findings=settings.LLM_REVIEW_MAX_FINDINGS,
                    )
                    if serve_langchain and langchain_review_engine is not None
                    else _GROUNDED_REVIEW_SERVICE.generate_findings(
                        repo=analysis.repo,
                        pr_number=analysis.pr_number,
                        diff_redacted=diff_redacted or "",
                        files_changed=files_changed,
                        knowledge_base_context=kb_context_preview,
                        max_findings=settings.LLM_REVIEW_MAX_FINDINGS,
                    )
                )

                for finding in grounded_output.findings:
                    try:
                        repo.create_finding(
                            CreateFindingInput(
                                finding_id=hashlib.md5(
                                    (
                                        f"{analysis_id}:LLM_GROUNDED_KB:{finding.file_path}:{finding.line_start}:"
                                        f"{finding.category}:{finding.message}"
                                    ).encode("utf-8")
                                ).hexdigest(),
                                analysis_id=analysis_id,
                                source="LLM_GROUNDED_KB",
                                file_path=finding.file_path,
                                line_start=finding.line_start,
                                line_end=finding.line_end,
                                severity=finding.severity,
                                category=finding.category,
                                message=finding.message,
                                suggestion=finding.suggestion,
                                confidence=finding.confidence,
                                issue_type="kb_grounded_review",
                                rule_id="KB_GROUNDED_LLM",
                                evidence={
                                    "grounded": True,
                                    "kb_refs": finding.kb_refs,
                                    "kb_context_used": True,
                                    "stack": "langchain" if serve_langchain else "legacy",
                                },
                                fingerprint=_llm_fingerprint(
                                    analysis_id=analysis_id,
                                    file_path=finding.file_path,
                                    line_start=finding.line_start,
                                    category=finding.category,
                                    message=finding.message,
                                ),
                            )
                        )
                        llm_grounded_findings_count += 1
                    except Exception:
                        continue
                llm_grounded_findings_status = "completed"
            except Exception:
                if serve_langchain and settings.LANGCHAIN_ALLOW_LEGACY_FALLBACK:
                    try:
                        grounded_output = _GROUNDED_REVIEW_SERVICE.generate_findings(
                            repo=analysis.repo,
                            pr_number=analysis.pr_number,
                            diff_redacted=diff_redacted or "",
                            files_changed=files_changed,
                            knowledge_base_context=kb_context_preview,
                            max_findings=settings.LLM_REVIEW_MAX_FINDINGS,
                        )
                        for finding in grounded_output.findings:
                            try:
                                repo.create_finding(
                                    CreateFindingInput(
                                        finding_id=hashlib.md5(
                                            (
                                                f"{analysis_id}:LLM_GROUNDED_KB:{finding.file_path}:{finding.line_start}:"
                                                f"{finding.category}:{finding.message}"
                                            ).encode("utf-8")
                                        ).hexdigest(),
                                        analysis_id=analysis_id,
                                        source="LLM_GROUNDED_KB",
                                        file_path=finding.file_path,
                                        line_start=finding.line_start,
                                        line_end=finding.line_end,
                                        severity=finding.severity,
                                        category=finding.category,
                                        message=finding.message,
                                        suggestion=finding.suggestion,
                                        confidence=finding.confidence,
                                        issue_type="kb_grounded_review",
                                        rule_id="KB_GROUNDED_LLM",
                                        evidence={
                                            "grounded": True,
                                            "kb_refs": finding.kb_refs,
                                            "kb_context_used": True,
                                            "stack": "legacy_fallback",
                                        },
                                        fingerprint=_llm_fingerprint(
                                            analysis_id=analysis_id,
                                            file_path=finding.file_path,
                                            line_start=finding.line_start,
                                            category=finding.category,
                                            message=finding.message,
                                        ),
                                    )
                                )
                                llm_grounded_findings_count += 1
                            except Exception:
                                continue
                        llm_grounded_findings_status = "completed_legacy_fallback"
                    except Exception:
                        llm_grounded_findings_status = "failed"
                else:
                    llm_grounded_findings_status = "failed"

            if run_langchain_shadow and not serve_langchain and langchain_review_engine is not None:
                try:
                    shadow_grounded = langchain_review_engine.generate_grounded_findings(
                        repo=analysis.repo,
                        pr_number=analysis.pr_number,
                        diff_redacted=diff_redacted or "",
                        files_changed=files_changed,
                        knowledge_base_context=kb_context_preview,
                        max_findings=settings.LLM_REVIEW_MAX_FINDINGS,
                    )
                    langchain_grounded_findings_count = len(shadow_grounded.findings)
                    langchain_grounded_findings_status = "completed"
                except Exception:
                    langchain_grounded_findings_status = "failed"

        summary_text = "Automatic summary unavailable."
        summary_source = "ollama"
        summary_fallback = True
        legacy_summary_text: str | None = None
        langchain_summary_text: str | None = None
        try:
            summary_output = _SUMMARY_SERVICE.generate_summary(
                repo=analysis.repo,
                pr_number=analysis.pr_number,
                change_type=change_type,
                diff_redacted=diff_redacted or "",
                files_changed=files_changed,
                retrieved_context=kb_context_preview,
            )

            legacy_summary_text = summary_output.summary
        except Exception:
            legacy_summary_text = SummaryService.fallback_summary(
                files_count=files_count,
                additions_total=additions_total,
                deletions_total=deletions_total,
                change_type=change_type,
                files_changed=files_changed,
            )

        if run_langchain_shadow and langchain_review_engine is not None:
            try:
                langchain_summary_output = langchain_review_engine.generate_summary(
                    repo=analysis.repo,
                    pr_number=analysis.pr_number,
                    change_type=change_type,
                    diff_redacted=diff_redacted or "",
                    files_changed=files_changed,
                    retrieved_context=kb_context_preview,
                )
                langchain_summary_text = langchain_summary_output.summary
            except Exception:
                langchain_summary_text = None

        if serve_langchain and langchain_summary_text:
            summary_text = langchain_summary_text
            summary_source = "langchain"
            summary_fallback = False
        elif legacy_summary_text:
            summary_text = legacy_summary_text
            summary_source = "ollama"
            summary_fallback = False
        else:
            summary_text = SummaryService.fallback_summary(
                files_count=files_count,
                additions_total=additions_total,
                deletions_total=deletions_total,
                change_type=change_type,
                files_changed=files_changed,
            )
            summary_source = "heuristic"
            summary_fallback = True

        review_output_status = "skipped"
        review_output_source: str | None = None
        review_output_reason: str | None = None
        review_merge_status: str | None = None
        review_risk_count = 0
        review_qdrant_required = settings.REVIEW_INTELLIGENCE_REQUIRE_QDRANT
        langchain_review_output_status = "skipped"
        langchain_review_reason: str | None = None
        langchain_review_risk_count = 0
        langchain_review_test_count = 0
        langchain_review_generation_ms: int | None = None
        legacy_review_risk_count = 0
        legacy_review_test_count = 0
        legacy_review_generation_ms: int | None = None
        if settings.REVIEW_INTELLIGENCE_ENABLED:
            current_findings = repo.list_findings_by_analysis(analysis_id)
            can_use_hybrid_rag, review_output_reason = _REVIEW_INTELLIGENCE_SERVICE.can_use_hybrid_rag(
                qdrant_enabled=bool(qdrant_client and qdrant_client.enabled),
                kb_retrieval_mode=kb_retrieval_mode,
                kb_context_chunks_count=kb_context_chunks_count,
                knowledge_base_context=kb_context_preview,
                kb_retrieval_error=kb_retrieval_error,
                context_references=kb_context_references,
            )
            langchain_can_use_hybrid_rag = False
            if langchain_review_engine is not None and langchain_kb_result is not None:
                langchain_can_use_hybrid_rag, langchain_review_reason = langchain_review_engine.can_use_hybrid_rag(
                    qdrant_enabled=langchain_kb_result.qdrant_enabled,
                    kb_retrieval_mode=langchain_kb_result.mode,
                    kb_context_chunks_count=len(langchain_kb_result.chunks),
                    knowledge_base_context=langchain_kb_result.context_text,
                    kb_retrieval_error=langchain_kb_result.error,
                    context_references=langchain_kb_result.context_references,
                    allow_non_qdrant_grounding=True,
                )
            try:
                langchain_review_output = None
                if run_langchain_shadow and langchain_review_engine is not None and langchain_kb_result is not None:
                    if langchain_can_use_hybrid_rag:
                        langchain_review_output, langchain_review_generation_ms = _timed_call(
                            langchain_review_engine.generate_review_output,
                            repo=analysis.repo,
                            pr_number=analysis.pr_number,
                            change_type=change_type,
                            parsed_diff=parsed,
                            diff_redacted=diff_redacted or "",
                            metadata=analysis.metadata,
                            findings=current_findings,
                            knowledge_base_context=langchain_kb_result.context_text,
                            context_references=langchain_kb_result.context_references,
                            fallback_summary=langchain_summary_text or summary_text,
                            qdrant_enabled=langchain_kb_result.qdrant_enabled,
                            kb_retrieval_mode=langchain_kb_result.mode,
                            kb_context_chunks_count=len(langchain_kb_result.chunks),
                            kb_retrieval_error=langchain_kb_result.error,
                            allow_non_qdrant_grounding=True,
                        )
                        langchain_review_output_status = "completed"
                    else:
                        langchain_review_output, langchain_review_generation_ms = _timed_call(
                            langchain_review_engine.generate_rule_engine_output,
                            repo=analysis.repo,
                            change_type=change_type,
                            parsed_diff=parsed,
                            metadata=analysis.metadata,
                            findings=current_findings,
                            fallback_summary=langchain_summary_text or summary_text,
                        )
                        langchain_review_output_status = "rule_engine"
                    langchain_review_risk_count = len(langchain_review_output.risk_findings)
                    langchain_review_test_count = len(langchain_review_output.generated_tests)

                selected_review_output = None
                if can_use_hybrid_rag:
                    legacy_review_output, legacy_review_generation_ms = _timed_call(
                        _REVIEW_INTELLIGENCE_SERVICE.generate,
                        repo=analysis.repo,
                        pr_number=analysis.pr_number,
                        change_type=change_type,
                        parsed_diff=parsed,
                        diff_redacted=diff_redacted or "",
                        metadata=analysis.metadata,
                        findings=current_findings,
                        knowledge_base_context=kb_context_preview,
                        context_references=kb_context_references,
                        fallback_summary=summary_text,
                        qdrant_enabled=bool(qdrant_client and qdrant_client.enabled),
                        kb_retrieval_mode=kb_retrieval_mode,
                        kb_context_chunks_count=kb_context_chunks_count,
                        kb_retrieval_error=kb_retrieval_error,
                    )
                    legacy_review_risk_count = len(legacy_review_output.risk_findings)
                    legacy_review_test_count = len(legacy_review_output.generated_tests)
                    selected_review_output = legacy_review_output
                    review_output_source = "hybrid_rag"
                    review_qdrant_required = settings.REVIEW_INTELLIGENCE_REQUIRE_QDRANT
                else:
                    legacy_review_output, legacy_review_generation_ms = _timed_call(
                        _REVIEW_INTELLIGENCE_SERVICE.generate_rule_engine_output,
                        repo=analysis.repo,
                        change_type=change_type,
                        parsed_diff=parsed,
                        metadata=analysis.metadata,
                        findings=current_findings,
                        fallback_summary=summary_text,
                    )
                    legacy_review_risk_count = len(legacy_review_output.risk_findings)
                    legacy_review_test_count = len(legacy_review_output.generated_tests)
                    selected_review_output = legacy_review_output
                    review_output_source = "rule_engine"
                    review_qdrant_required = False
                if serve_langchain and langchain_review_output is not None:
                    selected_review_output = langchain_review_output
                    review_output_source = "hybrid_rag" if langchain_can_use_hybrid_rag else "rule_engine"
                    review_qdrant_required = bool(langchain_kb_result and langchain_kb_result.qdrant_enabled and langchain_can_use_hybrid_rag)
                    review_output_reason = langchain_review_reason
                review_output = selected_review_output
            except Exception as exc:
                if serve_langchain and settings.LANGCHAIN_ALLOW_LEGACY_FALLBACK:
                    if can_use_hybrid_rag:
                        review_output, legacy_review_generation_ms = _timed_call(
                            _REVIEW_INTELLIGENCE_SERVICE.generate,
                            repo=analysis.repo,
                            pr_number=analysis.pr_number,
                            change_type=change_type,
                            parsed_diff=parsed,
                            diff_redacted=diff_redacted or "",
                            metadata=analysis.metadata,
                            findings=current_findings,
                            knowledge_base_context=kb_context_preview,
                            context_references=kb_context_references,
                            fallback_summary=legacy_summary_text or summary_text,
                            qdrant_enabled=bool(qdrant_client and qdrant_client.enabled),
                            kb_retrieval_mode=kb_retrieval_mode,
                            kb_context_chunks_count=kb_context_chunks_count,
                            kb_retrieval_error=kb_retrieval_error,
                        )
                        review_output_source = "hybrid_rag"
                        review_qdrant_required = settings.REVIEW_INTELLIGENCE_REQUIRE_QDRANT
                    else:
                        review_output, legacy_review_generation_ms = _timed_call(
                            _REVIEW_INTELLIGENCE_SERVICE.generate_rule_engine_output,
                            repo=analysis.repo,
                            change_type=change_type,
                            parsed_diff=parsed,
                            metadata=analysis.metadata,
                            findings=current_findings,
                            fallback_summary=legacy_summary_text or summary_text,
                        )
                        review_output_source = "rule_engine"
                        review_qdrant_required = False
                    review_output_reason = f"langchain_failed:{exc}"
                else:
                    review_output, legacy_review_generation_ms = _timed_call(
                        _REVIEW_INTELLIGENCE_SERVICE.generate_rule_engine_output,
                        repo=analysis.repo,
                        change_type=change_type,
                        parsed_diff=parsed,
                        metadata=analysis.metadata,
                        findings=current_findings,
                        fallback_summary=summary_text,
                    )
                    review_output_source = "rule_engine"
                    review_qdrant_required = False
                    review_output_reason = str(exc)

            ReviewOutputsRepo().upsert(
                UpsertReviewOutputInput(
                    analysis_id=analysis_id,
                    source=review_output_source or "rule_engine",
                    qdrant_required=review_qdrant_required,
                    payload=review_output.model_dump(mode="json"),
                )
            )
            summary_text = review_output.summary.short_summary
            summary_source = review_output_source or "rule_engine"
            summary_fallback = summary_source != "hybrid_rag"
            review_output_status = "completed"
            review_merge_status = review_output.merge_readiness.status
            review_risk_count = len(review_output.risk_findings)

        try:
            repo.update_summary_result(analysis_id=analysis_id, summary=summary_text)
        except Exception:
            pass

        duration_ms = int((time.perf_counter() - started_at) * 1000)
        metrics = {
            "diff_size_bytes": len(analysis.diff_raw.encode("utf-8")),
            "files_changed": files_count,
            "additions_total": additions_total,
            "deletions_total": deletions_total,
            "findings_count": security_findings_count + static_findings_count + llm_grounded_findings_count,
            "security_findings_count": security_findings_count,
            "static_findings_count": static_findings_count,
            "llm_grounded_findings_count": llm_grounded_findings_count,
            "duration_ms": duration_ms,
            "kb_retrieval": {
                "stack": selected_kb_stack,
                "mode": kb_retrieval_mode,
                "context_chunks": kb_context_chunks_count,
                "context_preview": kb_context_preview,
                "used_in_summary": bool(kb_context_preview),
                "references": kb_context_references,
                "legacy_trace": legacy_kb_result.trace if legacy_kb_result else None,
                "legacy_confidence_score": legacy_kb_result.rag_confidence_score if legacy_kb_result else 0.0,
            },
        }
        if langchain_kb_result is not None:
            metrics["kb_retrieval"]["langchain_trace"] = langchain_kb_result.trace
            metrics["kb_retrieval"]["langchain_confidence_score"] = langchain_kb_result.rag_confidence_score
        if scan_disabled:
            metrics["security_scan"] = {"scan_disabled": True}
        elif scan_failed:
            metrics["security_scan"] = {"scan_failed": True}
        metrics["static_analysis"] = {
            "scan_disabled": bool(static_stats.get("scan_disabled", False)),
            "scan_failed": bool(static_stats.get("scan_failed", False)),
            "warnings": static_warnings,
        }
        if change_type is not None and change_type_confidence is not None and change_type_source is not None:
            metrics["change_classification"] = {
                "change_type": change_type,
                "confidence": change_type_confidence,
                "source": change_type_source,
            }
        metrics["summary"] = {
            "source": summary_source,
            "fallback_used": summary_fallback,
            "model": (
                settings.LANGCHAIN_OLLAMA_CHAT_MODEL_PRIMARY
                if summary_source == "langchain"
                else settings.OLLAMA_MODEL if summary_source == "ollama" else None
            ),
            "preview": summary_text[:180],
            "legacy_preview": (legacy_summary_text or "")[:180],
            "langchain_preview": (langchain_summary_text or "")[:180],
        }
        metrics["review_intelligence"] = {
            "enabled": settings.REVIEW_INTELLIGENCE_ENABLED,
            "qdrant_required": review_qdrant_required,
            "status": review_output_status,
            "source": review_output_source,
            "fallback_reason": review_output_reason,
            "merge_status": review_merge_status,
            "risk_findings_count": review_risk_count,
            "legacy_generation_ms": legacy_review_generation_ms,
        }
        metrics["llm_grounded_review"] = {
            "enabled": settings.LLM_REVIEW_FINDINGS_ENABLED,
            "status": llm_grounded_findings_status,
            "findings_count": llm_grounded_findings_count,
            "model": (
                settings.LANGCHAIN_OLLAMA_CHAT_MODEL_PRIMARY
                if serve_langchain and settings.LLM_REVIEW_FINDINGS_ENABLED
                else settings.OLLAMA_MODEL if settings.LLM_REVIEW_FINDINGS_ENABLED else None
            ),
        }
        if run_langchain_shadow:
            divergence = _summarize_review_divergence(
                legacy_references=legacy_kb_result.context_references if legacy_kb_result else [],
                langchain_references=langchain_kb_result.context_references if langchain_kb_result else [],
                legacy_summary=legacy_summary_text,
                langchain_summary=langchain_summary_text,
                legacy_risk_count=legacy_review_risk_count,
                langchain_risk_count=langchain_review_risk_count,
                legacy_test_count=legacy_review_test_count,
                langchain_test_count=langchain_review_test_count,
            )
            metrics["langchain_shadow"] = {
                "enabled": True,
                "review_model": settings.LANGCHAIN_OLLAMA_CHAT_MODEL_PRIMARY,
                "grounded_findings_status": langchain_grounded_findings_status,
                "grounded_findings_count": langchain_grounded_findings_count,
                "review_status": langchain_review_output_status,
                "review_reason": langchain_review_reason,
                "review_generation_ms": langchain_review_generation_ms,
                "divergence": divergence,
                "parity": _evaluate_langchain_parity(
                    divergence=divergence,
                    legacy_references=legacy_kb_result.context_references if legacy_kb_result else [],
                    langchain_references=langchain_kb_result.context_references if langchain_kb_result else [],
                    langchain_review_status=langchain_review_output_status,
                ),
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
