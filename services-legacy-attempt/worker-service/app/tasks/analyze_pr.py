"""
Worker Service — Main Analysis Pipeline Task
─────────────────────────────────────────────
MOVED FROM:  apps/backend/app/workers/tasks/analyze_pr.py
LOGIC:       Identical pipeline steps.
CHANGED:     LLM review now calls Review Service via HTTP.
             KB context now calls RAG Service via HTTP.
             Both are async HTTP calls; fallback to None if unavailable.

Pipeline stages:
  ① Load analysis from DB
  ② Parse diff
  ③ Secret scan + redaction
  ④ Static analysis (Ruff, Semgrep, ESLint, CleanCode)
  ⑤ Change classification
  ⑥ LLM review  ← HTTP call to Review Service
  ⑦ Persist results + notify
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx

from app.celery_app import celery_app
from app.settings import settings

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# These imports are IDENTICAL to the monolith — the core logic files are copied
# into this service's src/ (or referenced via shared volume in Docker).
# ─────────────────────────────────────────────────────────────────────────────
# fmt: off
# (The following imports reference the monolith source copied under src/)
from src.core.review_engine.diff_engine    import parse_unified_diff           # noqa: E402
from src.core.review_engine.security       import (                            # noqa: E402
    redact_unified_diff_added_lines,
    scan_parsed_diff_for_secrets,
)
from src.core.static_analysis              import (                            # noqa: E402
    CleanCodeAnalyzer,
    RuffAnalyzer,
    SemgrepAnalyzer,
    StaticAnalysisService,
)
from src.core.change_classification        import ChangeClassifier             # noqa: E402
from src.data.repos.analyses_repo          import (                            # noqa: E402
    AnalysesRepo,
    CreateFindingInput,
    CreateToolRunInput,
)
# fmt: on

_repo         = AnalysesRepo()
_classifier   = ChangeClassifier()


# ─── HTTP helpers ─────────────────────────────────────────────────────────────

async def _call_review_service(analysis_id: str, diff: str, findings: list[dict]) -> str | None:
    """Call Review Service to generate LLM review. Returns review text or None."""
    if not settings.LLM_ENABLED:
        return None
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{settings.REVIEW_SERVICE_URL}/v1/review/generate",
                json={"analysis_id": analysis_id, "diff": diff, "findings": findings},
            )
            resp.raise_for_status()
            return resp.json().get("review_text")
    except Exception as exc:
        logger.warning("Review Service unavailable: %s", exc)
        return None


async def _call_rag_service(analysis_id: str, repo: str, diff: str) -> list[str]:
    """Call RAG Service to get relevant context chunks. Returns list of text chunks."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{settings.RAG_SERVICE_URL}/v1/kb/context",
                json={"query": diff[:2000], "repo_id": repo, "top_k": 10},
            )
            resp.raise_for_status()
            return [c["content"] for c in resp.json().get("chunks", [])]
    except Exception as exc:
        logger.warning("RAG Service unavailable for context: %s", exc)
        return []


