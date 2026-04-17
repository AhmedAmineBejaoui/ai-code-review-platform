"""
Auth Service configuration.
"""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class AuthServiceSettings(BaseSettings):
    """Auth Service specific settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Service identification
    SERVICE_NAME: str = "auth-service"
    SERVICE_VERSION: str = "1.0.0"
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 4001
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str = "postgresql+psycopg://postgres:simplepass@localhost:5432/ai_code_review_platform"
    
    # Authentication - Clerk
    CLERK_AUTH_ENABLED: bool = False
    CLERK_ISSUER_URL: Optional[str] = None
    CLERK_JWKS_URL: Optional[str] = None
    CLERK_AUDIENCE: str = ""
    CLERK_JWT_LEEWAY_SECONDS: int = 60
    
    # RBAC
    RBAC_ENFORCEMENT_ENABLED: bool = False
    CLERK_ORGANIZATIONS_ENFORCED: bool = False
    
    # Admin emails (comma-separated)
    ADMIN_EMAILS: str = ""
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    @property
    def admin_emails(self) -> set[str]:
        """Parse admin emails into a set."""
        if not self.ADMIN_EMAILS:
            return set()
        return {e.strip().lower() for e in self.ADMIN_EMAILS.split(",") if e.strip()}


@lru_cache
def get_settings() -> AuthServiceSettings:
    return AuthServiceSettings()
