"""
Push notification routes.

Extracted from: apps/backend/app/api/http/notifications.py
"""

from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict

from ..config import get_settings

router = APIRouter(prefix="/api/v1/notifications", tags=["push-notifications"])


# ─── Models ────────────────────────────────────────────────────────────────────


class PushPublicKeyResponse(BaseModel):
    enabled: bool
    public_key: str | None


class PushSubscriptionKeys(BaseModel):
    model_config = ConfigDict(extra="forbid")
    p256dh: str
    auth: str


class PushSubscriptionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    endpoint: str
    keys: PushSubscriptionKeys
    expirationTime: int | None = None


class DeletePushSubscriptionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    endpoint: str


# ─── Helper Functions ──────────────────────────────────────────────────────────


def _get_user_id_from_header(x_user_id: str | None) -> str:
    """Extract and validate user ID from header."""
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="authentication_required",
        )
    return x_user_id


# ─── In-memory subscription storage (for simplicity) ───────────────────────────
# In production, this would use a database table

_push_subscriptions: dict[str, list[dict]] = {}


def _register_push_subscription(
    user_id: str,
    subscription: dict,
    user_agent: str | None = None,
) -> bool:
    """Register a push subscription for a user."""
    endpoint = subscription.get("endpoint")
    keys = subscription.get("keys") if isinstance(subscription.get("keys"), dict) else {}
    p256dh = keys.get("p256dh")
    auth_key = keys.get("auth")
    
    if not all(isinstance(v, str) and v.strip() for v in [endpoint, p256dh, auth_key]):
        return False
    
    if user_id not in _push_subscriptions:
        _push_subscriptions[user_id] = []
    
    # Remove existing subscription with same endpoint
    _push_subscriptions[user_id] = [
        sub for sub in _push_subscriptions[user_id]
        if sub.get("endpoint") != endpoint
    ]
    
    # Add new subscription
    _push_subscriptions[user_id].append({
        "endpoint": endpoint,
        "p256dh": p256dh,
        "auth": auth_key,
        "user_agent": user_agent,
    })
    
    return True


def _unregister_push_subscription(user_id: str, endpoint: str) -> bool:
    """Unregister a push subscription for a user."""
    if user_id not in _push_subscriptions:
        return False
    
    original_count = len(_push_subscriptions[user_id])
    _push_subscriptions[user_id] = [
        sub for sub in _push_subscriptions[user_id]
        if sub.get("endpoint") != endpoint
    ]
    
    return len(_push_subscriptions[user_id]) < original_count


# ─── Routes ────────────────────────────────────────────────────────────────────


@router.get("/push-public-key", response_model=PushPublicKeyResponse)
async def get_push_public_key(
    x_user_id: str | None = Header(None),
) -> PushPublicKeyResponse:
    """
    Return VAPID public key so clients can subscribe for web push.
    """
    _get_user_id_from_header(x_user_id)
    
    settings = get_settings()
    enabled = bool(settings.PUSH_NOTIFICATIONS_ENABLED and settings.VAPID_PUBLIC_KEY)
    return PushPublicKeyResponse(
        enabled=enabled,
        public_key=settings.VAPID_PUBLIC_KEY if enabled else None,
    )


@router.post("/push-subscriptions")
async def register_push_subscription(
    request: PushSubscriptionRequest,
    http_request: Request,
    x_user_id: str | None = Header(None),
):
    """
    Register or update browser push subscription for current user.
    """
    user_id = _get_user_id_from_header(x_user_id)
    
    success = _register_push_subscription(
        user_id=user_id,
        subscription=request.model_dump(),
        user_agent=http_request.headers.get("user-agent"),
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_subscription",
        )
    
    return {"success": True}


@router.delete("/push-subscriptions")
async def delete_push_subscription(
    request: DeletePushSubscriptionRequest,
    x_user_id: str | None = Header(None),
):
    """
    Delete browser push subscription for current user.
    """
    user_id = _get_user_id_from_header(x_user_id)
    
    deleted = _unregister_push_subscription(
        user_id=user_id,
        endpoint=request.endpoint,
    )
    
    return {"success": deleted}
