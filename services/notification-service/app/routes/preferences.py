"""
Notification preferences routes.

Extracted from: apps/backend/app/api/http/notifications.py
"""

from __future__ import annotations

import json
from copy import deepcopy
from typing import Any

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text

from ..database import get_engine

router = APIRouter(prefix="/api/v1/notifications", tags=["notification-preferences"])


# ─── Models ────────────────────────────────────────────────────────────────────


NotificationPreferenceSection = dict[str, Any] | bool | None


class NotificationPreferencesRequest(BaseModel):
    """Request model for updating notification preferences."""
    model_config = ConfigDict(extra="forbid")

    email: NotificationPreferenceSection = Field(None, description="Email notification settings")
    push: NotificationPreferenceSection = Field(None, description="Push notification settings")
    inApp: NotificationPreferenceSection = Field(None, description="In-app notification settings")
    schedule: NotificationPreferenceSection = Field(None, description="Notification schedule settings")
    slack: NotificationPreferenceSection = Field(None, description="Slack integration settings")
    teams: NotificationPreferenceSection = Field(None, description="Teams integration settings")


class NotificationPreferencesResponse(BaseModel):
    """Response model for notification preferences."""
    email: dict
    push: dict
    inApp: dict
    schedule: dict
    slack: dict | None = None
    teams: dict | None = None


# ─── Default Preferences ───────────────────────────────────────────────────────


DEFAULT_NOTIFICATION_PREFERENCES = {
    "email": {
        "enabled": True,
        "new_review_assigned": True,
        "review_completed": True,
        "comment_replies": True,
        "mention": True,
        "weekly_digest": False,
        "daily_summary": True,
        "security_alerts": True,
    },
    "push": {
        "enabled": True,
        "new_review_assigned": True,
        "review_completed": False,
        "comment_replies": True,
        "mention": True,
        "realtime_updates": True,
    },
    "inApp": {
        "enabled": True,
        "sound": False,
        "desktop": True,
        "show_preview": True,
    },
    "schedule": {
        "quiet_hours_enabled": False,
        "quiet_hours_start": "22:00",
        "quiet_hours_end": "08:00",
        "weekend_notifications": False,
    },
    "slack": None,
    "teams": None,
}

_NOTIFICATION_SECTION_KEYS: dict[str, tuple[str, ...]] = {
    "email": ("email",),
    "push": ("push",),
    "inApp": ("inApp", "in_app"),
    "schedule": ("schedule",),
    "slack": ("slack",),
    "teams": ("teams",),
}

_NOTIFICATION_BOOL_KEYS: dict[str, str] = {
    "email": "enabled",
    "push": "enabled",
    "inApp": "enabled",
    "schedule": "quiet_hours_enabled",
}


# ─── Helper Functions ──────────────────────────────────────────────────────────


def _get_user_id_from_header(x_user_id: str | None) -> str:
    """Extract and validate user ID from header."""
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="authentication_required",
        )
    return x_user_id


def _clone_default_notification_preferences() -> dict[str, Any]:
    return deepcopy(DEFAULT_NOTIFICATION_PREFERENCES)


def _normalize_notification_section(section: str, value: Any) -> dict[str, Any] | None:
    default_value = DEFAULT_NOTIFICATION_PREFERENCES.get(section)

    if isinstance(default_value, dict):
        normalized = deepcopy(default_value)
        if isinstance(value, dict):
            normalized.update(value)
        elif isinstance(value, bool):
            bool_key = _NOTIFICATION_BOOL_KEYS.get(section)
            if bool_key:
                normalized[bool_key] = value
        return normalized

    if value is None:
        return None

    if isinstance(value, dict):
        return deepcopy(value)

    if isinstance(value, bool):
        return {"enabled": value}

    return None


