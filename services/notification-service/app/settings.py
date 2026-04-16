"""Notification Service — configuration."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str | None = None   # For notifications table

    # Email
    EMAIL_ENABLED:     bool       = False
    SMTP_HOST:         str        = "smtp.gmail.com"
    SMTP_PORT:         int        = 587
    SMTP_USERNAME:     str | None = None
    SMTP_PASSWORD:     str | None = None
    EMAIL_FROM:        str        = "no-reply@aicodereview.local"

    # Slack
    SLACK_ENABLED:     bool       = False
    SLACK_BOT_TOKEN:   str | None = None

    # Microsoft Teams
    TEAMS_ENABLED:     bool       = False
    TEAMS_WEBHOOK_URL: str | None = None

    # WebPush
    WEB_PUSH_ENABLED:  bool       = False
    VAPID_PRIVATE_KEY: str | None = None
    VAPID_PUBLIC_KEY:  str | None = None
    VAPID_CLAIMS_SUB:  str        = "mailto:admin@local.test"


settings = Settings()
