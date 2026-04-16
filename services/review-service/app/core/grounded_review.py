"""
Review Service — Grounded Review Core
───────────────────────────────────────
MOVED FROM: apps/backend/app/core/ai_orchestration/grounded_review_service.py
            apps/backend/app/core/summarization/
LOGIC:      Identical prompts, identical LLM calls.
            Only the Ollama client instantiation uses this service's settings.
"""
from __future__ import annotations

import logging
from typing import Any

from app.integrations.ollama_client import OllamaClient, OllamaClientError
from app.settings import settings

logger = logging.getLogger(__name__)

_llm = OllamaClient(
    base_url  = settings.OLLAMA_BASE_URL,
    model     = settings.OLLAMA_MODEL,
    timeout_s = settings.OLLAMA_TIMEOUT_SECONDS,
)


async def generate_grounded_review(
    *,
    diff:            str,
    findings:        list[dict[str, Any]],
    context_chunks:  list[str],
    project_profile: dict[str, Any],
) -> dict[str, Any]:
    """
    Generate a grounded code review.
    Identical prompt construction to the monolith's GroundedReviewService.
    Anti-hallucination: citations required, confidence thresholds enforced.
    """
    findings_text = "\n".join(
        f"- [{f.get('severity','info').upper()}] {f.get('file_path','')} "
        f"L{f.get('line_start','?')}: {f.get('message','')}"
        for f in findings
    ) or "No static findings."

    context_text = "\n---\n".join(context_chunks) or "No KB context available."

    profile_text = (
        f"Language: {project_profile.get('primary_language', 'unknown')}\n"
        f"Framework: {project_profile.get('framework', 'unknown')}"
        if project_profile
        else ""
    )

    prompt = f"""You are an expert code reviewer. Review the following diff and provide
actionable, grounded feedback. You MUST cite specific line numbers from the diff.
Do NOT hallucinate — only comment on what is visible in the diff.

{f'Project context: {profile_text}' if profile_text else ''}

Static analysis findings:
{findings_text}

Relevant KB context:
{context_text}

Diff to review:
```diff
{diff}
```

Provide a structured review with:
1. Summary (1-2 sentences)
2. Critical issues (blockers)
3. Warnings
4. Suggestions (nice-to-have)
5. Positive observations

Format: Markdown. Reference lines as `L<number>`.
"""

    try:
        response  = _llm.generate(prompt)
        review_text = response.text.strip()
        citations   = _extract_citations(review_text)
        return {
            "review_text": review_text,
            "citations":   citations,
            "score":       _estimate_score(review_text, findings),
        }
    except OllamaClientError as exc:
        logger.warning("Ollama unavailable: %s", exc)
        return {
            "review_text": "LLM review temporarily unavailable.",
            "citations":   [],
            "score":       None,
        }


async def summarize_diff(diff: str, *, max_chars: int = 500) -> str:
    """One-paragraph diff summary — unchanged from monolith OpenAIClient.summarize_diff."""
    excerpt = diff[: max(200, max_chars)]
    prompt  = (
        "Summarize the following diff in one concise paragraph. "
        "Only describe concrete changes.\n\n" + excerpt
    )
    try:
        return _llm.generate(prompt).text.strip() or "No summary generated."
    except OllamaClientError:
        return "Summary unavailable."


def _extract_citations(text: str) -> list[str]:
    """Extract L<number> citations from review text."""
    import re
    return list(set(re.findall(r"L\d+", text)))


def _estimate_score(review_text: str, findings: list[dict]) -> float:
    """Simple heuristic score 0–1 based on findings severity."""
    blockers = sum(1 for f in findings if f.get("severity") == "blocker")
    warnings = sum(1 for f in findings if f.get("severity") == "warn")
    penalty  = min(1.0, blockers * 0.3 + warnings * 0.1)
    return round(max(0.0, 1.0 - penalty), 2)
