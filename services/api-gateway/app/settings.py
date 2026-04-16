"""API Gateway — configuration."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── Downstream service URLs ────────────────────────────────────────────────
    AUTH_SERVICE_URL:         str = "http://auth-service:8001"
    ANALYSIS_SERVICE_URL:     str = "http://analysis-service:8002"
    WORKER_SERVICE_URL:       str = "http://worker-service:8003"
    REVIEW_SERVICE_URL:       str = "http://review-service:8004"
    RAG_SERVICE_URL:          str = "http://rag-service:8005"
    NOTIFICATION_SERVICE_URL: str = "http://notification-service:8006"

    # ── Gateway config ────────────────────────────────────────────────────────
    GATEWAY_PORT: int = 8000
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001"

    # ── Auth ──────────────────────────────────────────────────────────────────
    # The gateway delegates JWT validation to the Auth Service.
    # Set to False only for local dev (no Clerk).
    AUTH_VALIDATION_ENABLED: bool = True

    # ── Timeouts (ms → used in httpx seconds) ────────────────────────────────
    PROXY_READ_TIMEOUT_S:  float = 30.0
    PROXY_WRITE_TIMEOUT_S: float = 30.0

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]


settings = Settings()
