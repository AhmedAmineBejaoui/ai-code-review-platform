from __future__ import annotations

from app.core.review_engine.diff_engine import parse_unified_diff
from app.core.static_analysis.base import StaticFinding, StaticRawFinding
from app.core.static_analysis.filtering import build_changed_lines_map, filter_findings_to_changed_lines
from app.core.static_analysis.normalizer import normalize_raw_finding
from app.core.static_analysis.ruff_analyzer import parse_ruff_output
from app.core.static_analysis.semgrep_analyzer import parse_semgrep_output


def test_parse_ruff_output_to_raw_findings() -> None:
    payload = """
    [
      {
        "code": "F401",
        "filename": "src/app.py",
        "message": "`os` imported but unused",
        "location": {"row": 4, "column": 1},
        "end_location": {"row": 4, "column": 3}
      }
    ]
    """
    findings = parse_ruff_output(payload)
    assert len(findings) == 1
    item = findings[0]
    assert item.tool == "ruff"
    assert item.rule_id == "F401"
    assert item.file_path == "src/app.py"
    assert item.line_start == 4
    assert item.line_end == 4


def test_parse_semgrep_output_to_raw_findings() -> None:
    payload = """
    {
      "results": [
        {
          "check_id": "python.lang.security.audit.eval-detected.eval-detected",
          "path": "src/main.py",
          "start": {"line": 10},
          "end": {"line": 10},
          "extra": {"severity": "ERROR", "message": "Avoid eval", "metadata": {"category": "security"}}
        }
      ]
    }
    """
    findings = parse_semgrep_output(payload)
    assert len(findings) == 1
    item = findings[0]
    assert item.tool == "semgrep"
    assert item.rule_id.startswith("python.lang.security")
    assert item.severity == "ERROR"
    assert item.line_start == 10


def test_normalizer_maps_tool_severity_and_category() -> None:
    ruff_raw = StaticRawFinding(
        tool="ruff",
        rule_id="S602",
        file_path="src/app.py",
        line_start=3,
        line_end=3,
        severity="WARN",
        message="shell=True detected",
        evidence={"tool": "ruff"},
    )
    semgrep_raw = StaticRawFinding(
        tool="semgrep",
        rule_id="rule.security.test",
        file_path="src/app.py",
        line_start=5,
        line_end=5,
        severity="ERROR",
        message="possible command injection",
        evidence={"tool": "semgrep", "metadata_category": "security"},
    )

    normalized_ruff = normalize_raw_finding(ruff_raw)
    normalized_semgrep = normalize_raw_finding(semgrep_raw)

    assert normalized_ruff.source == "STATIC_RUFF"
    assert normalized_ruff.severity == "BLOCKER"
    assert normalized_ruff.category == "security"
    assert normalized_semgrep.source == "STATIC_SEMGREP"
    assert normalized_semgrep.severity == "BLOCKER"
    assert normalized_semgrep.category == "security"


def test_filtering_keeps_only_changed_lines() -> None:
    diff = "\n".join(
        [
            "diff --git a/src/app.py b/src/app.py",
            "--- a/src/app.py",
            "+++ b/src/app.py",
            "@@ -1,2 +1,3 @@",
            " import os",
            "+print('new')",
            "+eval('1+1')",
        ]
    )
    parsed = parse_unified_diff(diff)
    changed = build_changed_lines_map(parsed)

    findings = [
        StaticFinding(
            source="STATIC_SEMGREP",
            rule_id="security.eval",
            file_path="src/app.py",
            line_start=3,
            line_end=3,
            severity="BLOCKER",
            category="security",
            message="eval detected",
            suggestion=None,
            confidence=1.0,
            evidence={"tool": "semgrep"},
        ),
        StaticFinding(
            source="STATIC_RUFF",
            rule_id="F401",
            file_path="src/app.py",
            line_start=30,
            line_end=30,
            severity="WARN",
            category="quality",
            message="unused import",
            suggestion=None,
            confidence=1.0,
            evidence={"tool": "ruff"},
        ),
    ]

    kept, filtered_out = filter_findings_to_changed_lines(findings, changed)
    assert len(kept) == 1
    assert kept[0].rule_id == "security.eval"
    assert filtered_out == 1
