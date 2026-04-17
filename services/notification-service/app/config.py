"""
Notification Service configuration.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class NotificationServiceSettings(BaseSettings):
    """Notification Service specific settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Service identification
    SERVICE_NAME: str = "notification-service"
    SERVICE_VERSION: str = "1.0.0"
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 4007
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str = "postgresql+psycopg://postgres:simplepass@localhost:5432/ai_code_review_platform"
    
    # Redis (for real-time notifications)
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Push Notifications (VAPID)
    PUSH_NOTIFICATIONS_ENABLED: bool = False
    VAPID_PUBLIC_KEY: str | None = None
    VAPID_PRIVATE_KEY: str | None = None
    VAPID_CLAIMS_EMAIL: str = "admin@example.com"
    
    # Email Settings
    EMAIL_ENABLED: bool = False
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@example.com"
    SMTP_FROM_NAME: str = "AI Code Review"
    SMTP_USE_TLS: bool = True
    
    # Slack Integration
    SLACK_ENABLED: bool = False
    SLACK_BOT_TOKEN: str | None = None
    SLACK_WEBHOOK_URL: str | None = None
    
    # Teams Integration
    TEAMS_ENABLED: bool = False
    TEAMS_WEBHOOK_URL: str | None = None


@lru_cache
def get_settings() -> NotificationServiceSettings:
    return NotificationServiceSettings()
