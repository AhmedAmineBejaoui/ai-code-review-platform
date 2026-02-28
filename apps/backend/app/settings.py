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
    API_DEFAULT_PAGE_SIZE: int = 20
    API_MAX_PAGE_SIZE: int = 100

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
