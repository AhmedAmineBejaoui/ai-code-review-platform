import hmac
import hashlib
import asyncio
from fastapi import APIRouter, Request, HTTPException

from app.settings import settings

router = APIRouter()


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


# Idempotency: track GitHub delivery IDs to avoid double-processing
_in_memory_seen: dict[str, float] = {}
_IDEMPOTENCY_TTL = 60 * 60  # 1 hour


def _cleanup_seen() -> None:
    now = __import__("time").time()
    keys = [k for k, ts in _in_memory_seen.items() if now - ts > _IDEMPOTENCY_TTL]
    for k in keys:
        _in_memory_seen.pop(k, None)


def mark_not_seen_then_mark(delivery_id: str) -> bool:
    """Return True if delivery_id was NOT seen before and mark it as seen.
    Uses Redis if REDIS_URL configured and redis library is installed; otherwise falls back to in-memory TTL set.
    """
    if not delivery_id:
        return True

    # Try Redis if configured
    if settings.REDIS_URL:
        try:
            import redis

            r = redis.from_url(settings.REDIS_URL)
            # SET key NX EX
            key = f"github:webhook:{delivery_id}"
            was_set = r.set(key, "1", ex=_IDEMPOTENCY_TTL, nx=True)
            return bool(was_set)
        except Exception:
            # fallback to in-memory
            pass

    # in-memory fallback
    _cleanup_seen()
    if delivery_id in _in_memory_seen:
        return False
    _in_memory_seen[delivery_id] = __import__("time").time()
    return True


async def mark_not_seen_then_mark_async(delivery_id: str) -> bool:
    # Redis calls are blocking, so keep webhook handler non-blocking.
    return await asyncio.to_thread(mark_not_seen_then_mark, delivery_id)


@router.post("/webhooks/github")
async def github_webhook(request: Request):
    raw = await request.body()
    sig = request.headers.get("X-Hub-Signature-256")

    verify_github_signature(raw, sig, settings.GITHUB_WEBHOOK_SECRET)

    event = request.headers.get("X-GitHub-Event", "")
    await request.json()

    delivery = request.headers.get("X-GitHub-Delivery")

    first_time = await mark_not_seen_then_mark_async(delivery)

    if not first_time:
        # duplicate delivery — acknowledge but do not re-enqueue processing
        return {"ok": True, "event": event, "duplicate": True}

    # TODO: enqueue job (Celery) to process the event
    return {"ok": True, "event": event, "duplicate": False}
