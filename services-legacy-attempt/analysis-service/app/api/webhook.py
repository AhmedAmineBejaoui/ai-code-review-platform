"""
Analysis Service — GitHub Webhook
───────────────────────────────────
MOVED FROM: apps/backend/app/api/http/webhook_github.py
LOGIC:      Identical HMAC validation + auto-enqueue logic.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import uuid

from fastapi import APIRouter, HTTPException, Request

from app.data.analyses_repo import get_analyses_repo
from app.queue import enqueue_analysis_job, QueueUnavailableError
from app.settings import settings

router = APIRouter(prefix="/v1/webhooks", tags=["webhooks"])
logger = logging.getLogger(__name__)


def _verify_signature(raw_body: bytes, signature_header: str | None, secret: str | None) -> None:
    """HMAC-SHA256 signature verification — unchanged from monolith."""
    if secret is None:
        return  # Webhook secret not configured — skip verification
    if not signature_header or not signature_header.startswith("sha256="):
        raise HTTPException(status_code=401, detail="Missing GitHub webhook signature")
    expected = "sha256=" + hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature_header):
        raise HTTPException(status_code=401, detail="Invalid GitHub webhook signature")


@router.post("/github")
async def github_webhook(request: Request) -> dict:
    """
    Receive GitHub PR / push events.
    Validates HMAC signature, then enqueues analysis if auto-analysis is enabled.
    Returns 200 immediately; processing is fully async.
    """
    raw_body  = await request.body()
    signature = request.headers.get("X-Hub-Signature-256")
    event     = request.headers.get("X-GitHub-Event", "")

    _verify_signature(raw_body, signature, settings.GITHUB_WEBHOOK_SECRET)

    import json
    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # Only handle pull_request events for now
    if event != "pull_request":
        return {"status": "ignored", "event": event}

    action = payload.get("action", "")
    if action not in ("opened", "synchronize", "reopened"):
        return {"status": "ignored", "action": action}

    pr      = payload.get("pull_request", {})
    repo    = payload.get("repository", {}).get("full_name", "unknown")
    pr_num  = pr.get("number")
    sha     = pr.get("head", {}).get("sha")

    # Check if auto-analysis is enabled for this repo
    # (delegates to ProjectSettingsRepo — kept identical from monolith)
    from app.data.project_settings import get_auto_analysis_project_id
    project_id = get_auto_analysis_project_id(repo)
    if not project_id:
        return {"status": "ignored", "reason": "auto-analysis disabled"}

    analysis_id = f"an_{uuid.uuid4().hex}"
    repo_store  = get_analyses_repo()
    repo_store.create(
        id=analysis_id,
        repo=repo,
        project_id=project_id,
        pr_number=pr_num,
        commit_sha=sha,
        source="github_webhook",
        diff=None,
        diff_hash=None,
        metadata={"webhook_action": action},
        submitter_id="github_webhook",
    )

    try:
        enqueue_analysis_job(analysis_id)
    except QueueUnavailableError as exc:
        logger.error("Failed to enqueue webhook analysis %s: %s", analysis_id, exc)
        repo_store.update_status(analysis_id, "FAILED", error_message=str(exc))

    return {"status": "accepted", "analysis_id": analysis_id}
