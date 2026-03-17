from __future__ import annotations

from dataclasses import dataclass
from statistics import median
from typing import Any

from app.data.models.analysis import Analysis
from app.data.repos.analyses_repo import AnalysesRepo
from app.settings import settings


@dataclass(frozen=True)
class LangChainParityCampaignReport:
    payload: dict[str, Any]


class LangChainParityCampaignService:
    def __init__(self, *, analyses_repo: AnalysesRepo | None = None) -> None:
        self._analyses_repo = analyses_repo or AnalysesRepo()

    def build_report(
        self,
        *,
        limit: int = 200,
        since_days: int | None = 14,
        repo: str | None = None,
    ) -> LangChainParityCampaignReport:
        analyses = self._analyses_repo.list_recent_langchain_shadow_analyses(
            limit=limit,
            since_days=since_days,
            repo=repo,
        )
        samples = [_analysis_to_sample(item) for item in analyses]
        repo_breakdown = _repo_breakdown(samples)

        pydantic_validity_values = [float(sample["pydantic_validity"]) for sample in samples]
        context_reference_presence_values = [float(sample["context_reference_presence"]) for sample in samples]
        citation_overlap_values = [float(sample["citation_overlap"]) for sample in samples]
        critical_divergence_values = [float(sample["critical_divergence"]) for sample in samples]
        legacy_retrieval_ms = [int(sample["legacy_retrieval_ms"]) for sample in samples if sample["legacy_retrieval_ms"] is not None]
        langchain_retrieval_ms = [int(sample["langchain_retrieval_ms"]) for sample in samples if sample["langchain_retrieval_ms"] is not None]
        legacy_review_generation_ms = [
            int(sample["legacy_review_generation_ms"])
            for sample in samples
            if sample["legacy_review_generation_ms"] is not None
        ]
        langchain_review_generation_ms = [
            int(sample["langchain_review_generation_ms"])
            for sample in samples
            if sample["langchain_review_generation_ms"] is not None
        ]

        thresholds = {
            "min_sample_size": settings.LANGCHAIN_PARITY_MIN_SAMPLE_SIZE,
            "pydantic_validity_min": settings.LANGCHAIN_PARITY_PYDANTIC_VALIDITY_MIN,
            "context_references_presence_min": settings.LANGCHAIN_PARITY_CONTEXT_REFERENCES_PRESENCE_MIN,
            "citation_overlap_median_min": settings.LANGCHAIN_PARITY_CITATION_OVERLAP_MIN,
            "critical_divergence_rate_max": settings.LANGCHAIN_PARITY_CRITICAL_DIVERGENCE_MAX,
            "retrieval_p95_max_ms": settings.LANGCHAIN_PARITY_RETRIEVAL_P95_MAX_MS,
            "review_generation_p95_max_ms": settings.LANGCHAIN_PARITY_REVIEW_GENERATION_P95_MAX_MS,
            "review_generation_regression_ratio_max": settings.LANGCHAIN_PARITY_GENERATION_P95_REGRESSION_RATIO_MAX,
        }

        aggregates = {
            "sample_size": len(samples),
            "repos_covered": len(repo_breakdown),
            "pydantic_validity_rate": _mean(pydantic_validity_values),
            "context_references_presence_rate": _mean(context_reference_presence_values),
            "citation_overlap_median": _median(citation_overlap_values),
            "critical_divergence_rate": _mean(critical_divergence_values),
        }
        latency = {
            "legacy_retrieval_p95_ms": _percentile(legacy_retrieval_ms, 0.95),
            "langchain_retrieval_p95_ms": _percentile(langchain_retrieval_ms, 0.95),
            "legacy_review_generation_p95_ms": _percentile(legacy_review_generation_ms, 0.95),
            "langchain_review_generation_p95_ms": _percentile(langchain_review_generation_ms, 0.95),
        }
        if latency["legacy_review_generation_p95_ms"] is not None and latency["langchain_review_generation_p95_ms"] is not None:
            denominator = max(float(latency["legacy_review_generation_p95_ms"]), 1.0)
            latency["review_generation_regression_ratio"] = round(
                float(latency["langchain_review_generation_p95_ms"]) / denominator,
                4,
            )
        else:
            latency["review_generation_regression_ratio"] = None

        decision = _build_cutover_decision(
            aggregates=aggregates,
            latency=latency,
            thresholds=thresholds,
        )
        native_primitives_recommendation = _native_primitives_recommendation(decision=decision)

        return LangChainParityCampaignReport(
            payload={
                "window": {
                    "limit": limit,
                    "since_days": since_days,
                    "repo": repo,
                },
                "thresholds": thresholds,
                "aggregates": aggregates,
                "latency_ms": latency,
                "decision": decision,
                "repo_breakdown": repo_breakdown,
                "native_primitives_recommendation": native_primitives_recommendation,
                "sample_ids": [sample["analysis_id"] for sample in samples],
            }
        )


