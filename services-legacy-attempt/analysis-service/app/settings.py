"""Analysis Service — configuration."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str | None = None
    REDIS_URL:    str | None = None

    # Celery
    CELERY_BROKER_URL:          str | None = None
    CELERY_RESULT_BACKEND:      str | None = None
    CELERY_TASK_ALWAYS_EAGER:   bool       = False
    CELERY_ENQUEUE_REQUIRE_WORKER: bool    = True
    ANALYSIS_QUEUE_NAME:        str        = "analyses"

    # GitHub Webhook
    GITHUB_WEBHOOK_SECRET: str | None = None

    # Downstream services (for calling Worker Service health-check)
    WORKER_SERVICE_URL: str = "http://worker-service:8003"

    # API pagination
    API_DEFAULT_PAGE_SIZE: int = 20
    API_MAX_PAGE_SIZE:     int = 100

    # Max diff size
    MAX_DIFF_BYTES: int = 2_000_000


settings = Settings()
