from __future__ import annotations

import asyncio
import hashlib
import hmac
import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from app.core.knowledge_base.repo_path_resolver import resolve_repo_context_repo_path
from app.services.branch_sync import BranchSyncService, BranchSyncResult
from app.settings import settings
from app.workers.tasks.ingest_kb import run_repo_diff_processing, run_repo_onboarding

router = APIRouter()
logger = logging.getLogger(__name__)

# Branch sync service instance
_branch_sync_service: BranchSyncService | None = None


def get_branch_sync_service() -> BranchSyncService:
    """Get or create the branch sync service instance."""
    global _branch_sync_service
    if _branch_sync_service is None:
        _branch_sync_service = BranchSyncService()
    return _branch_sync_service


def verify_github_signature(raw_body: bytes, signature_header: str | None, secret: str | None) -> None:
    if secret is None:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    if not signature_header or not signature_header.startswith("sha256="):
        raise HTTPException(status_code=401, detail="Missing/invalid signature header")

    received_sig = signature_header.removeprefix("sha256=")
    mac = hmac.new(secret.encode("utf-8"), msg=raw_body, digestmod=hashlib.sha256)
    expected_sig = mac.hexdigest()

    if not hmac.compare_digest(expected_sig, received_sig):
        raise HTTPException(status_code=401, detail="Invalid signature")


_in_memory_seen: dict[str, float] = {}
_IDEMPOTENCY_TTL = 60 * 60


def _cleanup_seen() -> None:
    now = __import__("time").time()
    expired_keys = [key for key, ts in _in_memory_seen.items() if now - ts > _IDEMPOTENCY_TTL]
    for key in expired_keys:
        _in_memory_seen.pop(key, None)


def mark_not_seen_then_mark(delivery_id: str) -> bool:
    if not delivery_id:
        return True

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
    _in_memory_seen[delivery_id] = __import__("time").time()
    return True


async def mark_not_seen_then_mark_async(delivery_id: str) -> bool:
    return await asyncio.to_thread(mark_not_seen_then_mark, delivery_id)


@router.post("/webhooks/github")
async def github_webhook(request: Request):
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
    local_repo_path = resolve_repo_context_repo_path(repo=repo_full_name or "", metadata=None)

    source = f"github_webhook:{event or 'unknown'}"
    enqueued: list[str] = []
    branch_results: list[dict[str, Any]] = []

    # Handle branch-related events
    if event == "create":
        result = await _handle_branch_create(payload, repo_full_name, org_id)
        branch_results.append({"event": "create", "result": _sync_result_to_dict(result)})

    elif event == "delete":
        result = await _handle_branch_delete(payload, repo_full_name)
        branch_results.append({"event": "delete", "result": _sync_result_to_dict(result)})

    # Skip repo path check for branch-only events
    if event in {"create", "delete"}:
        return {
            "ok": True,
            "event": event,
            "duplicate": False,
            "branch_sync": branch_results,
        }

    if not repo_full_name or not local_repo_path:
        return {
            "ok": True,
            "event": event,
            "duplicate": False,
            "automation": "skipped",
            "reason": "missing_repo_mapping",
        }

    if event == "repository":
        action = str(payload.get("action") or "").lower()
        if action in {"created", "publicized"}:
            try:
                run_repo_onboarding.apply_async(
                    args=[repo_full_name, local_repo_path, source],
                    queue=settings.ANALYSIS_QUEUE_NAME,
                )
                enqueued.append("kb.onboard_repo")
            except Exception:
                logger.exception("Failed to enqueue kb.onboard_repo (repo=%s)", repo_full_name)

    if event == "push":
        # Sync branch metadata from push event
        result = await _handle_branch_push(payload, repo_full_name, org_id)
        branch_results.append({"event": "push", "result": _sync_result_to_dict(result)})

        # Existing diff processing
        base_ref = _extract_base_ref(payload, event)
        head_ref = _extract_head_ref(payload, event)
        diff_text = _extract_diff_text(payload)
        try:
            run_repo_diff_processing.apply_async(
                args=[repo_full_name, local_repo_path, diff_text, base_ref, head_ref, source],
                queue=settings.ANALYSIS_QUEUE_NAME,
            )
            enqueued.append("kb.process_diff")
        except Exception:
            logger.exception("Failed to enqueue kb.process_diff (repo=%s)", repo_full_name)

    if event == "pull_request":
        # Sync branches from PR event
        pr_results = await _handle_pull_request_branches(payload, repo_full_name, org_id)
        for key, result in pr_results.items():
            branch_results.append({"event": f"pull_request.{key}", "result": _sync_result_to_dict(result)})

        # Existing diff processing
        base_ref = _extract_base_ref(payload, event)
        head_ref = _extract_head_ref(payload, event)
        diff_text = _extract_diff_text(payload)
        try:
            run_repo_diff_processing.apply_async(
                args=[repo_full_name, local_repo_path, diff_text, base_ref, head_ref, source],
                queue=settings.ANALYSIS_QUEUE_NAME,
            )
            enqueued.append("kb.process_diff")
        except Exception:
            logger.exception("Failed to enqueue kb.process_diff (repo=%s)", repo_full_name)

    if not enqueued and not branch_results:
        logger.info("Webhook processed with no matching automation branch (event=%s, repo=%s)", event, repo_full_name)

    return {
        "ok": True,
        "event": event,
        "duplicate": False,
        "enqueued": enqueued,
        "branch_sync": branch_results if branch_results else None,
    }


