"""
Notification Service — /v1/notify routes
──────────────────────────────────────────
MOVED FROM: apps/backend/app/services/notifications.py
            apps/backend/app/api/http/notifications.py
LOGIC:      Identical channel dispatch (email, Slack, Teams, WebPush).

POST /v1/notify   ← dispatch a notification to one or more channels
GET  /v1/notify/channels ← list enabled channels
"""
from __future__ import annotations

import logging

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.dispatcher import dispatch_notification
from shared.errors import ApiError
from shared.models import NotificationPayload

router = APIRouter(prefix="/v1/notify", tags=["notifications"])
logger = logging.getLogger(__name__)


@router.post("", status_code=202)
async def notify(body: NotificationPayload) -> dict:
    """
    Dispatch a notification through enabled channels.
    Fire-and-forget: always returns 202.
    Called by: Worker Service after analysis completion.
               Review Service after review generation.
               Analysis Service on webhook events.
    """
    try:
        results = await dispatch_notification(body)
        return {"status": "dispatched", "channels": results}
    except Exception as exc:
        logger.error("Notification dispatch failed: %s", exc)
        # Never fail the caller — notifications are best-effort
        return {"status": "failed", "error": str(exc)}


@router.get("/channels")
async def list_channels() -> dict:
    """Return which notification channels are enabled."""
    from app.settings import settings
    return {
        "email":    settings.EMAIL_ENABLED,
        "slack":    settings.SLACK_ENABLED,
        "teams":    settings.TEAMS_ENABLED,
        "webpush":  settings.WEB_PUSH_ENABLED,
    }
