from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field

from app.api.middleware.auth import AuthenticatedPrincipal, get_current_principal
from app.services.notifications import NotificationService

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


class NotificationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    user_id: str
    type: str
    title: str
    message: str
    data: dict
    read: bool
    created_at: str
    read_at: str | None


class NotificationsListResponse(BaseModel):
    notifications: List[NotificationResponse]
    total: int


class UnreadCountResponse(BaseModel):
    count: int


class MarkReadRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    notification_ids: List[str] | None = None


class MarkReadResponse(BaseModel):
    success: bool
    updated_count: int


@router.get("", response_model=NotificationsListResponse)
async def get_notifications(
    unread_only: bool = Query(False, description="Filter to unread notifications only"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of notifications to return"),
    offset: int = Query(0, ge=0, description="Number of notifications to skip"),
    principal: AuthenticatedPrincipal | None = Depends(get_current_principal),
) -> NotificationsListResponse:
    """
    Get notifications for the current user.

    Returns a list of notifications ordered by creation date (most recent first).
    """
    if principal is None or not getattr(principal, "user_id", None):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="authentication_required",
        )
    service = NotificationService()
    notifications = await service.get_user_notifications(
        user_id=principal.user_id,
        unread_only=unread_only,
        limit=limit,
        offset=offset,
    )

    return NotificationsListResponse(
        notifications=[
            NotificationResponse(
                id=n["id"],
                user_id=n["user_id"],
                type=n["type"],
                title=n["title"],
                message=n["message"],
                data=n.get("data", {}),
                read=n["read"],
                created_at=n["created_at"].isoformat() if isinstance(n["created_at"], datetime) else str(n["created_at"]),
                read_at=n["read_at"].isoformat() if n.get("read_at") and isinstance(n["read_at"], datetime) else (str(n["read_at"]) if n.get("read_at") else None),
            )
            for n in notifications
        ],
        total=len(notifications),
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    principal: AuthenticatedPrincipal | None = Depends(get_current_principal),
) -> UnreadCountResponse:
    """
    Get the count of unread notifications for the current user.
    """
    if principal is None or not getattr(principal, "user_id", None):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="authentication_required",
        )
    service = NotificationService()
    notifications = await service.get_user_notifications(
        user_id=principal.user_id,
        unread_only=True,
        limit=1000,  # Get up to 1000 to count
        offset=0,
    )
    return UnreadCountResponse(count=len(notifications))


@router.post("/mark-read", response_model=MarkReadResponse)
async def mark_notifications_read(
    request: MarkReadRequest,
    principal: AuthenticatedPrincipal | None = Depends(get_current_principal),
) -> MarkReadResponse:
    """
    Mark specific notifications as read.

    If notification_ids is provided, only those notifications will be marked as read.
    If notification_ids is None or empty, all notifications for the user will be marked as read.
    """
    if principal is None or not getattr(principal, "user_id", None):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="authentication_required",
        )
    service = NotificationService()
    success = await service.mark_notifications_read(
        user_id=principal.user_id,
        notification_ids=request.notification_ids,
    )

    return MarkReadResponse(
        success=success,
        updated_count=len(request.notification_ids) if request.notification_ids else -1,
    )


@router.post("/mark-all-read", response_model=MarkReadResponse)
async def mark_all_notifications_read(
    principal: AuthenticatedPrincipal | None = Depends(get_current_principal),
) -> MarkReadResponse:
    """
    Mark all notifications for the current user as read.
    """
    if principal is None or not getattr(principal, "user_id", None):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="authentication_required",
        )
    service = NotificationService()
    success = await service.mark_notifications_read(
        user_id=principal.user_id,
        notification_ids=None,  # None means all
    )

    return MarkReadResponse(
        success=success,
        updated_count=-1,  # All notifications
    )


@router.patch("/{notification_id}/read", response_model=MarkReadResponse)
async def mark_notification_read(
    notification_id: str,
    principal: AuthenticatedPrincipal | None = Depends(get_current_principal),
) -> MarkReadResponse:
    """
    Mark a single notification as read.
    """
    if principal is None or not getattr(principal, "user_id", None):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="authentication_required",
        )
    service = NotificationService()
    success = await service.mark_notifications_read(
        user_id=principal.user_id,
        notification_ids=[notification_id],
    )

    return MarkReadResponse(
        success=success,
        updated_count=1,
    )


@router.patch("/{notification_id}/archive")
async def archive_notification(
    notification_id: str,
    principal: AuthenticatedPrincipal | None = Depends(get_current_principal),
):
    """
    Archive a notification (mark as read and hide from default view).
    For now, we just mark it as read. Future enhancement: add archived status.
    """
    if principal is None or not getattr(principal, "user_id", None):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="authentication_required",
        )
    service = NotificationService()
    success = await service.mark_notifications_read(
        user_id=principal.user_id,
        notification_ids=[notification_id],
    )

    return {"success": success, "message": "Notification archived"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    principal: AuthenticatedPrincipal | None = Depends(get_current_principal),
):
    """
    Delete a specific notification.
    """
    if principal is None or not getattr(principal, "user_id", None):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="authentication_required",
        )
    from sqlalchemy import text
    from app.data.database import get_engine
    
    engine = get_engine()
    with engine.begin() as conn:
        # Verify notification belongs to user before deleting
        result = conn.execute(
            text(
                """
                DELETE FROM notifications 
                WHERE id = :notification_id AND user_id = :user_id
                RETURNING id
                """
            ),
            {"notification_id": notification_id, "user_id": principal.user_id},
        )
        deleted = result.fetchone()
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or does not belong to user",
        )
    
    return {"success": True, "message": "Notification deleted"}


