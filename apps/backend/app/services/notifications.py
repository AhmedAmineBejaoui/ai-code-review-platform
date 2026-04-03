from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from app.data.database import get_engine
from app.services.email_service import EmailService
from app.services.slack_service import SlackService
from app.services.teams_service import TeamsService

logger = logging.getLogger(__name__)


class NotificationType(Enum):
    ASSIGNMENT_NEW = "assignment.new"
    ASSIGNMENT_REASSIGNED = "assignment.reassigned"
    REVIEW_OVERDUE_SOON = "review.overdue_soon"
    REVIEW_OVERDUE = "review.overdue"
    COMMENT_REPLY = "comment.reply"
    COMMENT_MENTION = "comment.mention"
    COMMENT_RESOLVED = "comment.resolved"
    CHANGE_REQUEST_CREATED = "change_request.created"
    CHANGE_REQUEST_RESOLVED = "change_request.resolved"
    LIVE_SESSION_INVITE = "live_session.invite"
    METRICS_WEEKLY_SUMMARY = "metrics.weekly_summary"
    DECISION_OVERRIDDEN = "decision.overridden"


class NotificationChannel(Enum):
    EMAIL = "email"
    PUSH = "push"
    IN_APP = "in_app"
    SLACK = "slack"
    TEAMS = "teams"


