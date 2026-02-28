from __future__ import annotations

from app.core.review_engine.diff_engine import parse_unified_diff
from app.core.review_engine.security import redact_unified_diff_added_lines, scan_added_line_for_secrets, scan_parsed_diff_for_secrets


def test_detects_github_token_and_masks_it() -> None:
    token = "ghp_" + ("A" * 36)
    line = f"GH_TOKEN={token}"
    result = scan_added_line_for_secrets(line, min_token_len=20, entropy_threshold=3.8)

    assert result.masked_count == 1
    assert "SECRET_GITHUB_TOKEN" in result.rules_hit
    assert token not in result.redacted_content
    assert "ghp_" in result.redacted_content


def test_detects_aws_key_as_blocker() -> None:
    aws_key = "AKIA" + ("B" * 16)
    result = scan_added_line_for_secrets(f"AWS_ACCESS_KEY_ID={aws_key}", min_token_len=20, entropy_threshold=3.8)

    assert result.masked_count >= 1
    assert any(match.rule_id == "SECRET_AWS_ACCESS_KEY" and match.severity == "BLOCKER" for match in result.matches)


def test_private_key_header_gets_redacted() -> None:
    diff = "\n".join(
        [
            "diff --git a/.env b/.env",
            "--- a/.env",
            "+++ b/.env",
            "@@ -0,0 +1,2 @@",
            "+-----BEGIN PRIVATE KEY-----",
            "+abc123",
        ]
    )
    redacted = redact_unified_diff_added_lines(diff, min_token_len=20, entropy_threshold=3.8)

    assert redacted.masked_count >= 1
    assert "BEGIN PRIVATE KEY" not in redacted.diff_redacted
    assert "[REDACTED_PRIVATE_KEY]" in redacted.diff_redacted


def test_entropy_detection_warn_level() -> None:
    suspicious = "ABcdEF12GHijKL34MNopQR56STuvWX78YZ90"
    line = f"VALUE={suspicious}"
    result = scan_added_line_for_secrets(line, min_token_len=20, entropy_threshold=3.8)

    assert any(match.rule_id == "SECRET_ENTROPY" for match in result.matches)
    entropy_match = next(match for match in result.matches if match.rule_id == "SECRET_ENTROPY")
    assert entropy_match.severity == "WARN"
    assert suspicious not in result.redacted_content


def test_redaction_preserves_diff_structure() -> None:
    token = "ghp_" + ("C" * 36)
    diff = "\n".join(
        [
            "diff --git a/app.py b/app.py",
            "--- a/app.py",
            "+++ b/app.py",
            "@@ -1,2 +1,3 @@",
            " print('old')",
            "-old = 1",
            f"+GH_TOKEN='{token}'",
            "+print('ok')",
        ]
    )
    redacted = redact_unified_diff_added_lines(diff, min_token_len=20, entropy_threshold=3.8)

    assert "diff --git" in redacted.diff_redacted
    assert "@@ -1,2 +1,3 @@" in redacted.diff_redacted
    assert "\n+" in redacted.diff_redacted
    assert token not in redacted.diff_redacted


def test_scan_scope_added_lines_only() -> None:
    token = "ghp_" + ("D" * 36)
    diff = "\n".join(
        [
            "diff --git a/app.py b/app.py",
            "--- a/app.py",
            "+++ b/app.py",
            "@@ -1,2 +1,2 @@",
            f"-OLD_TOKEN='{token}'",
            "+print('safe')",
        ]
    )
    parsed = parse_unified_diff(diff)
    result = scan_parsed_diff_for_secrets(parsed, min_token_len=20, entropy_threshold=3.8, max_findings=200)

    assert result.masked_count == 0
    assert result.detections == []
