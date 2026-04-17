"""
API Gateway configuration.
"""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class GatewaySettings(BaseSettings):
    """API Gateway specific settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Service identification
    SERVICE_NAME: str = "api-gateway"
    SERVICE_VERSION: str = "1.0.0"
    
    # Gateway settings
    HOST: str = "0.0.0.0"
    PORT: int = 3000
    DEBUG: bool = False
    
    # Authentication
    CLERK_AUTH_ENABLED: bool = False
    CLERK_ISSUER_URL: Optional[str] = None
    CLERK_JWKS_URL: Optional[str] = None
    
    # Rate limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = 100
    
    # Redis for rate limiting and caching
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Downstream service URLs
    AUTH_SERVICE_URL: str = "http://localhost:4001"
    ANALYSIS_SERVICE_URL: str = "http://localhost:4002"
    PROJECT_SERVICE_URL: str = "http://localhost:4003"
    REVIEW_SERVICE_URL: str = "http://localhost:4004"
    INTEGRATION_SERVICE_URL: str = "http://localhost:4005"
    AI_SERVICE_URL: str = "http://localhost:4006"
    NOTIFICATION_SERVICE_URL: str = "http://localhost:4007"
    SECURITY_SERVICE_URL: str = "http://localhost:4008"
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]
    
    # Timeouts (seconds)
    PROXY_TIMEOUT: float = 60.0
    CONNECT_TIMEOUT: float = 10.0


@lru_cache
def get_settings() -> GatewaySettings:
    return GatewaySettings()
