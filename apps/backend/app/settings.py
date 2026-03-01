from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


_SETTINGS_PATH = Path(__file__).resolve()
_ENV_FILES: list[str] = []
for parent_index in (3, 1):
    if len(_SETTINGS_PATH.parents) > parent_index:
        _ENV_FILES.append(str(_SETTINGS_PATH.parents[parent_index] / ".env"))
_ENV_FILES.append(".env")
_ENV_FILES = list(dict.fromkeys(_ENV_FILES))

class Settings(BaseSettings):
    env: str = "dev"
    GITHUB_WEBHOOK_SECRET: str = "c153311a45d393520b58f26f53963ce2e581e098cc8f909033f64e1e009a6434"
    GITHUB_APP_ID: str | None = None
    GITHUB_APP_INSTALLATION_ID: str | None = None
    GITHUB_APP_PRIVATE_KEY_PEM: str | None = None
    GITHUB_API_BASE_URL: str = "https://api.github.com"
    REDIS_URL: str | None = None
    CELERY_BROKER_URL: str | None = None
    CELERY_RESULT_BACKEND: str | None = None
    CELERY_TASK_ALWAYS_EAGER: bool = False
    CELERY_TASK_EAGER_PROPAGATES: bool = True
    CELERY_WORKER_POOL: str | None = None
    ANALYSIS_QUEUE_NAME: str = "analyses"
    DATABASE_URL: str | None = None
    MAX_DIFF_BYTES: int = 2_000_000  # 2 MB
    SECRET_SCAN_ENABLED: bool = True
    SECRET_SCAN_ENTROPY_THRESHOLD: float = 3.8
    SECRET_SCAN_MIN_TOKEN_LEN: int = 20
    SECRET_SCAN_MAX_FINDINGS: int = 200
    PURGE_RAW_DIFF_AFTER_REDACTION: bool = True
    ALLOW_UNSAFE_DIFF_API: bool = False
    STATIC_ANALYSIS_ENABLED: bool = True
    STATIC_ANALYSIS_RUFF_ENABLED: bool = True
    STATIC_ANALYSIS_SEMGREP_ENABLED: bool = True
    STATIC_ANALYSIS_TIMEOUT_SECONDS: int = 60
    STATIC_ANALYSIS_MAX_FILES: int = 200
    STATIC_ANALYSIS_MAX_FINDINGS: int = 200
    STATIC_ANALYSIS_WORKSPACE_PATH: str = "."
    STATIC_ANALYSIS_AUTO_CHECKOUT_ENABLED: bool = True
    STATIC_ANALYSIS_REPO_HOST: str = "github.com"
    STATIC_ANALYSIS_GIT_TOKEN: str | None = None
    STATIC_ANALYSIS_CHECKOUT_TIMEOUT_SECONDS: int = 45
    STATIC_ANALYSIS_CHECKOUT_BASE_PATH: str | None = None
    STATIC_ANALYSIS_FILTER_CHANGED_LINES: bool = True
    SECRETS_ENCRYPTION_KEY: str | None = None
    SECRETS_BOOTSTRAP_FROM_ENV: bool = True
    RBAC_ENFORCEMENT_ENABLED: bool = False
    API_DEFAULT_PAGE_SIZE: int = 20
    API_MAX_PAGE_SIZE: int = 100

    # ── LLM Integration (OpenAI) ──────────────────────────────────────────────
    LLM_ENABLED: bool = False
    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_MAX_TOKENS: int = 2048
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "deepseek-r1:8b"
    OLLAMA_TIMEOUT_SECONDS: int = 60
    OLLAMA_TEMPERATURE: float = 0.2
    OLLAMA_NUM_PREDICT: int = 400

    # ── Vector Store (Qdrant) ─────────────────────────────────────────────────
    QDRANT_ENABLED: bool = False
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_COLLECTION: str = "code_review_rules"
    QDRANT_API_KEY: str | None = None

    # ── Object Storage (MinIO / S3) ───────────────────────────────────────────
    OBJECT_STORAGE_ENABLED: bool = False
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "ai-review-artifacts"
    MINIO_SECURE: bool = False

    model_config = SettingsConfigDict(env_file=tuple(_ENV_FILES), extra="ignore")

    @property
    def resolved_celery_broker_url(self) -> str | None:
        if self.CELERY_TASK_ALWAYS_EAGER:
            return "memory://"
        return self.CELERY_BROKER_URL or self.REDIS_URL

    @property
    def resolved_celery_result_backend(self) -> str | None:
        if self.CELERY_TASK_ALWAYS_EAGER:
            return "cache+memory://"
        return self.CELERY_RESULT_BACKEND or self.REDIS_URL


settings = Settings()
