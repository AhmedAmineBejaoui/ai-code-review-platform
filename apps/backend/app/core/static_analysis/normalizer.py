from __future__ import annotations

from app.core.static_analysis.base import StaticCategory, StaticFinding, StaticRawFinding, StaticSeverity


def _normalize_semgrep_severity(value: str) -> StaticSeverity:
    normalized = value.strip().upper()
    if normalized == "ERROR":
        return "BLOCKER"
    if normalized == "INFO":
        return "INFO"
    return "WARN"


def _normalize_ruff_severity(rule_id: str) -> StaticSeverity:
    code = rule_id.strip().upper()
    if code.startswith("S"):
        return "BLOCKER"
    if code.startswith("I"):
        return "INFO"
    return "WARN"


def _normalize_semgrep_category(raw: StaticRawFinding) -> StaticCategory:
    lowered_rule = raw.rule_id.lower()
    lowered_message = raw.message.lower()
    metadata_category = str(raw.evidence.get("metadata_category", "")).lower()
    if "security" in lowered_rule or "security" in lowered_message or "security" in metadata_category:
        return "security"
    if "perf" in lowered_rule:
        return "perf"
    return "quality"


def _normalize_ruff_category(rule_id: str) -> StaticCategory:
    code = rule_id.strip().upper()
    if code.startswith("S"):
        return "security"
    if code.startswith("PERF"):
        return "perf"
    if code.startswith("I"):
        return "style"
    if code.startswith("C90"):
        return "maintainability"
    return "quality"


def normalize_raw_finding(raw: StaticRawFinding) -> StaticFinding:
    if raw.tool == "semgrep":
        source = "STATIC_SEMGREP"
        severity = _normalize_semgrep_severity(raw.severity)
        category = _normalize_semgrep_category(raw)
    else:
        source = "STATIC_RUFF"
        severity = _normalize_ruff_severity(raw.rule_id)
        category = _normalize_ruff_category(raw.rule_id)

    return StaticFinding(
        source=source,
        rule_id=raw.rule_id,
        file_path=raw.file_path,
        line_start=raw.line_start,
        line_end=raw.line_end,
        severity=severity,
        category=category,
        message=raw.message,
        suggestion=raw.suggestion,
        confidence=1.0,
        evidence=raw.evidence,
    )
