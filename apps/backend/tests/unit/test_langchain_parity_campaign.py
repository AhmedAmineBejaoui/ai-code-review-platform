from __future__ import annotations

import json

from app.core.langchain_runtime.parity_campaign import LangChainParityCampaignService
from app.data.models.analysis import Analysis


class _FakeAnalysesRepo:
    def __init__(self, analyses: list[Analysis]) -> None:
        self._analyses = analyses

    def list_recent_langchain_shadow_analyses(self, *, limit: int, since_days: int | None, repo: str | None):
        _ = limit, since_days, repo
        return list(self._analyses)


def _analysis(
    *,
    analysis_id: str,
    repo: str,
    legacy_retrieval_ms: int,
    langchain_retrieval_ms: int,
    legacy_review_generation_ms: int,
    langchain_review_generation_ms: int,
    overlap: float,
    context_presence: float,
    critical_divergence: float,
) -> Analysis:
    metadata = {
        "pipeline": {
            "kb_retrieval": {
                "legacy_trace": {"duration_ms": legacy_retrieval_ms},
                "langchain_trace": {"duration_ms": langchain_retrieval_ms},
            },
            "review_intelligence": {
                "legacy_generation_ms": legacy_review_generation_ms,
            },
            "langchain_shadow": {
                "enabled": True,
                "review_status": "completed",
                "review_generation_ms": langchain_review_generation_ms,
                "divergence": {
                    "citation_overlap": overlap,
                    "summary_changed": critical_divergence > 0,
                    "risk_count_delta": 1 if critical_divergence > 0 else 0,
                    "test_count_delta": 0,
                },
                "parity": {
                    "measurements": {
                        "pydantic_validity": 1.0,
                        "context_references_presence": context_presence,
                        "citation_overlap": overlap,
                        "critical_divergence": critical_divergence,
                    }
                },
            },
        }
    }
    return Analysis(
        id=analysis_id,
        repo=repo,
        provider="github",
        pr_number=1,
        commit_sha="abc",
        source="test",
        status="COMPLETED",
        stage="COMPLETED",
        progress=100,
        nb_files_changed=1,
        additions_total=1,
        deletions_total=0,
        diff_hash=f"hash-{analysis_id}",
        diff_raw="diff",
        summary="ok",
        diff_redacted="diff",
        has_secrets=False,
        redaction_stats_json="{}",
        static_stats_json="{}",
        change_type="feature",
        change_type_confidence=0.8,
        change_type_source="heuristic",
        change_type_signals_json="{}",
        error_code=None,
        error_message=None,
        created_at="2026-03-17T00:00:00Z",
        updated_at="2026-03-17T00:00:00Z",
        metadata_json=json.dumps(metadata),
    )


def test_langchain_parity_campaign_aggregates_metrics_and_blocks_small_samples() -> None:
    service = LangChainParityCampaignService(
        analyses_repo=_FakeAnalysesRepo(
            [
                _analysis(
                    analysis_id="a1",
                    repo="owner/repo-a",
                    legacy_retrieval_ms=100,
                    langchain_retrieval_ms=120,
                    legacy_review_generation_ms=1000,
                    langchain_review_generation_ms=1200,
                    overlap=0.9,
                    context_presence=1.0,
                    critical_divergence=0.0,
                ),
                _analysis(
                    analysis_id="a2",
                    repo="owner/repo-b",
                    legacy_retrieval_ms=110,
                    langchain_retrieval_ms=140,
                    legacy_review_generation_ms=1300,
                    langchain_review_generation_ms=1500,
                    overlap=0.8,
                    context_presence=1.0,
                    critical_divergence=0.0,
                ),
            ]
        )
    )

    report = service.build_report(limit=50, since_days=7).payload

    assert report["aggregates"]["sample_size"] == 2
    assert report["aggregates"]["citation_overlap_median"] == 0.85
    assert report["latency_ms"]["langchain_retrieval_p95_ms"] == 140
    assert report["decision"]["cutover_recommended"] is False
    assert "sample_size_below_threshold" in report["decision"]["blocking_reasons"]
    assert report["native_primitives_recommendation"]["status"] == "defer"
