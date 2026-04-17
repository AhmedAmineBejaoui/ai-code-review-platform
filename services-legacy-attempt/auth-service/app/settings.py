"""Auth Service — configuration."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str | None = None

    # Clerk JWT
    CLERK_AUTH_ENABLED:        bool      = False
    CLERK_ISSUER_URL:          str | None = None
    CLERK_JWKS_URL:            str | None = None
    CLERK_AUDIENCE:            str | None = None
    CLERK_JWT_LEEWAY_SECONDS:  int        = 10

    # RBAC
    RBAC_ENFORCEMENT_ENABLED: bool      = False
    ADMIN_EMAILS:             str | None = None

    # Principal cache
    PRINCIPAL_CACHE_TTL_SECONDS: int = 60
    PRINCIPAL_CACHE_MAX_SIZE:    int = 10_000

    @property
    def admin_emails(self) -> list[str]:
        if not self.ADMIN_EMAILS:
            return []
        return [e.strip().lower() for e in self.ADMIN_EMAILS.split(",") if e.strip()]


settings = Settings()
