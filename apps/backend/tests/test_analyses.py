"""Tests for /v1/analyze and /v1/analyses endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
import hashlib

from fastapi.testclient import TestClient

import app.workers.tasks.analyze_pr as analyze_pr_task
from app import settings as app_settings
from app.core.static_analysis.base import StaticAnalysisResult, StaticFinding, StaticToolResult
from app.data.repos.analyses_repo import AnalysesRepo, CreateAnalysisInput
from app.main import app

app_settings.settings.CELERY_TASK_ALWAYS_EAGER = True
app_settings.settings.CELERY_TASK_EAGER_PROPAGATES = True
app_settings.settings.CELERY_BROKER_URL = "memory://"
app_settings.settings.CELERY_RESULT_BACKEND = "cache+memory://"

client = TestClient(app)

VALID_DIFF = (
    "diff --git a/hello.py b/hello.py\n"
    "index 1234567..abcdef0 100644\n"
    "--- a/hello.py\n"
    "+++ b/hello.py\n"
    "@@ -1,3 +1,4 @@\n"
    " import os\n"
    "+print('hello')\n"
)


def _body(repo: str, diff_text: str = VALID_DIFF, **overrides):
    payload = {
        "source": "github_actions",
        "repo": repo,
        "pr_number": 1,
        "commit_sha": "abc123",
        "diff_text": diff_text,
        "metadata": {"actor": "test"},
    }
    payload.update(overrides)
    return payload


def _create_received_analysis_direct(repo: str) -> str:
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    diff_hash = hashlib.sha256(VALID_DIFF.encode("utf-8")).hexdigest()
    analysis_id = uuid.uuid4().hex
    AnalysesRepo().create(
        CreateAnalysisInput(
            analysis_id=analysis_id,
            repo=repo,
            provider="github",
            pr_number=1,
            commit_sha="abc123",
            source="manual",
            status="RECEIVED",
            stage="RECEIVED",
            progress=0,
            nb_files_changed=0,
            additions_total=0,
            deletions_total=0,
            created_at=now,
            updated_at=now,
            diff_hash=diff_hash + analysis_id[:4],  # keep uniqueness for tests
            diff_raw=VALID_DIFF,
            diff_redacted=None,
            error_code=None,
            error_message=None,
            metadata={"actor": "test"},
        )
    )
    return analysis_id


def test_analyze_happy_path():
    repo = f"owner/repo-{uuid.uuid4().hex[:8]}"
    resp = client.post("/v1/analyze", json=_body(repo))
    assert resp.status_code == 202
    data = resp.json()
    assert data["status"] == "QUEUED"
    assert "analysis_id" in data
    assert "task_id" in data


def test_get_analysis_happy_path():
    repo = f"owner/repo-{uuid.uuid4().hex[:8]}"
    created = client.post("/v1/analyze", json=_body(repo)).json()
    analysis_id = created["analysis_id"]

    resp = client.get(f"/v1/analyses/{analysis_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["analysis_id"] == analysis_id
    assert data["status"] == "COMPLETED"
    assert data["repo"] == repo
    assert "diff_hash" in data
    assert "diff_raw" not in data
    assert data["has_secrets"] is False
    assert data["redaction_stats"]["masked_count"] == 0
    assert data["findings"] == []
    assert data["security_findings"] == []
    assert isinstance(data["tool_runs"], list)
    assert len(data["files_changed"]) == 1
    file_entry = data["files_changed"][0]
    assert file_entry["path_new"] == "hello.py"
    assert len(file_entry["hunks"]) == 1
    first_hunk = file_entry["hunks"][0]
    assert first_hunk["new_start"] == 1
    assert any(line["line_type"] == "add" for line in first_hunk["lines"])


def test_empty_diff_rejected():
    repo = f"owner/repo-{uuid.uuid4().hex[:8]}"
    resp = client.post("/v1/analyze", json=_body(repo, diff_text="   \n  "))
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "EMPTY_DIFF"


def test_diff_too_large_rejected():
    repo = f"owner/repo-{uuid.uuid4().hex[:8]}"
    big_diff = "diff --git a/x b/x\n@@ -1 +1 @@\n" + ("+" * 3_000_000)
    resp = client.post("/v1/analyze", json=_body(repo, diff_text=big_diff))
    assert resp.status_code == 413
    assert resp.json()["error"]["code"] == "DIFF_TOO_LARGE"


def test_invalid_diff_format_rejected():
    repo = f"owner/repo-{uuid.uuid4().hex[:8]}"
    resp = client.post("/v1/analyze", json=_body(repo, diff_text="not a diff"))
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "INVALID_DIFF_FORMAT"


def test_missing_repo_rejected():
    resp = client.post("/v1/analyze", json=_body("", diff_text=VALID_DIFF))
    assert resp.status_code in (400, 422)


def test_bad_repo_format_rejected():
    resp = client.post("/v1/analyze", json=_body("noslash", diff_text=VALID_DIFF))
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "INVALID_REPO_FORMAT"


def test_duplicate_repo_diff_rejected():
    repo = f"owner/repo-{uuid.uuid4().hex[:8]}"
    first = client.post("/v1/analyze", json=_body(repo))
    assert first.status_code == 202

    second = client.post("/v1/analyze", json=_body(repo))
    assert second.status_code == 409
    data = second.json()
    assert data["error"]["code"] == "DUPLICATE_ANALYSIS"
    assert "existing_id" in data["error"]["details"]


def test_missing_refs_rejected():
    repo = f"owner/repo-{uuid.uuid4().hex[:8]}"
    resp = client.post(
        "/v1/analyze",
        json=_body(repo, pr_number=None, commit_sha=None),
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "MISSING_TARGET"


def test_list_analyses_pagination():
    repo_a = f"owner/repo-{uuid.uuid4().hex[:8]}"
    repo_b = f"owner/repo-{uuid.uuid4().hex[:8]}"
    client.post("/v1/analyze", json=_body(repo_a))
    client.post("/v1/analyze", json=_body(repo_b))

    resp = client.get("/v1/analyses?page=1&size=2")
    assert resp.status_code == 200
    data = resp.json()
    assert data["page"] == 1
    assert data["size"] == 2
    assert "total" in data
    assert "pages" in data
    assert isinstance(data["items"], list)


def test_analysis_status_lifecycle_transitions():
    repo = f"owner/repo-{uuid.uuid4().hex[:8]}"
    analysis_id = _create_received_analysis_direct(repo)

    queued = client.post(f"/v1/analyses/{analysis_id}/status", json={"status": "QUEUED"})
    assert queued.status_code == 200
    assert queued.json()["status"] == "QUEUED"

    running = client.post(f"/v1/analyses/{analysis_id}/status", json={"status": "RUNNING"})
    assert running.status_code == 200
    assert running.json()["status"] == "RUNNING"

    completed = client.post(f"/v1/analyses/{analysis_id}/status", json={"status": "COMPLETED"})
    assert completed.status_code == 200
    assert completed.json()["status"] == "COMPLETED"


def test_analysis_status_invalid_transition_rejected():
    repo = f"owner/repo-{uuid.uuid4().hex[:8]}"
    analysis_id = _create_received_analysis_direct(repo)

    resp = client.post(f"/v1/analyses/{analysis_id}/status", json={"status": "RUNNING"})
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "INVALID_STATUS_TRANSITION"


def test_create_finding_and_get_analysis():
    repo = f"owner/repo-{uuid.uuid4().hex[:8]}"
    created = client.post("/v1/analyze", json=_body(repo)).json()
    analysis_id = created["analysis_id"]

    finding_resp = client.post(
        f"/v1/analyses/{analysis_id}/findings",
        json={
            "source": "manual",
            "file_path": "src/main.py",
            "line_start": 10,
            "line_end": 12,
            "severity": "WARN",
            "category": "quality",
            "message": "Use structured logging instead of print.",
            "suggestion": "Replace print with logger.info",
            "confidence": 0.82,
        },
    )
    assert finding_resp.status_code == 201
    finding_data = finding_resp.json()
    assert finding_data["analysis_id"] == analysis_id
    assert finding_data["severity"] == "WARN"
    assert finding_data["issue_type"] is None
    assert finding_data["evidence"] == {}

    get_resp = client.get(f"/v1/analyses/{analysis_id}")
    assert get_resp.status_code == 200
    analysis_data = get_resp.json()
    assert len(analysis_data["findings"]) == 1
    assert analysis_data["findings"][0]["message"] == "Use structured logging instead of print."


def test_analyze_e2e_pipeline_status_completed():
    repo = f"owner/repo-{uuid.uuid4().hex[:8]}"
    created = client.post("/v1/analyze", json=_body(repo))
    assert created.status_code == 202
    analysis_id = created.json()["analysis_id"]

    final = client.get(f"/v1/analyses/{analysis_id}")
    assert final.status_code == 200
    data = final.json()
    assert data["status"] == "COMPLETED"
    assert data["progress"] == 100
    assert data["stage"] == "COMPLETED"
    assert data["findings"] == []
    assert data["security_findings"] == []
    assert data["has_secrets"] is False
    assert data["nb_files_changed"] == 1
    assert data["additions_total"] >= 1
    assert data["deletions_total"] >= 0


def test_secret_scan_detects_and_redacts_added_token():
    repo = f"owner/repo-{uuid.uuid4().hex[:8]}"
    token = "ghp_" + ("A" * 36)
    diff = (
        "diff --git a/app.py b/app.py\n"
        "--- a/app.py\n"
        "+++ b/app.py\n"
        "@@ -1 +1,2 @@\n"
        " print('hello')\n"
        f"+GITHUB_TOKEN='{token}'\n"
    )
    created = client.post("/v1/analyze", json=_body(repo, diff_text=diff))
    assert created.status_code == 202
    analysis_id = created.json()["analysis_id"]

    response = client.get(f"/v1/analyses/{analysis_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "COMPLETED"
    assert data["has_secrets"] is True
    assert data["redaction_stats"]["masked_count"] >= 1
    assert token not in (data["diff_redacted"] or "")
    assert len(data["security_findings"]) >= 1
    security_finding = data["security_findings"][0]
    assert security_finding["category"] == "security"
    assert security_finding["issue_type"] == "secret_exposure"
    assert security_finding["evidence"]["rule_id"] in {
        "SECRET_GITHUB_TOKEN",
        "SECRET_GENERIC_ASSIGNMENT",
        "SECRET_ENTROPY",
    }


def test_secret_scan_failure_is_graceful(monkeypatch):
    def _broken_scan(*args, **kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(analyze_pr_task, "scan_parsed_diff_for_secrets", _broken_scan)

    repo = f"owner/repo-{uuid.uuid4().hex[:8]}"
    created = client.post("/v1/analyze", json=_body(repo))
    assert created.status_code == 202
    analysis_id = created.json()["analysis_id"]

    response = client.get(f"/v1/analyses/{analysis_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "COMPLETED"
    assert data["diff_redacted"] == "[REDACTION_FAILED]"
    assert data["redaction_stats"]["scan_failed"] is True
    assert data["metadata"]["pipeline"]["security_scan"]["scan_failed"] is True


def test_static_analysis_findings_and_stats_are_exposed(monkeypatch):
    def _fake_static(parsed, *, repo_name, commit_sha):
        return StaticAnalysisResult(
            findings=[
                StaticFinding(
                    source="STATIC_SEMGREP",
                    rule_id="python.lang.security.eval",
                    file_path="hello.py",
                    line_start=2,
                    line_end=2,
                    severity="BLOCKER",
                    category="security",
                    message="Avoid eval usage.",
                    suggestion="Use safe parsing helpers instead of eval.",
                    confidence=1.0,
                    evidence={"tool": "semgrep"},
                )
            ],
            stats={
                "scanned_files": 1,
                "missing_files": [],
                "filtered_out": 0,
                "findings_count": 1,
                "tools": {
                    "semgrep": {"count": 1, "duration_ms": 15, "version": "x", "scanned_files": 1, "warning": None}
                },
            },
            warnings=[],
            tool_runs=[
                StaticToolResult(
                    tool="semgrep",
                    findings=[],
                    duration_ms=15,
                    scanned_files=1,
                    version="x",
                    status="SUCCESS",
                    started_at="2026-02-28T00:00:00Z",
                    finished_at="2026-02-28T00:00:01Z",
                    exit_code=0,
                    command=["semgrep", "scan", "--config=auto", "--json", "hello.py"],
                    workspace_path="/tmp/repo",
                    stdout_snippet='{"results": []}',
                    stderr_snippet=None,
                    warning=None,
                )
            ],
        )

    monkeypatch.setattr(analyze_pr_task, "run_static_analysis_stage", _fake_static)

    repo = f"owner/repo-{uuid.uuid4().hex[:8]}"
    created = client.post("/v1/analyze", json=_body(repo))
    assert created.status_code == 202
    analysis_id = created.json()["analysis_id"]

    response = client.get(f"/v1/analyses/{analysis_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "COMPLETED"
    assert data["static_stats"]["findings_count"] == 1
    assert len(data["static_findings"]) == 1
    assert data["static_findings"][0]["source"] == "STATIC_SEMGREP"
    assert data["static_findings"][0]["rule_id"] == "python.lang.security.eval"
    assert len(data["tool_runs"]) == 1
    assert data["tool_runs"][0]["tool_name"] == "semgrep"
    assert data["tool_runs"][0]["status"] == "SUCCESS"


def test_queue_down_marks_analysis_failed():
    old_eager = app_settings.settings.CELERY_TASK_ALWAYS_EAGER
    old_broker = app_settings.settings.CELERY_BROKER_URL
    old_backend = app_settings.settings.CELERY_RESULT_BACKEND
    old_redis = app_settings.settings.REDIS_URL

    app_settings.settings.CELERY_TASK_ALWAYS_EAGER = False
    app_settings.settings.CELERY_BROKER_URL = None
    app_settings.settings.CELERY_RESULT_BACKEND = None
    app_settings.settings.REDIS_URL = None

    try:
        repo = f"owner/repo-{uuid.uuid4().hex[:8]}"
        resp = client.post("/v1/analyze", json=_body(repo))
        assert resp.status_code == 503
        details = resp.json()["error"]["details"]
        assert "analysis_id" in details

        failed = client.get(f"/v1/analyses/{details['analysis_id']}")
        assert failed.status_code == 200
        data = failed.json()
        assert data["status"] == "FAILED"
        assert data["error_code"] == "QUEUE_DOWN"
    finally:
        app_settings.settings.CELERY_TASK_ALWAYS_EAGER = old_eager
        app_settings.settings.CELERY_BROKER_URL = old_broker
        app_settings.settings.CELERY_RESULT_BACKEND = old_backend
        app_settings.settings.REDIS_URL = old_redis
