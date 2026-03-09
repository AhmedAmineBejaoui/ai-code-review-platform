from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.core.summarization import RepoOverviewOutput, SummaryOutput, SummaryService


class _FakeLLM:
    def __init__(self, responses: list[str]) -> None:
        self._responses = responses
        self._index = 0

    def generate(self, prompt: str):  # noqa: ANN001
        _ = prompt
        response = self._responses[min(self._index, len(self._responses) - 1)]
        self._index += 1

        class _Resp:
            def __init__(self, text: str) -> None:
                self.text = text

        return _Resp(response)


def test_extract_json() -> None:
    service = SummaryService(llm_client=_FakeLLM(['{"summary":"ok summary long enough"}']))
    text = 'hello {"summary":"ok"} bye'
    assert service._extract_json(text) == '{"summary":"ok"}'


def test_summary_schema() -> None:
    parsed = SummaryOutput(summary="This summary is long enough to be valid.")
    assert parsed.summary.startswith("This summary")


def test_summary_schema_rejects_too_short() -> None:
    with pytest.raises(ValidationError):
        SummaryOutput(summary="short")


def test_generate_summary_with_repair() -> None:
    service = SummaryService(
        llm_client=_FakeLLM(
            [
                "not-json",
                '{"summary":"This PR improves auth validation and updates endpoint guards to reduce runtime failures."}',
            ]
        )
    )

    out = service.generate_summary(
        repo="acme/repo",
        pr_number=5,
        change_type="bugfix",
        diff_redacted="diff --git a/x b/x\n+fix stuff",
        files_changed=["app/auth.py"],
    )
    assert "improves auth validation" in out.summary


def test_repo_overview_schema() -> None:
    parsed = RepoOverviewOutput(
        summary="This repository contains a FastAPI backend and a Next.js dashboard with role-aware workflows.",
        highlights=["FastAPI backend", "Next.js dashboard"],
    )
    assert parsed.highlights[0] == "FastAPI backend"


def test_generate_repo_overview_with_repair() -> None:
    service = SummaryService(
        llm_client=_FakeLLM(
            [
                "invalid output",
                (
                    '{"summary":"This repository orchestrates diff analysis with security scanning, '
                    'static checks, and role-based dashboards.",'
                    '"highlights":["Diff parsing and findings persistence","Role-based dashboard surfaces"]}'
                ),
            ]
        )
    )

    out = service.generate_repo_overview(
        repo_id="acme/repo",
        repo_profile={"languages": {"python": 24}},
        context_excerpt="[FILE: README.md]\nArchitecture overview",
    )
    assert "diff analysis" in out.summary.lower()
    assert len(out.highlights) == 2


def test_fallback_repo_overview() -> None:
    out = SummaryService.fallback_repo_overview(
        repo_id="acme/repo",
        repo_profile={
            "top_directories": ["apps", "libs"],
            "key_files": ["README.md", "pyproject.toml"],
            "languages": {"python": 10},
        },
    )
    assert "acme/repo" in out.summary
    assert out.highlights
