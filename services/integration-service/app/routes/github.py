"""
GitHub webhook routes for Integration Service.

Handles GitHub webhooks for:
- Repository events (created, publicized)
- Push events
- Pull request events
- Branch create/delete events
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import logging
import time
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from ..config import get_settings

router = APIRouter(tags=["github"])
logger = logging.getLogger(__name__)

# In-memory idempotency tracking
_in_memory_seen: dict[str, float] = {}
_IDEMPOTENCY_TTL = 60 * 60


def verify_github_signature(raw_body: bytes, signature_header: str | None, secret: str | None) -> None:
    """Verify GitHub webhook signature."""
    if secret is None:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    if not signature_header or not signature_header.startswith("sha256="):
        raise HTTPException(status_code=401, detail="Missing/invalid signature header")

    received_sig = signature_header.removeprefix("sha256=")
    mac = hmac.new(secret.encode("utf-8"), msg=raw_body, digestmod=hashlib.sha256)
    expected_sig = mac.hexdigest()

    if not hmac.compare_digest(expected_sig, received_sig):
        raise HTTPException(status_code=401, detail="Invalid signature")


def _cleanup_seen() -> None:
    """Clean up expired idempotency keys."""
    now = time.time()
    expired_keys = [key for key, ts in _in_memory_seen.items() if now - ts > _IDEMPOTENCY_TTL]
    for key in expired_keys:
        _in_memory_seen.pop(key, None)


def mark_not_seen_then_mark(delivery_id: str) -> bool:
    """Check if delivery ID has been seen, and mark it as seen."""
    if not delivery_id:
        return True

    settings = get_settings()
    if settings.REDIS_URL:
        try:
            import redis
            redis_client = redis.from_url(settings.REDIS_URL)
            key = f"github:webhook:{delivery_id}"
            was_set = redis_client.set(key, "1", ex=_IDEMPOTENCY_TTL, nx=True)
            return bool(was_set)
        except Exception:
            pass

    _cleanup_seen()
    if delivery_id in _in_memory_seen:
        return False
    _in_memory_seen[delivery_id] = time.time()
    return True


async def mark_not_seen_then_mark_async(delivery_id: str) -> bool:
    """Async version of mark_not_seen_then_mark."""
    return await asyncio.to_thread(mark_not_seen_then_mark, delivery_id)


def _extract_repo_full_name(payload: dict) -> str | None:
    """Extract repository full name from payload."""
    repository = payload.get("repository")
    if not isinstance(repository, dict):
        return None
    full_name = repository.get("full_name")
    if not isinstance(full_name, str):
        return None
    normalized = full_name.strip().lower()
    return normalized or None


def _extract_org_id(payload: dict) -> str | None:
    """Extract organization ID from webhook payload."""
    organization = payload.get("organization")
    if isinstance(organization, dict):
        org_id = organization.get("id")
        if org_id is not None:
            return str(org_id)
    return None


def _extract_diff_text(payload: dict) -> str:
    """Extract diff text from payload."""
    diff_text = payload.get("diff_text")
    if isinstance(diff_text, str) and diff_text.strip():
        return diff_text.strip()
    return ""


def _extract_base_ref(payload: dict, event: str) -> str | None:
    """Extract base ref from payload."""
    if event == "push":
        before = payload.get("before")
        if isinstance(before, str) and before.strip():
            return before.strip()

    if event == "pull_request":
        pull_request = payload.get("pull_request")
        if isinstance(pull_request, dict):
            base = pull_request.get("base")
            if isinstance(base, dict):
                sha = base.get("sha")
                if isinstance(sha, str) and sha.strip():
                    return sha.strip()
    return None


def _extract_head_ref(payload: dict, event: str) -> str:
    """Extract head ref from payload."""
    if event == "push":
        after = payload.get("after")
        if isinstance(after, str) and after.strip():
            return after.strip()

    if event == "pull_request":
        pull_request = payload.get("pull_request")
        if isinstance(pull_request, dict):
            head = pull_request.get("head")
            if isinstance(head, dict):
                sha = head.get("sha")
                if isinstance(sha, str) and sha.strip():
                    return sha.strip()
    return "HEAD"


@router.post("/webhooks/github")
async def github_webhook(request: Request):
    """
    Handle GitHub webhook events.
    
    Processes:
    - repository: created, publicized (triggers KB onboarding)
    - push: triggers diff processing
    - pull_request: triggers diff processing
    - create/delete: branch sync
    """
    settings = get_settings()
    raw = await request.body()
    signature = request.headers.get("X-Hub-Signature-256")
    verify_github_signature(raw, signature, settings.GITHUB_WEBHOOK_SECRET)

    event = request.headers.get("X-GitHub-Event", "")
    payload = await request.json()
    delivery = request.headers.get("X-GitHub-Delivery")

    first_time = await mark_not_seen_then_mark_async(delivery)
    if not first_time:
        return {"ok": True, "event": event, "duplicate": True}

    repo_full_name = _extract_repo_full_name(payload)
    org_id = _extract_org_id(payload)
    
    source = f"github_webhook:{event or 'unknown'}"
    enqueued: list[str] = []
    branch_results: list[dict[str, Any]] = []

    # Handle branch-related events
    if event == "create":
        ref_type = payload.get("ref_type")
        if ref_type == "branch":
            branch_name = payload.get("ref", "unknown")
            logger.info(f"Branch created: {branch_name} in {repo_full_name}")
            branch_results.append({
                "event": "create",
                "result": {"branch_name": branch_name, "action": "created", "success": True}
            })

    elif event == "delete":
        ref_type = payload.get("ref_type")
        if ref_type == "branch":
            branch_name = payload.get("ref", "unknown")
            logger.info(f"Branch deleted: {branch_name} in {repo_full_name}")
            branch_results.append({
                "event": "delete",
                "result": {"branch_name": branch_name, "action": "deleted", "success": True}
            })

    # Skip repo path check for branch-only events
    if event in {"create", "delete"}:
        return {
            "ok": True,
            "event": event,
            "duplicate": False,
            "branch_sync": branch_results,
        }

    if not repo_full_name:
        return {
            "ok": True,
            "event": event,
            "duplicate": False,
            "automation": "skipped",
            "reason": "missing_repo_mapping",
        }

    # Handle repository events
    if event == "repository":
        action = str(payload.get("action") or "").lower()
        if action in {"created", "publicized"}:
            logger.info(f"Repository {action}: {repo_full_name}")
            # In full implementation, would enqueue kb.onboard_repo task
            enqueued.append("kb.onboard_repo")

    # Handle push events
    if event == "push":
        ref = payload.get("ref", "")
        branch_name = ref.removeprefix("refs/heads/") if ref.startswith("refs/heads/") else ref
        logger.info(f"Push to {branch_name} in {repo_full_name}")
        
        base_ref = _extract_base_ref(payload, event)
        head_ref = _extract_head_ref(payload, event)
        diff_text = _extract_diff_text(payload)
        
        # In full implementation, would enqueue kb.process_diff task
        enqueued.append("kb.process_diff")
        branch_results.append({
            "event": "push",
            "result": {"branch_name": branch_name, "action": "updated", "success": True}
        })

    # Handle pull request events
    if event == "pull_request":
        action = str(payload.get("action") or "").lower()
        pr = payload.get("pull_request", {})
        pr_number = pr.get("number")
        
        logger.info(f"PR #{pr_number} {action} in {repo_full_name}")
        
        base_ref = _extract_base_ref(payload, event)
        head_ref = _extract_head_ref(payload, event)
        diff_text = _extract_diff_text(payload)
        
        # In full implementation, would enqueue kb.process_diff task
        enqueued.append("kb.process_diff")
        
        # Track source and target branches
        base_branch = pr.get("base", {}).get("ref", "unknown")
        head_branch = pr.get("head", {}).get("ref", "unknown")
        branch_results.append({
            "event": f"pull_request.base",
            "result": {"branch_name": base_branch, "action": "synced", "success": True}
        })
        branch_results.append({
            "event": f"pull_request.head",
            "result": {"branch_name": head_branch, "action": "synced", "success": True}
        })

    if not enqueued and not branch_results:
        logger.info(f"Webhook processed with no matching automation branch (event={event}, repo={repo_full_name})")

    return {
        "ok": True,
        "event": event,
        "duplicate": False,
        "enqueued": enqueued,
        "branch_sync": branch_results if branch_results else None,
    }