def _analysis_to_sample(analysis: Analysis) -> dict[str, Any]:
    pipeline = _as_dict(analysis.metadata.get("pipeline"))
    shadow = _as_dict(pipeline.get("langchain_shadow"))
    kb_retrieval = _as_dict(pipeline.get("kb_retrieval"))
    parity = _as_dict(shadow.get("parity"))
    measurements = _as_dict(parity.get("measurements"))
    divergence = _as_dict(shadow.get("divergence"))
    review_intelligence = _as_dict(pipeline.get("review_intelligence"))
    sample = {
        "analysis_id": analysis.id,
        "repo": analysis.repo,
        "pydantic_validity": float(measurements.get("pydantic_validity") or 0.0),
        "context_reference_presence": float(measurements.get("context_references_presence") or 0.0),
        "citation_overlap": float(measurements.get("citation_overlap") or divergence.get("citation_overlap") or 0.0),
        "critical_divergence": float(measurements.get("critical_divergence") or 0.0),
        "legacy_retrieval_ms": _as_optional_int(_as_dict(kb_retrieval.get("legacy_trace")).get("duration_ms")),
        "langchain_retrieval_ms": _as_optional_int(_as_dict(kb_retrieval.get("langchain_trace")).get("duration_ms")),
        "legacy_review_generation_ms": _as_optional_int(review_intelligence.get("legacy_generation_ms")),
        "langchain_review_generation_ms": _as_optional_int(shadow.get("review_generation_ms")),
    }
    return sample


def _repo_breakdown(samples: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for sample in samples:
        grouped.setdefault(str(sample["repo"]), []).append(sample)

    breakdown: list[dict[str, Any]] = []
    for repo, items in sorted(grouped.items()):
        breakdown.append(
            {
                "repo": repo,
                "sample_size": len(items),
                "citation_overlap_median": _median([float(item["citation_overlap"]) for item in items]),
                "context_references_presence_rate": _mean([float(item["context_reference_presence"]) for item in items]),
                "critical_divergence_rate": _mean([float(item["critical_divergence"]) for item in items]),
            }
        )
    return breakdown


def _build_cutover_decision(
    *,
    aggregates: dict[str, Any],
    latency: dict[str, Any],
    thresholds: dict[str, Any],
) -> dict[str, Any]:
    blocking_reasons: list[str] = []
    if int(aggregates["sample_size"]) < int(thresholds["min_sample_size"]):
        blocking_reasons.append("sample_size_below_threshold")
    if float(aggregates["pydantic_validity_rate"]) < float(thresholds["pydantic_validity_min"]):
        blocking_reasons.append("pydantic_validity_rate_below_threshold")
    if float(aggregates["context_references_presence_rate"]) < float(thresholds["context_references_presence_min"]):
        blocking_reasons.append("context_references_presence_rate_below_threshold")
    if float(aggregates["citation_overlap_median"]) < float(thresholds["citation_overlap_median_min"]):
        blocking_reasons.append("citation_overlap_median_below_threshold")
    if float(aggregates["critical_divergence_rate"]) > float(thresholds["critical_divergence_rate_max"]):
        blocking_reasons.append("critical_divergence_rate_above_threshold")

    retrieval_p95 = latency.get("langchain_retrieval_p95_ms")
    if retrieval_p95 is None:
        blocking_reasons.append("langchain_retrieval_p95_unavailable")
    elif int(retrieval_p95) > int(thresholds["retrieval_p95_max_ms"]):
        blocking_reasons.append("langchain_retrieval_p95_above_threshold")

    generation_p95 = latency.get("langchain_review_generation_p95_ms")
    if generation_p95 is None:
        blocking_reasons.append("langchain_review_generation_p95_unavailable")
    elif int(generation_p95) > int(thresholds["review_generation_p95_max_ms"]):
        blocking_reasons.append("langchain_review_generation_p95_above_threshold")

    regression_ratio = latency.get("review_generation_regression_ratio")
    if regression_ratio is None:
        blocking_reasons.append("review_generation_regression_ratio_unavailable")
    elif float(regression_ratio) > float(thresholds["review_generation_regression_ratio_max"]):
        blocking_reasons.append("review_generation_regression_ratio_above_threshold")

    return {
        "cutover_recommended": not blocking_reasons,
        "blocking_reasons": blocking_reasons,
    }


def _native_primitives_recommendation(*, decision: dict[str, Any]) -> dict[str, Any]:
    if bool(decision.get("cutover_recommended")):
        return {
            "status": "evaluate_post_cutover",
            "reason": "Corpus-wide parity is acceptable. Revisit a deeper move to native LangChain/Qdrant primitives only if the wrappers become the bottleneck.",
        }
    return {
        "status": "defer",
        "reason": "Keep the repo-aware wrappers until corpus-wide parity and operational cutover are complete. A deeper native port would add migration risk without improving the current gate.",
    }


def _mean(values: list[float]) -> float:
    if not values:
        return 0.0
    return round(sum(values) / len(values), 4)


def _median(values: list[float]) -> float:
    if not values:
        return 0.0
    return round(float(median(values)), 4)


def _percentile(values: list[int], percentile: float) -> int | None:
    if not values:
        return None
    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    rank = max(0, min(len(ordered) - 1, int(round((len(ordered) - 1) * percentile))))
    return ordered[rank]


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _as_optional_int(value: Any) -> int | None:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        try:
            return int(stripped)
        except ValueError:
            return None
    return None
