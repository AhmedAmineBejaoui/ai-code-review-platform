"""
Notification routes - CRUD operations for notifications.

Extracted from: apps/backend/app/api/http/notifications.py
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, List

from fastapi import APIRouter, Header, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import text

from ..database import get_engine

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


# ─── Models ────────────────────────────────────────────────────────────────────


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


# ─── Helper Functions ──────────────────────────────────────────────────────────


def _get_user_id_from_header(x_user_id: str | None) -> str:
    """Extract and validate user ID from header."""
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="authentication_required",
        )
    return x_user_id


def _normalize_notification_row(row: dict[str, Any]) -> dict[str, Any]:
    """Normalize a notification row from database."""
    data = row.get("data")
    if isinstance(data, str):
        try:
            row["data"] = json.loads(data)
        except json.JSONDecodeError:
            row["data"] = {}
    elif data is None:
        row["data"] = {}

    for key in ("id", "user_id", "type", "title", "message"):
        if key in row and row[key] is not None:
            row[key] = str(row[key])
    for key in ("created_at", "read_at"):
        if isinstance(row.get(key), datetime):
            row[key] = row[key].isoformat()
    return row


async def get_user_notifications(
    user_id: str,
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0,
    role_filter: str | None = None,
) -> list[dict[str, Any]]:
    """Get notifications for a user."""
    conditions = ["user_id = :user_id"]
    params: dict[str, Any] = {"user_id": user_id, "limit": limit, "offset": offset}

    if unread_only:
        conditions.append("read = false")
    if role_filter and role_filter.strip():
        conditions.append("(data->'recipient'->>'role') = :role_filter")
        params["role_filter"] = role_filter.strip()

    query = text(
        f"""
        SELECT id, user_id, type, title, message, data, read, created_at, read_at
        FROM notifications
        WHERE {' AND '.join(conditions)}
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
        """
    )

    try:
        engine = get_engine()
        with engine.connect() as conn:
            result = conn.execute(query, params)
            rows = [dict(row) for row in result.mappings()]
        return [_normalize_notification_row(row) for row in rows]
    except Exception:
        return []


async def mark_notifications_read(
    user_id: str,
    notification_ids: list[str] | None = None,
) -> bool:
    """Mark notifications as read."""
    if notification_ids:
        query = text(
            """
            UPDATE notifications
            SET read = true, read_at = :read_at
            WHERE user_id = :user_id AND id = ANY(:notification_ids)
            RETURNING id
            """
        )
        params = {
            "user_id": user_id,
            "notification_ids": notification_ids,
            "read_at": datetime.now(timezone.utc),
        }
    else:
        query = text(
            """
            UPDATE notifications
            SET read = true, read_at = :read_at
            WHERE user_id = :user_id AND read = false
            RETURNING id
            """
        )
        params = {"user_id": user_id, "read_at": datetime.now(timezone.utc)}

    try:
        engine = get_engine()
        with engine.begin() as conn:
            conn.execute(query, params)
        return True
    except Exception:
        return False


# ─── Routes ────────────────────────────────────────────────────────────────────


@router.get("", response_model=NotificationsListResponse)
async def list_notifications(
    unread_only: bool = Query(False, description="Filter to unread notifications only"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of notifications to return"),
    offset: int = Query(0, ge=0, description="Number of notifications to skip"),
    role: str | None = Query(None, description="Optional role filter (admin/reviewer/developer)"),
    x_user_id: str | None = Header(None),
) -> NotificationsListResponse:
    """
    Get notifications for the current user.

    Returns a list of notifications ordered by creation date (most recent first).
    """
    user_id = _get_user_id_from_header(x_user_id)
    
    notifications = await get_user_notifications(
        user_id=user_id,
        unread_only=unread_only,
        limit=limit,
        offset=offset,
        role_filter=role,
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
                created_at=n["created_at"] if isinstance(n["created_at"], str) else str(n["created_at"]),
                read_at=n["read_at"] if isinstance(n.get("read_at"), str) else (str(n["read_at"]) if n.get("read_at") else None),
            )
            for n in notifications
        ],
        total=len(notifications),
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    x_user_id: str | None = Header(None),
) -> UnreadCountResponse:
    """
    Get the count of unread notifications for the current user.
    """
    user_id = _get_user_id_from_header(x_user_id)
    
    notifications = await get_user_notifications(
        user_id=user_id,
        unread_only=True,
        limit=1000,
        offset=0,
    )
    return UnreadCountResponse(count=len(notifications))


@router.post("/mark-read", response_model=MarkReadResponse)
async def mark_read(
    request: MarkReadRequest,
    x_user_id: str | None = Header(None),
) -> MarkReadResponse:
    """
    Mark specific notifications as read.

    If notification_ids is provided, only those notifications will be marked as read.
    If notification_ids is None or empty, all notifications for the user will be marked as read.
    """
    user_id = _get_user_id_from_header(x_user_id)
    
    success = await mark_notifications_read(
        user_id=user_id,
        notification_ids=request.notification_ids,
    )

    return MarkReadResponse(
        success=success,
        updated_count=len(request.notification_ids) if request.notification_ids else -1,
    )


@router.post("/mark-all-read", response_model=MarkReadResponse)
async def mark_all_read(
    x_user_id: str | None = Header(None),
) -> MarkReadResponse:
    """
    Mark all notifications for the current user as read.
    """
    user_id = _get_user_id_from_header(x_user_id)
    
    success = await mark_notifications_read(
        user_id=user_id,
        notification_ids=None,
    )

    return MarkReadResponse(
        success=success,
        updated_count=-1,
    )


@router.post("/read-all", response_model=MarkReadResponse)
async def read_all_alternative(
    x_user_id: str | None = Header(None),
) -> MarkReadResponse:
    """
    Alternative endpoint for marking all as read (for frontend compatibility).
    """
    user_id = _get_user_id_from_header(x_user_id)
    
    success = await mark_notifications_read(
        user_id=user_id,
        notification_ids=None,
    )

    return MarkReadResponse(
        success=success,
        updated_count=-1,
    )


@router.patch("/{notification_id}/read", response_model=MarkReadResponse)
async def mark_single_notification_read(
    notification_id: str,
    x_user_id: str | None = Header(None),
) -> MarkReadResponse:
    """
    Mark a single notification as read.
    """
    user_id = _get_user_id_from_header(x_user_id)
    
    success = await mark_notifications_read(
        user_id=user_id,
        notification_ids=[notification_id],
    )

    return MarkReadResponse(
        success=success,
        updated_count=1,
    )


@router.patch("/{notification_id}/archive")
async def archive_notification(
    notification_id: str,
    x_user_id: str | None = Header(None),
):
    """
    Archive a notification (mark as read and hide from default view).
    For now, we just mark it as read. Future enhancement: add archived status.
    """
    user_id = _get_user_id_from_header(x_user_id)
    
    success = await mark_notifications_read(
        user_id=user_id,
        notification_ids=[notification_id],
    )

    return {"success": success, "message": "Notification archived"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    x_user_id: str | None = Header(None),
):
    """
    Delete a specific notification.
    """
    user_id = _get_user_id_from_header(x_user_id)
    
    engine = get_engine()
    with engine.begin() as conn:
        result = conn.execute(
            text(
                """
                DELETE FROM notifications 
                WHERE id = :notification_id AND user_id = :user_id
                RETURNING id
                """
            ),
            {"notification_id": notification_id, "user_id": user_id},
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
    x_user_id: str | None = Header(None),
):
    """
    Delete all notifications for the current user.
    """
    user_id = _get_user_id_from_header(x_user_id)
    
    engine = get_engine()
    with engine.begin() as conn:
        result = conn.execute(
            text("DELETE FROM notifications WHERE user_id = :user_id"),
            {"user_id": user_id},
        )
        deleted_count = result.rowcount
    
    return {"success": True, "deleted_count": deleted_count, "message": "All notifications deleted"}
