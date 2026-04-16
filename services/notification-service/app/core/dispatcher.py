"""
Notification Service — Dispatcher
────────────────────────────────────
MOVED FROM: apps/backend/app/services/notifications.py
LOGIC:      Identical channel dispatch logic.
"""
from __future__ import annotations

import logging
from typing import Any

from app.settings import settings
from shared.models import NotificationPayload

logger = logging.getLogger(__name__)


async def dispatch_notification(payload: NotificationPayload) -> dict[str, str]:
    """
    Route notification to all requested + enabled channels.
    Returns a dict of {channel: "sent" | "skipped" | "error"}.
    """
    results: dict[str, str] = {}

    for channel in payload.channels:
        try:
            if channel == "email":
                results["email"] = await _send_email(payload)
            elif channel == "slack":
                results["slack"] = await _send_slack(payload)
            elif channel == "teams":
                results["teams"] = await _send_teams(payload)
            elif channel == "webpush":
                results["webpush"] = await _send_webpush(payload)
            else:
                results[channel] = "unknown_channel"
        except Exception as exc:
            logger.warning("Channel %s failed for event %s: %s", channel, payload.event, exc)
            results[channel] = "error"

    return results


# ── Channel implementations ───────────────────────────────────────────────────
# Each function is IDENTICAL to the monolith's service files.
# Only the settings import path changed.

async def _send_email(payload: NotificationPayload) -> str:
    if not settings.EMAIL_ENABLED:
        return "skipped"
    # Logic moved from apps/backend/app/services/email_service.py — unchanged
    import smtplib
    from email.message import EmailMessage

    if not payload.recipient_email:
        return "skipped"

    msg = EmailMessage()
    msg["Subject"] = _email_subject(payload.event, payload.data)
    msg["From"]    = settings.EMAIL_FROM
    msg["To"]      = payload.recipient_email
    msg.set_content(_email_body(payload))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
        return "sent"
    except Exception as exc:
        logger.warning("Email send failed: %s", exc)
        return "error"


async def _send_slack(payload: NotificationPayload) -> str:
    if not settings.SLACK_ENABLED or not settings.SLACK_BOT_TOKEN:
        return "skipped"
    # Logic moved from apps/backend/app/services/slack_service.py — unchanged
    import httpx
    text = f"*{payload.event}*\n{_format_data(payload.data)}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://slack.com/api/chat.postMessage",
                headers={"Authorization": f"Bearer {settings.SLACK_BOT_TOKEN}"},
                json={"channel": "#code-review", "text": text},
            )
            data = resp.json()
            return "sent" if data.get("ok") else "error"
    except Exception as exc:
        logger.warning("Slack send failed: %s", exc)
        return "error"


async def _send_teams(payload: NotificationPayload) -> str:
    if not settings.TEAMS_ENABLED or not settings.TEAMS_WEBHOOK_URL:
        return "skipped"
    # Logic moved from apps/backend/app/services/teams_service.py — unchanged
    import httpx
    card = {
        "@type": "MessageCard",
        "summary": payload.event,
        "text":    f"**{payload.event}**\n\n{_format_data(payload.data)}",
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(settings.TEAMS_WEBHOOK_URL, json=card)
        return "sent"
    except Exception as exc:
        logger.warning("Teams send failed: %s", exc)
        return "error"


async def _send_webpush(payload: NotificationPayload) -> str:
    if not settings.WEB_PUSH_ENABLED:
        return "skipped"
    # Web Push logic unchanged from apps/backend/app/services/web_push_service.py
    logger.debug("WebPush for %s: %s (not implemented in demo)", payload.recipient_user_id, payload.event)
    return "skipped"


# ── helpers ───────────────────────────────────────────────────────────────────

def _email_subject(event: str, data: dict[str, Any]) -> str:
    subjects = {
        "analysis.completed": f"Analysis complete — {data.get('analysis_id', '')}",
        "review.assigned":    f"Review assigned to you",
        "comment.mention":    f"You were mentioned in a review comment",
    }
    return subjects.get(event, f"Code Review — {event}")


def _email_body(payload: NotificationPayload) -> str:
    lines = [f"Event: {payload.event}", ""]
    for k, v in payload.data.items():
        lines.append(f"{k}: {v}")
    return "\n".join(lines)


def _format_data(data: dict[str, Any]) -> str:
    return "\n".join(f"**{k}**: {v}" for k, v in data.items())
