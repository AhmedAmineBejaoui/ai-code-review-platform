"""
Review Service — /v1/review routes
─────────────────────────────────────
Exposes LLM-based review generation to the Worker Service.

POST /v1/review/generate  ← generate grounded review
POST /v1/review/score     ← score review quality
POST /v1/review/summarize ← summarize diff
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.grounded_review import generate_grounded_review, summarize_diff
from app.settings import settings
from shared.errors import ApiError

router = APIRouter(prefix="/v1/review", tags=["review"])
logger = logging.getLogger(__name__)


# ── Request / Response models ─────────────────────────────────────────────────

class GenerateReviewRequest(BaseModel):
    analysis_id:    str
    diff:           str
    findings:       list[dict[str, Any]] = Field(default_factory=list)
    context_chunks: list[str]            = Field(default_factory=list)
    project_profile: dict[str, Any]     = Field(default_factory=dict)


class GenerateReviewResponse(BaseModel):
    analysis_id: str
    review_text: str
    score:       float | None = None
    citations:   list[str]    = Field(default_factory=list)
    model:       str          = settings.OLLAMA_MODEL


class SummarizeRequest(BaseModel):
    diff:      str
    max_chars: int = 500


# ── POST /v1/review/generate ──────────────────────────────────────────────────

@router.post("/generate", response_model=GenerateReviewResponse)
async def generate_review(body: GenerateReviewRequest) -> GenerateReviewResponse:
    """
    Generate a grounded LLM review for a diff.
    LOGIC: Identical to monolith's GroundedReviewService.generate().
    Called by: Worker Service (async pipeline step ⑥).
    """
    if not settings.LLM_ENABLED:
        return GenerateReviewResponse(
            analysis_id=body.analysis_id,
            review_text="LLM review disabled on this deployment.",
        )

    try:
        result = await generate_grounded_review(
            diff=body.diff[: settings.REVIEW_MAX_DIFF_CHARS],
            findings=body.findings[: settings.LLM_REVIEW_MAX_FINDINGS],
            context_chunks=body.context_chunks[: settings.REVIEW_MAX_CONTEXT_CHUNKS],
            project_profile=body.project_profile,
        )
        return GenerateReviewResponse(
            analysis_id=body.analysis_id,
            review_text=result["review_text"],
            citations=result.get("citations", []),
            score=result.get("score"),
        )
    except Exception as exc:
        logger.error("Review generation failed for %s: %s", body.analysis_id, exc)
        raise ApiError(status_code=500, code="REVIEW_FAILED",
                       message=f"LLM review generation failed: {exc}") from exc


# ── POST /v1/review/summarize ─────────────────────────────────────────────────

@router.post("/summarize")
async def summarize(body: SummarizeRequest) -> dict:
    """Summarize a diff in plain language."""
    try:
        text = await summarize_diff(body.diff, max_chars=body.max_chars)
        return {"summary": text}
    except Exception as exc:
        logger.warning("Summarize failed: %s", exc)
        return {"summary": "Summary unavailable."}
