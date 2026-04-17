"""
Security Service configuration.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class SecurityServiceSettings(BaseSettings):
    """Security Service specific settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Service identification
    SERVICE_NAME: str = "security-service"
    SERVICE_VERSION: str = "1.0.0"
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 4008
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str = "postgresql+psycopg://postgres:simplepass@localhost:5432/ai_code_review_platform"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Security Scanning
    SECURITY_SCAN_ENABLED: bool = True
    SECRET_SCAN_ENABLED: bool = True
    SECRETS_ENCRYPTION_KEY: str | None = None
    
    # Secret Detection Patterns
    SECRET_DETECTION_AWS_KEY: bool = True
    SECRET_DETECTION_PRIVATE_KEY: bool = True
    SECRET_DETECTION_API_TOKEN: bool = True
    SECRET_DETECTION_PASSWORD: bool = True


@lru_cache
def get_settings() -> SecurityServiceSettings:
    return SecurityServiceSettings()
