"""Worker Service — configuration."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL:   str | None = None
    REDIS_URL:      str | None = None

    # Celery
    CELERY_BROKER_URL:        str | None = None
    CELERY_RESULT_BACKEND:    str | None = None
    CELERY_TASK_ALWAYS_EAGER: bool       = False
    CELERY_WORKER_POOL:       str | None = None
    ANALYSIS_QUEUE_NAME:      str        = "analyses"

    # Downstream service calls (HTTP)
    REVIEW_SERVICE_URL: str = "http://review-service:8004"
    RAG_SERVICE_URL:    str = "http://rag-service:8005"
    NOTIFICATION_SERVICE_URL: str = "http://notification-service:8006"

    # Static analysis tools (same flags as monolith)
    STATIC_ANALYSIS_ENABLED:         bool = True
    STATIC_ANALYSIS_RUFF_ENABLED:    bool = True
    STATIC_ANALYSIS_SEMGREP_ENABLED: bool = True
    STATIC_ANALYSIS_ESLINT_ENABLED:  bool = True
    STATIC_ANALYSIS_TIMEOUT_SECONDS: int  = 60
    STATIC_ANALYSIS_MAX_FINDINGS:    int  = 200
    CLEAN_CODE_RULE_ENGINE_ENABLED:  bool = True

    # Secret scan
    SECRET_SCAN_ENABLED:            bool  = True
    SECRET_SCAN_ENTROPY_THRESHOLD:  float = 3.8
    SECRET_SCAN_MIN_TOKEN_LEN:      int   = 20

    # LLM (Ollama) — used for fallback if Review Service is unavailable
    LLM_ENABLED:          bool = False
    OLLAMA_BASE_URL:      str  = "http://ollama:11434"
    OLLAMA_MODEL:         str  = "deepseek-coder"
    OLLAMA_TIMEOUT_SECONDS: int = 120

    # Repo context
    STATIC_ANALYSIS_WORKSPACE_PATH:  str       = "."
    CLEAN_CODE_EXCLUDED_REPOS:       str | None = None


settings = Settings()
