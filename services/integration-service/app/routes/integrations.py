"""
General integrations routes for Integration Service.

Handles:
- Integration status
- Slack configuration and notifications
- Microsoft Teams configuration and notifications
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
import httpx

from ..config import get_settings

router = APIRouter(prefix="/api/v1/integrations", tags=["integrations"])
logger = logging.getLogger(__name__)


# ─── Response Models ──────────────────────────────────────────────────────────

class IntegrationStatus(BaseModel):
    name: str
    enabled: bool
    configured: bool
    webhook_configured: bool
    default_channel: str | None


class IntegrationsStatusResponse(BaseModel):
    slack: IntegrationStatus
    teams: IntegrationStatus
    github: IntegrationStatus


class TestMessageRequest(BaseModel):
    message: str = "Test notification from AI Code Review Platform"


class TestMessageResponse(BaseModel):
    success: bool
    message: str


class SlackConfigResponse(BaseModel):
    enabled: bool
    webhook_configured: bool
    default_channel: str


class TeamsConfigResponse(BaseModel):
    enabled: bool
    webhook_configured: bool
    default_channel: str


# ─── Slack Service ────────────────────────────────────────────────────────────

class SlackService:
    """Service for sending Slack notifications."""
    
    def __init__(self):
        settings = get_settings()
        self.enabled = settings.SLACK_ENABLED
        self.webhook_url = settings.SLACK_WEBHOOK_URL
        self.default_channel = settings.SLACK_DEFAULT_CHANNEL
    
    async def send_message(
        self,
        text: str,
        blocks: list[dict] | None = None,
        channel: str | None = None
    ) -> bool:
        """Send a message to Slack."""
        if not self.enabled or not self.webhook_url:
            return False
        
        payload = {"text": text}
        if blocks:
            payload["blocks"] = blocks
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(self.webhook_url, json=payload)
                return response.is_success
        except Exception as e:
            logger.error(f"Failed to send Slack message: {e}")
            return False
    
    async def notify_new_review(self, data: dict) -> bool:
        """Send a review notification to Slack."""
        text = f"New code review: {data.get('title', 'Untitled')}"
        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f":mag: *New Code Review*\n{data.get('title', 'Untitled')}",
                },
            },
        ]
        return await self.send_message(text=text, blocks=blocks)


# ─── Teams Service ────────────────────────────────────────────────────────────

class TeamsService:
    """Service for sending Microsoft Teams notifications."""
    
    def __init__(self):
        settings = get_settings()
        self.enabled = settings.TEAMS_ENABLED
        self.webhook_url = settings.TEAMS_WEBHOOK_URL
        self.default_channel = settings.TEAMS_DEFAULT_CHANNEL
    
    async def send_message(
        self,
        title: str,
        text: str,
        sections: list[dict] | None = None,
        theme_color: str = "0078D7"
    ) -> bool:
        """Send a message to Microsoft Teams."""
        if not self.enabled or not self.webhook_url:
            return False
        
        payload = {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "themeColor": theme_color,
            "summary": title,
            "sections": [
                {
                    "activityTitle": title,
                    "text": text,
                }
            ],
        }
        
        if sections:
            payload["sections"].extend(sections)
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(self.webhook_url, json=payload)
                return response.is_success
        except Exception as e:
            logger.error(f"Failed to send Teams message: {e}")
            return False
    
    async def notify_new_review(self, data: dict) -> bool:
        """Send a review notification to Teams."""
        return await self.send_message(
            title="New Code Review",
            text=data.get("title", "Untitled"),
            theme_color="0078D7",
        )


# ─── Status Endpoints ─────────────────────────────────────────────────────────

@router.get("/status", response_model=IntegrationsStatusResponse)
async def get_integrations_status():
    """Get status of all integrations."""
    settings = get_settings()
    
    return IntegrationsStatusResponse(
        slack=IntegrationStatus(
            name="Slack",
            enabled=settings.SLACK_ENABLED,
            configured=bool(settings.SLACK_WEBHOOK_URL),
            webhook_configured=bool(settings.SLACK_WEBHOOK_URL),
            default_channel=settings.SLACK_DEFAULT_CHANNEL,
        ),
        teams=IntegrationStatus(
            name="Microsoft Teams",
            enabled=settings.TEAMS_ENABLED,
            configured=bool(settings.TEAMS_WEBHOOK_URL),
            webhook_configured=bool(settings.TEAMS_WEBHOOK_URL),
            default_channel=settings.TEAMS_DEFAULT_CHANNEL,
        ),
        github=IntegrationStatus(
            name="GitHub",
            enabled=bool(settings.GITHUB_APP_ID),
            configured=bool(settings.GITHUB_APP_ID and settings.GITHUB_APP_PRIVATE_KEY_PEM),
            webhook_configured=bool(settings.GITHUB_WEBHOOK_SECRET),
            default_channel=None,
        ),
    )


# ─── Slack Endpoints ──────────────────────────────────────────────────────────

@router.get("/slack/config", response_model=SlackConfigResponse)
async def get_slack_config():
    """Get Slack integration configuration (safe values only)."""
    settings = get_settings()
    return SlackConfigResponse(
        enabled=settings.SLACK_ENABLED,
        webhook_configured=bool(settings.SLACK_WEBHOOK_URL),
        default_channel=settings.SLACK_DEFAULT_CHANNEL,
    )


@router.post("/slack/test", response_model=TestMessageResponse)
async def test_slack_integration(request: TestMessageRequest):
    """Send a test message to Slack."""
    settings = get_settings()
    
    if not settings.SLACK_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slack integration is not enabled",
        )

    if not settings.SLACK_WEBHOOK_URL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slack webhook URL is not configured",
        )

    slack_service = SlackService()
    success = await slack_service.send_message(
        text=request.message,
        blocks=[
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f":white_check_mark: *Test Message*\n{request.message}",
                },
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": "Sent from AI Code Review Platform",
                    }
                ],
            },
        ],
    )

    if success:
        return TestMessageResponse(
            success=True,
            message="Test message sent successfully to Slack",
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send test message to Slack",
        )


@router.post("/slack/notify/review", response_model=TestMessageResponse)
async def send_slack_review_notification(data: dict):
    """Send a review notification to Slack (for testing/manual triggering)."""
    settings = get_settings()
    
    if not settings.SLACK_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slack integration is not enabled",
        )

    slack_service = SlackService()
    success = await slack_service.notify_new_review(data)

    return TestMessageResponse(
        success=success,
        message="Review notification sent to Slack" if success else "Failed to send notification",
    )


# ─── Teams Endpoints ──────────────────────────────────────────────────────────

@router.get("/teams/config", response_model=TeamsConfigResponse)
async def get_teams_config():
    """Get Microsoft Teams integration configuration (safe values only)."""
    settings = get_settings()
    return TeamsConfigResponse(
        enabled=settings.TEAMS_ENABLED,
        webhook_configured=bool(settings.TEAMS_WEBHOOK_URL),
        default_channel=settings.TEAMS_DEFAULT_CHANNEL,
    )


@router.post("/teams/test", response_model=TestMessageResponse)
async def test_teams_integration(request: TestMessageRequest):
    """Send a test message to Microsoft Teams."""
    settings = get_settings()
    
    if not settings.TEAMS_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Teams integration is not enabled",
        )

    if not settings.TEAMS_WEBHOOK_URL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Teams webhook URL is not configured",
        )

    teams_service = TeamsService()
    success = await teams_service.send_message(
        title="Test Message",
        text=request.message,
        sections=[
            {
                "facts": [
                    {"name": "Source", "value": "AI Code Review Platform"},
                    {"name": "Type", "value": "Test Notification"},
                ],
            }
        ],
        theme_color="00FF00",  # Green for success
    )

    if success:
        return TestMessageResponse(
            success=True,
            message="Test message sent successfully to Microsoft Teams",
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send test message to Microsoft Teams",
        )


@router.post("/teams/notify/review", response_model=TestMessageResponse)
async def send_teams_review_notification(data: dict):
    """Send a review notification to Microsoft Teams (for testing/manual triggering)."""
    settings = get_settings()
    
    if not settings.TEAMS_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Teams integration is not enabled",
        )

    teams_service = TeamsService()
    success = await teams_service.notify_new_review(data)

    return TestMessageResponse(
        success=success,
        message="Review notification sent to Teams" if success else "Failed to send notification",
    )
