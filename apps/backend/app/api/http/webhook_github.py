from __future__ import annotations

import asyncio
import hashlib
import hmac
import logging

from fastapi import APIRouter, HTTPException, Request

from app.core.knowledge_base.repo_path_resolver import resolve_repo_context_repo_path
from app.settings import settings
from app.workers.tasks.ingest_kb import run_repo_diff_processing, run_repo_onboarding

router = APIRouter()
logger = logging.getLogger(__name__)


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
    local_repo_path = resolve_repo_context_repo_path(repo=repo_full_name or "", metadata=None)
    if not repo_full_name or not local_repo_path:
        return {
            "ok": True,
            "event": event,
            "duplicate": False,
            "automation": "skipped",
            "reason": "missing_repo_mapping",
        }

    source = f"github_webhook:{event or 'unknown'}"
    enqueued: list[str] = []

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

    if event in {"push", "pull_request"}:
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

    if not enqueued:
        logger.info("Webhook processed with no matching automation branch (event=%s, repo=%s)", event, repo_full_name)

    return {"ok": True, "event": event, "duplicate": False, "enqueued": enqueued}


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
