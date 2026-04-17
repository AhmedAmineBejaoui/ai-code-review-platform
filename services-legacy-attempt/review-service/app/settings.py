"""Review Service — configuration."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str | None = None   # For storing review_outputs

    # LLM (Ollama)
    LLM_ENABLED:            bool  = True
    OLLAMA_BASE_URL:        str   = "http://ollama:11434"
    OLLAMA_MODEL:           str   = "deepseek-coder"
    OLLAMA_TIMEOUT_SECONDS: int   = 120
    OLLAMA_TEMPERATURE:     float = 0.1
    OLLAMA_NUM_PREDICT:     int   = 2048

    # Review config
    LLM_REVIEW_MAX_FINDINGS: int  = 4
    REVIEW_MAX_DIFF_CHARS:   int  = 8000
    REVIEW_MAX_CONTEXT_CHUNKS: int = 5


settings = Settings()
