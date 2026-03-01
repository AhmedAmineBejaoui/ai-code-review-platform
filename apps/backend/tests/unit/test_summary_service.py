from __future__ import annotations

import pytest

from app.core.summarization import SummaryGenerationInput, SummaryService
from app.settings import settings


class _FakeLLM:
    def __init__(self, response: str) -> None:
        self._response = response

    async def complete_text(self, *, system_prompt: str, user_prompt: str, max_chars: int = 500) -> str:  # noqa: ARG002
        return self._response


def _payload() -> SummaryGenerationInput:
    return SummaryGenerationInput(
        repo="acme/repo",
        pr_number=42,
        change_type="feature",
        files_changed=4,
        additions_total=80,
        deletions_total=15,
        top_files=["app/api/users.py", "app/services/user_service.py"],
        top_findings=["WARN/quality: simplify nested condition"],
        diff_excerpt="diff --git a/app/api/users.py b/app/api/users.py\n+def create_user(): pass",
    )


def test_summary_falls_back_to_heuristic_when_llm_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "LLM_ENABLED", False)
    monkeypatch.setattr(settings, "OPENAI_API_KEY", None)
    service = SummaryService(llm_client=_FakeLLM('{"summary":"ignored"}'))

    result = service.generate(_payload())

    assert result.source == "heuristic"
    assert result.fallback_used is True
    assert "This PR updates" in result.summary


def test_summary_uses_llm_when_valid_json_is_returned(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "LLM_ENABLED", True)
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-key")
    service = SummaryService(llm_client=_FakeLLM('{"summary":"This PR adds a user creation endpoint and updates service validation."}'))

    result = service.generate(_payload())

    assert result.source == "llm"
    assert result.fallback_used is False
    assert "adds a user creation endpoint" in result.summary


def test_summary_repairs_json_wrapped_in_text(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "LLM_ENABLED", True)
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-key")
    service = SummaryService(
        llm_client=_FakeLLM(
            'Here is the result:\n{"summary":"This PR introduces feature flags for onboarding and updates related API handlers."}\nThank you.'
        )
    )

    result = service.generate(_payload())

    assert result.source == "llm"
    assert result.fallback_used is False
    assert "feature flags for onboarding" in result.summary


def test_summary_falls_back_when_llm_output_is_invalid(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "LLM_ENABLED", True)
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-key")
    service = SummaryService(llm_client=_FakeLLM("short"))

    result = service.generate(_payload())

    assert result.source == "heuristic"
    assert result.fallback_used is True
