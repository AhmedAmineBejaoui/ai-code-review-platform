"""
Project Service configuration.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class ProjectServiceSettings(BaseSettings):
    """Project Service specific settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Service identification
    SERVICE_NAME: str = "project-service"
    SERVICE_VERSION: str = "1.0.0"
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 4003
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str = "postgresql+psycopg://postgres:simplepass@localhost:5432/ai_code_review_platform"
    
    # API pagination
    API_DEFAULT_PAGE_SIZE: int = 20
    API_MAX_PAGE_SIZE: int = 100
    
    # Logging
    LOG_LEVEL: str = "INFO"


@lru_cache
def get_settings() -> ProjectServiceSettings:
    return ProjectServiceSettings()