class NotificationService:
    """Service for sending notifications to reviewers and developers."""

    def __init__(self):
        self._engine = get_engine()

    async def send_assignment_notification(
        self,
        assignment_data: Dict[str, Any],
        channels: List[NotificationChannel] = None,
    ) -> bool:
        """Send notification for new review assignment."""
        channels = channels or [NotificationChannel.EMAIL, NotificationChannel.IN_APP]

        notification_data = {
            "type": NotificationType.ASSIGNMENT_NEW.value,
            "title": "New Review Assignment",
            "message": f"You've been assigned to review {assignment_data['analysis']['repo']}",
            "data": {
                "assignment_id": assignment_data["id"],
                "analysis_id": assignment_data["analysis_id"],
                "repo": assignment_data.get("analysis", {}).get("repo", "Unknown"),
                "priority": assignment_data.get("priority", "medium"),
                "due_at": assignment_data.get("due_at"),
            },
            "recipient_id": assignment_data["reviewer_id"],
        }

        return await self._send_notification(notification_data, channels)

    async def send_overdue_reminder(
        self,
        assignment_data: Dict[str, Any],
        hours_overdue: int,
    ) -> bool:
        """Send notification for overdue review."""
        if hours_overdue < 2:
            notification_type = NotificationType.REVIEW_OVERDUE_SOON
            title = "Review Due Soon"
            message = f"Review for {assignment_data['analysis']['repo']} is due in {2-hours_overdue} hours"
        else:
            notification_type = NotificationType.REVIEW_OVERDUE
            title = "Review Overdue"
            message = f"Review for {assignment_data['analysis']['repo']} is {hours_overdue} hours overdue"

        notification_data = {
            "type": notification_type.value,
            "title": title,
            "message": message,
            "data": {
                "assignment_id": assignment_data["id"],
                "analysis_id": assignment_data["analysis_id"],
                "repo": assignment_data.get("analysis", {}).get("repo", "Unknown"),
                "hours_overdue": hours_overdue,
            },
            "recipient_id": assignment_data["reviewer_id"],
        }

        # Overdue notifications go to all channels
        channels = [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH]
        return await self._send_notification(notification_data, channels)

    async def send_comment_reply_notification(
        self,
        comment_data: Dict[str, Any],
        parent_comment_author: str,
    ) -> bool:
        """Send notification when someone replies to a comment."""
        # Don't notify if replying to own comment
        if comment_data["author_id"] == parent_comment_author:
            return True

        notification_data = {
            "type": NotificationType.COMMENT_REPLY.value,
            "title": "Comment Reply",
            "message": f"New reply to your comment in {comment_data.get('file_path', 'review')}",
            "data": {
                "comment_id": comment_data["id"],
                "analysis_id": comment_data["analysis_id"],
                "file_path": comment_data["file_path"],
                "line_start": comment_data["line_start"],
            },
            "recipient_id": parent_comment_author,
        }

        channels = [NotificationChannel.IN_APP, NotificationChannel.PUSH]
        return await self._send_notification(notification_data, channels)

    async def send_change_request_notification(
        self,
        change_request_data: Dict[str, Any],
        analysis_author: str,
    ) -> bool:
        """Send notification for new change request."""
        notification_data = {
            "type": NotificationType.CHANGE_REQUEST_CREATED.value,
            "title": "Change Request",
            "message": f"New change request: {change_request_data['title']}",
            "data": {
                "change_request_id": change_request_data["id"],
                "analysis_id": change_request_data["analysis_id"],
                "title": change_request_data["title"],
                "category": change_request_data["category"],
                "priority": change_request_data["priority"],
            },
            "recipient_id": analysis_author,
        }

        channels = [NotificationChannel.EMAIL, NotificationChannel.IN_APP]
        return await self._send_notification(notification_data, channels)

    async def send_live_session_invite(
        self,
        session_data: Dict[str, Any],
        invitee_id: str,
        inviter_name: str,
    ) -> bool:
        """Send notification for live review session invite."""
        notification_data = {
            "type": NotificationType.LIVE_SESSION_INVITE.value,
            "title": "Live Review Invitation",
            "message": f"{inviter_name} invited you to join a live review session",
            "data": {
                "session_id": session_data["id"],
                "analysis_id": session_data["analysis_id"],
                "initiator_name": inviter_name,
            },
            "recipient_id": invitee_id,
        }

        channels = [NotificationChannel.IN_APP, NotificationChannel.PUSH]
        return await self._send_notification(notification_data, channels)

    async def send_weekly_metrics_summary(self, reviewer_id: str, metrics_data: Dict[str, Any]) -> bool:
        """Send weekly metrics summary to reviewer."""
        notification_data = {
            "type": NotificationType.METRICS_WEEKLY_SUMMARY.value,
            "title": "Weekly Review Summary",
            "message": f"You completed {metrics_data.get('reviews_completed', 0)} reviews this week!",
            "data": metrics_data,
            "recipient_id": reviewer_id,
        }

        channels = [NotificationChannel.EMAIL]
        return await self._send_notification(notification_data, channels)

    async def _send_notification(
        self,
        notification_data: Dict[str, Any],
        channels: List[NotificationChannel],
    ) -> bool:
        """Send notification through specified channels."""
        success = True

        for channel in channels:
            try:
                if channel == NotificationChannel.EMAIL:
                    await self._send_email_notification(notification_data)
                elif channel == NotificationChannel.IN_APP:
                    await self._send_in_app_notification(notification_data)
                elif channel == NotificationChannel.PUSH:
                    await self._send_push_notification(notification_data)
                elif channel == NotificationChannel.SLACK:
                    await self._send_slack_notification(notification_data)
                elif channel == NotificationChannel.TEAMS:
                    await self._send_teams_notification(notification_data)
            except Exception as e:
                print(f"Failed to send {channel.value} notification: {e}")
                success = False

        return success

    async def _send_email_notification(self, notification_data: Dict[str, Any]):
        """Send email notification using EmailService."""
        recipient_id = notification_data["recipient_id"]

        # Get user email and preferences
        user_email = await self._get_user_email(recipient_id)
        if not user_email:
            logger.warning(f"No email found for user {recipient_id}")
            return

        user_prefs = await self._get_user_notification_preferences(recipient_id)

        if not user_prefs.get("email", True):
            logger.debug(f"Email notifications disabled for user {recipient_id}")
            return  # User has disabled email notifications

        email_service = EmailService()
        notification_type = notification_data["type"]
        data = notification_data.get("data", {})

        try:
            if notification_type == NotificationType.ASSIGNMENT_NEW.value:
                await email_service.send_assignment_email(user_email, data)
            elif notification_type == NotificationType.COMMENT_REPLY.value:
                await email_service.send_comment_reply_email(user_email, data)
            elif notification_type == NotificationType.CHANGE_REQUEST_CREATED.value:
                await email_service.send_changes_requested_email(user_email, data)
            else:
                # Generic email for other notification types
                await email_service.send_email(
                    to=user_email,
                    subject=notification_data["title"],
                    html=f"<p>{notification_data['message']}</p>",
                )
            logger.info(f"Email notification sent to {user_email}")
        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")

    async def _get_user_email(self, user_id: str) -> str | None:
        """Get user's email address."""
        from sqlalchemy import text

        query = text("""
            SELECT email
            FROM users
            WHERE id = :user_id
        """)

        try:
            with self._engine.connect() as conn:
                result = conn.execute(query, {"user_id": user_id})
                row = result.mappings().first()
                if row:
                    return row.get("email")
        except Exception as e:
            logger.error(f"Failed to get user email: {e}")
        return None

    async def _send_in_app_notification(self, notification_data: Dict[str, Any]):
        """Send in-app notification."""
        from sqlalchemy import text

        # Store notification in database for user to see in notification center
        query = text("""
            INSERT INTO notifications (
                id, user_id, type, title, message, data, read, created_at
            ) VALUES (
                gen_random_uuid(), :user_id, :type, :title, :message, :data, false, :created_at
            )
        """)

        try:
            with self._engine.begin() as conn:
                conn.execute(query, {
                    "user_id": notification_data["recipient_id"],
                    "type": notification_data["type"],
                    "title": notification_data["title"],
                    "message": notification_data["message"],
                    "data": json.dumps(notification_data.get("data", {})),
                    "created_at": datetime.now(timezone.utc),
                })

            logger.info(f"In-app notification stored for user {notification_data['recipient_id']}")
        except Exception as e:
            logger.error(f"Failed to store in-app notification: {e}")

    async def _send_push_notification(self, notification_data: Dict[str, Any]):
        """Send push notification."""
        recipient_id = notification_data["recipient_id"]

        # Get user preferences
        user_prefs = await self._get_user_notification_preferences(recipient_id)

        if not user_prefs.get("push", True):
            return  # User has disabled push notifications

        # TODO: Implement actual push notification
        # This would integrate with FCM, APNs, or web push service
        logger.info(f"Push notification would be sent to {recipient_id}: {notification_data['title']}")

    async def _send_slack_notification(self, notification_data: Dict[str, Any]):
        """Send Slack notification using SlackService."""
        slack_service = SlackService()
        notification_type = notification_data["type"]
        data = notification_data.get("data", {})

        try:
            if notification_type == NotificationType.ASSIGNMENT_NEW.value:
                await slack_service.notify_new_review(data)
            elif notification_type == NotificationType.REVIEW_OVERDUE.value:
                await slack_service.notify_attention_required(data)
            elif notification_type == NotificationType.CHANGE_REQUEST_CREATED.value:
                await slack_service.notify_changes_requested(data)
            else:
                # Generic Slack message for other notification types
                await slack_service.send_message(
                    text=f"{notification_data['title']}: {notification_data['message']}"
                )
            logger.info("Slack notification sent")
        except Exception as e:
            logger.error(f"Failed to send Slack notification: {e}")

    async def _send_teams_notification(self, notification_data: Dict[str, Any]):
        """Send Microsoft Teams notification using TeamsService."""
        teams_service = TeamsService()
        notification_type = notification_data["type"]
        data = notification_data.get("data", {})

        try:
            if notification_type == NotificationType.ASSIGNMENT_NEW.value:
                await teams_service.notify_new_review(data)
            elif notification_type == NotificationType.REVIEW_OVERDUE.value:
                await teams_service.notify_attention_required(data)
            elif notification_type == NotificationType.CHANGE_REQUEST_CREATED.value:
                await teams_service.notify_changes_requested(data)
            else:
                # Generic Teams message for other notification types
                await teams_service.send_message(
                    title=notification_data['title'],
                    text=notification_data['message'],
                )
            logger.info("Teams notification sent")
        except Exception as e:
            logger.error(f"Failed to send Teams notification: {e}")

    async def _get_user_notification_preferences(self, user_id: str) -> Dict[str, bool]:
        """Get user's notification preferences."""
        from sqlalchemy import text

        query = text("""
            SELECT notification_preferences
            FROM users
            WHERE id = :user_id
        """)

        try:
            with self._engine.connect() as conn:
                result = conn.execute(query, {"user_id": user_id})
                row = result.mappings().first()

                if row and row.get("notification_preferences"):
                    return row["notification_preferences"]
        except Exception as e:
            logger.error(f"Failed to get user notification preferences: {e}")

        # Default preferences
        return {
            "email": True,
            "push": True,
            "realtime": True,
        }

    async def mark_notifications_read(self, user_id: str, notification_ids: List[str] = None) -> bool:
        """Mark notifications as read."""
        from sqlalchemy import text

        if notification_ids:
            query = text("""
                UPDATE notifications
                SET read = true, read_at = :read_at
                WHERE user_id = :user_id AND id = ANY(:notification_ids)
            """)
            params = {
                "user_id": user_id,
                "notification_ids": notification_ids,
                "read_at": datetime.now(timezone.utc),
            }
        else:
            # Mark all as read
            query = text("""
                UPDATE notifications
                SET read = true, read_at = :read_at
                WHERE user_id = :user_id AND read = false
            """)
            params = {
                "user_id": user_id,
                "read_at": datetime.now(timezone.utc),
            }

        try:
            with self._engine.begin() as conn:
                conn.execute(query, params)
            return True
        except Exception as e:
            logger.error(f"Failed to mark notifications as read: {e}")
            return False

    async def get_user_notifications(
        self,
        user_id: str,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Get notifications for a user."""
        from sqlalchemy import text

        conditions = ["user_id = :user_id"]
        params: Dict[str, Any] = {"user_id": user_id, "limit": limit, "offset": offset}

        if unread_only:
            conditions.append("read = false")

        query = text(f"""
            SELECT id, user_id, type, title, message, data, read, created_at, read_at
            FROM notifications
            WHERE {" AND ".join(conditions)}
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        """)

        try:
            with self._engine.connect() as conn:
                result = conn.execute(query, params)
                return [dict(row) for row in result.mappings()]
        except Exception as e:
            logger.error(f"Failed to get user notifications: {e}")
            return []

    async def cleanup_old_notifications(self, days: int = 30) -> int:
        """Clean up notifications older than specified days."""
        from sqlalchemy import text

        query = text(f"""
            DELETE FROM notifications
            WHERE created_at < NOW() - INTERVAL '{days} days'
        """)

        try:
            with self._engine.begin() as conn:
                result = conn.execute(query)
                return result.rowcount
        except Exception as e:
            logger.error(f"Failed to cleanup notifications: {e}")
            return 0