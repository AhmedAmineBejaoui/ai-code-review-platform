from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field

from app.api.middleware.auth import AuthenticatedPrincipal, get_current_principal
from app.services.notifications import NotificationService

router = APIRouter(prefix="/v1/notifications", tags=["notifications"])


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
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> NotificationsListResponse:
    """
    Get notifications for the current user.

    Returns a list of notifications ordered by creation date (most recent first).
    """
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
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> UnreadCountResponse:
    """
    Get the count of unread notifications for the current user.
    """
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
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> MarkReadResponse:
    """
    Mark specific notifications as read.

    If notification_ids is provided, only those notifications will be marked as read.
    If notification_ids is None or empty, all notifications for the user will be marked as read.
    """
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
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> MarkReadResponse:
    """
    Mark all notifications for the current user as read.
    """
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
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> MarkReadResponse:
    """
    Mark a single notification as read.
    """
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
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
):
    """
    Archive a notification (mark as read and hide from default view).
    For now, we just mark it as read. Future enhancement: add archived status.
    """
    service = NotificationService()
    success = await service.mark_notifications_read(
        user_id=principal.user_id,
        notification_ids=[notification_id],
    )

    return {"success": success, "message": "Notification archived"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
):
    """
    Delete a specific notification.
    """
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
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
):
    """
    Delete all notifications for the current user.
    """
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
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> MarkReadResponse:
    """
    Alternative endpoint for marking all as read (for frontend compatibility).
    """
    return await mark_all_notifications_read(principal)
