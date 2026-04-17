"""
Integration Service configuration.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class IntegrationServiceSettings(BaseSettings):
    """Integration Service specific settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Service identification
    SERVICE_NAME: str = "integration-service"
    SERVICE_VERSION: str = "1.0.0"
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 4005
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str = "postgresql+psycopg://postgres:simplepass@localhost:5432/ai_code_review_platform"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Celery (for task queuing)
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    ANALYSIS_QUEUE_NAME: str = "analysis_queue"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # GitHub Integration
    GITHUB_WEBHOOK_SECRET: str | None = None
    GITHUB_APP_ID: str | None = None
    GITHUB_APP_PRIVATE_KEY_PEM: str | None = None
    
    # Jira Integration
    JIRA_ENABLED: bool = False
    
    # Slack Integration
    SLACK_ENABLED: bool = False
    SLACK_WEBHOOK_URL: str | None = None
    SLACK_DEFAULT_CHANNEL: str = "#code-reviews"
    
    # Microsoft Teams Integration
    TEAMS_ENABLED: bool = False
    TEAMS_WEBHOOK_URL: str | None = None
    TEAMS_DEFAULT_CHANNEL: str = "Code Reviews"
    
    # Secrets encryption
    SECRETS_ENCRYPTION_KEY: str | None = None


@lru_cache
def get_settings() -> IntegrationServiceSettings:
    return IntegrationServiceSettings()