async def _notify_completion(analysis_id: str, status: str, project_id: str) -> None:
    """Fire-and-forget notification to Notification Service."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{settings.NOTIFICATION_SERVICE_URL}/v1/notify",
                json={
                    "event":             "analysis.completed",
                    "recipient_user_id": "system",
                    "data": {
                        "analysis_id": analysis_id,
                        "status":      status,
                        "project_id":  project_id,
                    },
                },
            )
    except Exception as exc:
        logger.debug("Notification skipped: %s", exc)


# ─── Main Celery task ─────────────────────────────────────────────────────────

@celery_app.task(
    name="app.tasks.analyze_pr.run_minimal_analysis_pipeline",
    bind=True,
    max_retries=2,
    default_retry_delay=30,
)
def run_minimal_analysis_pipeline(self, analysis_id: str) -> dict[str, Any]:
    """
    Full analysis pipeline — IDENTICAL logic to monolith.
    Only external calls (LLM, RAG) are now HTTP to sibling services.
    """
    logger.info("Pipeline start: %s", analysis_id)

    # ① Load analysis ──────────────────────────────────────────────────────────
    analysis = _repo.get_by_id(analysis_id)
    if analysis is None:
        logger.error("Analysis %s not found", analysis_id)
        return {"status": "FAILED", "reason": "not_found"}

    def _update(stage: str, progress: int, status: str = "RUNNING") -> None:
        _repo.update_status(analysis_id, status, stage=stage, progress=progress)

    try:
        _update("diff_parsing", 5)
        raw_diff = analysis.get("diff_text") or ""

        # ② Parse diff ────────────────────────────────────────────────────────
        parsed_files = parse_unified_diff(raw_diff) if raw_diff else []
        _update("diff_parsing", 10)

        # ③ Secret scan + redaction ───────────────────────────────────────────
        _update("secret_scan", 15)
        secret_findings: list[dict] = []
        if settings.SECRET_SCAN_ENABLED and raw_diff:
            secrets_raw    = scan_parsed_diff_for_secrets(parsed_files)
            raw_diff       = redact_unified_diff_added_lines(raw_diff, secrets_raw)
            secret_findings = _build_findings(analysis_id, secrets_raw, "secret_scan")
        _update("secret_scan", 25)

        # ④ Static analysis ───────────────────────────────────────────────────
        _update("static_analysis", 30)
        static_findings: list[dict] = []
        if settings.STATIC_ANALYSIS_ENABLED and parsed_files:
            svc            = StaticAnalysisService(
                ruff_analyzer      = RuffAnalyzer()      if settings.STATIC_ANALYSIS_RUFF_ENABLED    else None,
                semgrep_analyzer   = SemgrepAnalyzer()   if settings.STATIC_ANALYSIS_SEMGREP_ENABLED else None,
                clean_code_analyzer= CleanCodeAnalyzer() if settings.CLEAN_CODE_RULE_ENGINE_ENABLED  else None,
            )
            results        = svc.analyze(parsed_files, repo=analysis.get("repo", ""))
            static_findings = _build_findings(analysis_id, results, "static_analysis")
        _update("static_analysis", 60)

        # ⑤ Change classification ─────────────────────────────────────────────
        _update("change_classification", 65)
        change_type = _classifier.classify(
            diff=raw_diff, findings=secret_findings + static_findings
        )
        _update("change_classification", 75)

        # ⑥ LLM review (via Review Service HTTP) ──────────────────────────────
        _update("llm_review", 76)
        review_text = None
        if settings.LLM_ENABLED:
            review_text = asyncio.get_event_loop().run_until_complete(
                _call_review_service(
                    analysis_id,
                    raw_diff,
                    (secret_findings + static_findings)[:20],
                )
            )
        _update("llm_review", 90)

        # ⑦ Persist results ───────────────────────────────────────────────────
        _update("persisting", 91)
        all_findings = secret_findings + static_findings
        if all_findings:
            _repo.add_findings(analysis_id, [CreateFindingInput(**f) for f in all_findings])

        meta_update = {
            "change_type":       change_type,
            "findings_count":    len(all_findings),
            "blocker_count":     sum(1 for f in all_findings if f.get("severity") == "blocker"),
            "warn_count":        sum(1 for f in all_findings if f.get("severity") == "warn"),
            "has_llm_review":    review_text is not None,
        }
        _repo.update_metadata(analysis_id, meta_update)
        _update("completed", 100, status="COMPLETED")

        # Fire-and-forget completion notification
        asyncio.get_event_loop().run_until_complete(
            _notify_completion(analysis_id, "COMPLETED", analysis.get("project_id", ""))
        )

        logger.info("Pipeline complete: %s | findings=%d", analysis_id, len(all_findings))
        return {"status": "COMPLETED", "findings_count": len(all_findings)}

    except Exception as exc:
        logger.exception("Pipeline failed: %s — %s", analysis_id, exc)
        _repo.update_status(analysis_id, "FAILED", error_message=str(exc))
        raise self.retry(exc=exc)


# ─── helpers ──────────────────────────────────────────────────────────────────

def _build_findings(analysis_id: str, raw: list[Any], source: str) -> list[dict]:
    """Convert tool output to finding dicts. Logic unchanged from monolith."""
    findings = []
    for item in raw:
        fp_payload = "|".join([
            analysis_id,
            getattr(item, "file_path", ""),
            str(getattr(item, "line_start", "") or ""),
            source,
            getattr(item, "rule_id", ""),
            getattr(item, "message", ""),
        ])
        findings.append({
            "id":          f"fi_{uuid.uuid4().hex}",
            "analysis_id": analysis_id,
            "source":      source,
            "severity":    getattr(item, "severity", "info"),
            "file_path":   getattr(item, "file_path", ""),
            "line_start":  getattr(item, "line_start", None),
            "line_end":    getattr(item, "line_end", None),
            "rule_id":     getattr(item, "rule_id", None),
            "message":     getattr(item, "message", ""),
            "fingerprint": hashlib.sha256(fp_payload.encode()).hexdigest(),
            "confidence":  getattr(item, "confidence", 1.0),
            "evidence":    getattr(item, "evidence", {}),
        })
    return findings
