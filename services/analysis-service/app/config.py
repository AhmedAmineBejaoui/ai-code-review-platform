"""
Analysis Service configuration.
"""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class AnalysisServiceSettings(BaseSettings):
    """Analysis Service specific settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Service identification
    SERVICE_NAME: str = "analysis-service"
    SERVICE_VERSION: str = "1.0.0"
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 4002
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str = "postgresql+psycopg://postgres:simplepass@localhost:5432/ai_code_review_platform"
    
    # Redis (for Celery queue)
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Worker settings
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    
    # API pagination
    API_DEFAULT_PAGE_SIZE: int = 20
    API_MAX_PAGE_SIZE: int = 100
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Static Analysis Tools
    RUFF_ENABLED: bool = True
    SEMGREP_ENABLED: bool = True
    
    # LLM Settings
    LLM_ENABLED: bool = False
    LLM_PROVIDER: str = "ollama"


@lru_cache
def get_settings() -> AnalysisServiceSettings:
    return AnalysisServiceSettings()