def _extract_repo_full_name(payload: dict) -> str | None:
    repository = payload.get("repository")
    if not isinstance(repository, dict):
        return None
    full_name = repository.get("full_name")
    if not isinstance(full_name, str):
        return None
    normalized = full_name.strip().lower()
    return normalized or None


def _extract_diff_text(payload: dict) -> str:
    diff_text = payload.get("diff_text")
    if isinstance(diff_text, str) and diff_text.strip():
        return diff_text.strip()
    return ""


def _extract_base_ref(payload: dict, event: str) -> str | None:
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


def _extract_org_id(payload: dict) -> str | None:
    """Extract organization ID from webhook payload."""
    organization = payload.get("organization")
    if isinstance(organization, dict):
        org_id = organization.get("id")
        if org_id is not None:
            return str(org_id)
    return None


def _sync_result_to_dict(result: BranchSyncResult | None) -> dict[str, Any] | None:
    """Convert BranchSyncResult to dictionary for JSON response."""
    if result is None:
        return None
    return {
        "branch_id": result.branch_id,
        "action": result.action,
        "branch_name": result.branch_name,
        "success": result.success,
        "error": result.error,
    }


async def _handle_branch_create(
    payload: dict[str, Any],
    repo_full_name: str | None,
    org_id: str | None,
) -> BranchSyncResult | None:
    """Handle branch creation event from GitHub webhook."""
    if not repo_full_name:
        return None

    try:
        service = get_branch_sync_service()
        result = service.handle_create_event(payload, repo_full_name, org_id)
        logger.info(
            "Branch create event processed: repo=%s, branch=%s, action=%s",
            repo_full_name,
            result.branch_name,
            result.action,
        )
        return result
    except Exception as e:
        logger.exception("Failed to handle branch create event: %s", e)
        return BranchSyncResult(
            branch_id=None,
            action="failed",
            branch_name=payload.get("ref", "unknown"),
            success=False,
            error=str(e),
        )


async def _handle_branch_delete(
    payload: dict[str, Any],
    repo_full_name: str | None,
) -> BranchSyncResult | None:
    """Handle branch deletion event from GitHub webhook."""
    if not repo_full_name:
        return None

    try:
        service = get_branch_sync_service()
        result = service.handle_delete_event(payload, repo_full_name)
        logger.info(
            "Branch delete event processed: repo=%s, branch=%s, action=%s",
            repo_full_name,
            result.branch_name,
            result.action,
        )
        return result
    except Exception as e:
        logger.exception("Failed to handle branch delete event: %s", e)
        return BranchSyncResult(
            branch_id=None,
            action="failed",
            branch_name=payload.get("ref", "unknown"),
            success=False,
            error=str(e),
        )


async def _handle_branch_push(
    payload: dict[str, Any],
    repo_full_name: str | None,
    org_id: str | None,
) -> BranchSyncResult | None:
    """Handle push event to sync branch metadata."""
    if not repo_full_name:
        return None

    try:
        service = get_branch_sync_service()
        result = service.handle_push_event(payload, repo_full_name, org_id)
        logger.debug(
            "Branch push event processed: repo=%s, branch=%s, action=%s",
            repo_full_name,
            result.branch_name,
            result.action,
        )
        return result
    except Exception as e:
        logger.exception("Failed to handle branch push event: %s", e)
        ref = payload.get("ref", "")
        branch_name = ref.removeprefix("refs/heads/") if ref.startswith("refs/heads/") else ref
        return BranchSyncResult(
            branch_id=None,
            action="failed",
            branch_name=branch_name,
            success=False,
            error=str(e),
        )


async def _handle_pull_request_branches(
    payload: dict[str, Any],
    repo_full_name: str | None,
    org_id: str | None,
) -> dict[str, BranchSyncResult]:
    """Handle pull request event to sync source and target branches."""
    if not repo_full_name:
        return {}

    try:
        service = get_branch_sync_service()
        results = service.handle_pull_request_event(payload, repo_full_name, org_id)
        for key, result in results.items():
            logger.debug(
                "PR branch sync: repo=%s, type=%s, branch=%s, action=%s",
                repo_full_name,
                key,
                result.branch_name,
                result.action,
            )
        return results
    except Exception as e:
        logger.exception("Failed to handle PR branch event: %s", e)
        return {
            "error": BranchSyncResult(
                branch_id=None,
                action="failed",
                branch_name="unknown",
                success=False,
                error=str(e),
            )
        }