def _load_notification_preferences(raw_preferences: Any) -> dict[str, Any]:
    if isinstance(raw_preferences, str):
        try:
            raw_preferences = json.loads(raw_preferences)
        except json.JSONDecodeError:
            raw_preferences = {}

    if not isinstance(raw_preferences, dict):
        return _clone_default_notification_preferences()

    merged = _clone_default_notification_preferences()
    for canonical_key, aliases in _NOTIFICATION_SECTION_KEYS.items():
        raw_value = next((raw_preferences.get(alias) for alias in aliases if alias in raw_preferences), None)
        normalized_value = _normalize_notification_section(canonical_key, raw_value)
        merged[canonical_key] = normalized_value
    return merged


# ─── Routes ────────────────────────────────────────────────────────────────────


@router.get("/preferences", response_model=NotificationPreferencesResponse)
async def get_notification_preferences(
    x_user_id: str | None = Header(None),
) -> NotificationPreferencesResponse:
    """
    Get notification preferences for the current user.
    """
    user_id = _get_user_id_from_header(x_user_id)

    engine = get_engine()
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT notification_preferences FROM users WHERE id = :user_id"),
            {"user_id": user_id},
        )
        row = result.mappings().first()

    if row:
        prefs = _load_notification_preferences(row.get("notification_preferences"))
        return NotificationPreferencesResponse(**prefs)

    return NotificationPreferencesResponse(**_clone_default_notification_preferences())


@router.put("/preferences")
async def update_notification_preferences(
    request: NotificationPreferencesRequest,
    x_user_id: str | None = Header(None),
):
    """
    Update notification preferences for the current user.
    """
    user_id = _get_user_id_from_header(x_user_id)

    # Build preferences dict from request
    prefs = {}
    if request.email is not None:
        prefs["email"] = request.email
    if request.push is not None:
        prefs["push"] = request.push
    if request.inApp is not None:
        prefs["inApp"] = request.inApp
    if request.schedule is not None:
        prefs["schedule"] = request.schedule
    if request.slack is not None:
        prefs["slack"] = request.slack
    if request.teams is not None:
        prefs["teams"] = request.teams

    engine = get_engine()
    with engine.begin() as conn:
        # Get current preferences first
        result = conn.execute(
            text("SELECT notification_preferences FROM users WHERE id = :user_id"),
            {"user_id": user_id},
        )
        row = result.mappings().first()

        current_prefs = _load_notification_preferences(row.get("notification_preferences") if row else None)

        # Merge with new preferences
        for key, value in prefs.items():
            current_section = current_prefs.get(key)
            if isinstance(current_section, dict):
                merged_section = deepcopy(current_section)
                if isinstance(value, dict):
                    merged_section.update(value)
                elif isinstance(value, bool):
                    bool_key = _NOTIFICATION_BOOL_KEYS.get(key, "enabled")
                    merged_section[bool_key] = value
                current_prefs[key] = merged_section
            elif isinstance(value, dict):
                current_prefs[key] = deepcopy(value)
            elif isinstance(value, bool):
                current_prefs[key] = {"enabled": value}
            else:
                current_prefs[key] = value

        # Update in database
        conn.execute(
            text(
                """
                UPDATE users 
                SET notification_preferences = CAST(:prefs AS jsonb)
                WHERE id = :user_id
                """
            ),
            {"user_id": user_id, "prefs": json.dumps(current_prefs)},
        )

    return {"success": True, "preferences": current_prefs}


@router.patch("/preferences")
async def patch_notification_preferences(
    request: NotificationPreferencesRequest,
    x_user_id: str | None = Header(None),
):
    """
    Partial update notification preferences (alias for PUT).
    """
    return await update_notification_preferences(request, x_user_id)


@router.post("/preferences/reset")
async def reset_notification_preferences(
    x_user_id: str | None = Header(None),
):
    """
    Reset notification preferences to defaults for the current user.
    """
    user_id = _get_user_id_from_header(x_user_id)

    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                UPDATE users 
                SET notification_preferences = CAST(:prefs AS jsonb)
                WHERE id = :user_id
                """
            ),
            {
                "user_id": user_id,
                "prefs": json.dumps(_clone_default_notification_preferences()),
            },
        )

    return {"success": True, "preferences": _clone_default_notification_preferences()}