@router.delete("")
async def delete_all_notifications(
    principal: AuthenticatedPrincipal | None = Depends(get_current_principal),
):
    """
    Delete all notifications for the current user.
    """
    if principal is None or not getattr(principal, "user_id", None):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="authentication_required",
        )
    from sqlalchemy import text
    from app.data.database import get_engine
    
    engine = get_engine()
    with engine.begin() as conn:
        result = conn.execute(
            text("DELETE FROM notifications WHERE user_id = :user_id"),
            {"user_id": principal.user_id},
        )
        deleted_count = result.rowcount
    
    return {"success": True, "deleted_count": deleted_count, "message": "All notifications deleted"}


@router.post("/read-all", response_model=MarkReadResponse)
async def mark_all_read_alternative(
    principal: AuthenticatedPrincipal | None = Depends(get_current_principal),
) -> MarkReadResponse:
    """
    Alternative endpoint for marking all as read (for frontend compatibility).
    """
    if principal is None or not getattr(principal, "user_id", None):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="authentication_required",
        )
    return await mark_all_notifications_read(principal)


# ─── Notification Preferences ─────────────────────────────────────────────────


class NotificationPreferencesRequest(BaseModel):
    """Request model for updating notification preferences."""
    model_config = ConfigDict(extra="forbid")

    email: dict | None = Field(None, description="Email notification settings")
    push: dict | None = Field(None, description="Push notification settings")
    inApp: dict | None = Field(None, description="In-app notification settings")
    schedule: dict | None = Field(None, description="Notification schedule settings")
    slack: dict | None = Field(None, description="Slack integration settings")
    teams: dict | None = Field(None, description="Teams integration settings")


class NotificationPreferencesResponse(BaseModel):
    """Response model for notification preferences."""
    email: dict
    push: dict
    inApp: dict
    schedule: dict
    slack: dict | None = None
    teams: dict | None = None


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


@router.get("/preferences", response_model=NotificationPreferencesResponse)
async def get_notification_preferences(
    principal: AuthenticatedPrincipal | None = Depends(get_current_principal),
) -> NotificationPreferencesResponse:
    """
    Get notification preferences for the current user.
    """
    if principal is None or not getattr(principal, "user_id", None):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="authentication_required",
        )
    from sqlalchemy import text
    from app.data.database import get_engine
    import json

    engine = get_engine()
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT notification_preferences FROM users WHERE id = :user_id"),
            {"user_id": principal.user_id},
        )
        row = result.mappings().first()

    if row and row.get("notification_preferences"):
        prefs = row["notification_preferences"]
        # Handle if stored as string
        if isinstance(prefs, str):
            prefs = json.loads(prefs)
        # Merge with defaults to ensure all fields exist
        merged = {**DEFAULT_NOTIFICATION_PREFERENCES}
        for key in ["email", "push", "inApp", "schedule", "slack", "teams"]:
            if key in prefs and prefs[key] is not None:
                if isinstance(merged.get(key), dict) and isinstance(prefs[key], dict):
                    merged[key] = {**merged.get(key, {}), **prefs[key]}
                else:
                    merged[key] = prefs[key]
        return NotificationPreferencesResponse(**merged)

    return NotificationPreferencesResponse(**DEFAULT_NOTIFICATION_PREFERENCES)


@router.put("/preferences")
async def update_notification_preferences(
    request: NotificationPreferencesRequest,
    principal: AuthenticatedPrincipal | None = Depends(get_current_principal),
):
    """
    Update notification preferences for the current user.
    """
    if principal is None or not getattr(principal, "user_id", None):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="authentication_required",
        )
    from sqlalchemy import text
    from app.data.database import get_engine
    import json

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
            {"user_id": principal.user_id},
        )
        row = result.mappings().first()

        current_prefs = DEFAULT_NOTIFICATION_PREFERENCES.copy()
        if row and row.get("notification_preferences"):
            stored = row["notification_preferences"]
            if isinstance(stored, str):
                stored = json.loads(stored)
            current_prefs = {**current_prefs, **stored}

        # Merge with new preferences
        for key, value in prefs.items():
            if isinstance(current_prefs.get(key), dict) and isinstance(value, dict):
                current_prefs[key] = {**current_prefs.get(key, {}), **value}
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
            {"user_id": principal.user_id, "prefs": json.dumps(current_prefs)},
        )

    return {"success": True, "preferences": current_prefs}


@router.post("/preferences/reset")
async def reset_notification_preferences(
    principal: AuthenticatedPrincipal | None = Depends(get_current_principal),
):
    """
    Reset notification preferences to defaults for the current user.
    """
    if principal is None or not getattr(principal, "user_id", None):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="authentication_required",
        )
    from sqlalchemy import text
    from app.data.database import get_engine
    import json

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
                "user_id": principal.user_id,
                "prefs": json.dumps(DEFAULT_NOTIFICATION_PREFERENCES),
            },
        )

    return {"success": True, "preferences": DEFAULT_NOTIFICATION_PREFERENCES}
