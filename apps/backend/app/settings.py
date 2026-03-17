from pathlib import Path
import json

from pydantic_settings import BaseSettings, SettingsConfigDict


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
    CLEAN_CODE_RULE_ENGINE_ENABLED: bool = True
    CLEAN_CODE_FUNCTION_MAX_LINES: int = 30
    CLEAN_CODE_COMPLEXITY_WARN_THRESHOLD: int = 10
    CLEAN_CODE_DUPLICATION_MIN_LINES: int = 8
    CLEAN_CODE_FILE_MAX_LOGICAL_LINES: int = 400
    CLEAN_CODE_MAX_TOP_LEVEL_SYMBOLS: int = 12
    CLEAN_CODE_MAX_FINDINGS: int = 120
    CLEAN_CODE_EXCLUDED_REPOS: str | None = "AhmedAmineBejaoui/ai-code-review-platform,ai-code-review-platform"
    SECRETS_ENCRYPTION_KEY: str | None = None
    SECRETS_BOOTSTRAP_FROM_ENV: bool = True
    RBAC_ENFORCEMENT_ENABLED: bool = False
    CLERK_AUTH_ENABLED: bool = False
    CLERK_ISSUER_URL: str | None = None
    CLERK_JWKS_URL: str | None = None
    CLERK_AUDIENCE: str | None = None
    CLERK_JWT_LEEWAY_SECONDS: int = 10
    CLERK_ORGANIZATIONS_ENFORCED: bool = False
    ADMIN_EMAILS: str | None = None
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
    LANGCHAIN_ENABLED: bool = False
    LANGCHAIN_SHADOW_MODE: bool = True
    LANGCHAIN_PRIMARY_STACK: str = "legacy"
    LANGCHAIN_ALLOW_LEGACY_FALLBACK: bool = True
    LANGCHAIN_OLLAMA_BASE_URL: str | None = None
    LANGCHAIN_OLLAMA_CHAT_MODEL_PRIMARY: str = "deepseek-r1:8b"
    LANGCHAIN_OLLAMA_CHAT_MODEL_FALLBACK: str | None = None
    LANGCHAIN_OLLAMA_EMBEDDINGS_MODEL: str = "mxbai-embed-large"
    LANGCHAIN_QDRANT_COLLECTION_ALIAS_ACTIVE: str = "repo_context_langchain_active"
    LANGCHAIN_QDRANT_COLLECTION_ALIAS_SHADOW: str = "repo_context_langchain_shadow"
    LANGCHAIN_RAG_TIMEOUT_SECONDS: int = 45
    LANGCHAIN_COMPARE_OUTPUTS_ENABLED: bool = True
    LANGCHAIN_MAX_CONCURRENT_GENERATIONS: int = 1
    LANGCHAIN_MAX_CONCURRENT_EMBEDDINGS: int = 2
    LLM_REVIEW_FINDINGS_ENABLED: bool = True
    LLM_REVIEW_MAX_FINDINGS: int = 4
    REVIEW_INTELLIGENCE_ENABLED: bool = True
    REVIEW_INTELLIGENCE_REQUIRE_QDRANT: bool = True

    # ── Vector Store (Qdrant) ─────────────────────────────────────────────────
    QDRANT_ENABLED: bool = False
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_COLLECTION: str = "code_review_rules"
    QDRANT_REPO_CONTEXT_COLLECTION: str = "repo_context"
    QDRANT_API_KEY: str | None = None
    REPO_CONTEXT_VECTOR_SIZE: int = 256
    REPO_CONTEXT_CHUNK_SIZE: int = 1400
    REPO_CONTEXT_CHUNK_OVERLAP: int = 200
    REPO_CONTEXT_MAX_FILE_BYTES: int = 250_000
    REPO_CONTEXT_MAX_FILES_PER_RUN: int = 5000
    REPO_CONTEXT_ALLOWED_ROOTS: str | None = None
    REPO_CONTEXT_REPO_PATH_MAP: str | None = None
    KB_EXACT_TOP_K: int = 8
    KB_LEXICAL_TOP_K: int = 12
    KB_SEMANTIC_TOP_K: int = 12
    KB_RERANK_TOP_K: int = 8
    KB_CONTEXT_MAX_CHARS: int = 14_000
    KB_CONTEXT_MAX_CHUNKS: int = 8
    KB_CROSS_ENCODER_MODEL: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    KB_RERANK_ENABLED: bool = True

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

    @property
    def repo_context_allowed_roots(self) -> list[Path]:
        raw = self.REPO_CONTEXT_ALLOWED_ROOTS
        if raw is None or not raw.strip():
            return []

        roots: list[Path] = []
        for item in raw.split(","):
            cleaned = item.strip()
            if not cleaned:
                continue
            roots.append(Path(cleaned).expanduser().resolve())
        return roots

    @property
    def repo_context_repo_path_map(self) -> dict[str, str]:
        raw = self.REPO_CONTEXT_REPO_PATH_MAP
        if raw is None or not raw.strip():
            return {}
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            return {}
        if not isinstance(parsed, dict):
            return {}

        normalized: dict[str, str] = {}
        for key, value in parsed.items():
            if not isinstance(key, str) or not isinstance(value, str):
                continue
            repo_key = key.strip().lower()
            repo_path = value.strip()
            if not repo_key or not repo_path:
                continue
            normalized[repo_key] = repo_path
        return normalized

    @property
    def admin_emails(self) -> set[str]:
        raw = self.ADMIN_EMAILS
        if raw is None or not raw.strip():
            return set()
        return {item.strip().lower() for item in raw.split(",") if item.strip()}

    @property
    def clean_code_excluded_repos(self) -> set[str]:
        raw = self.CLEAN_CODE_EXCLUDED_REPOS
        if raw is None or not raw.strip():
            return set()
        return {item.strip().lower() for item in raw.split(",") if item.strip()}

    @property
    def langchain_enabled(self) -> bool:
        return self.LANGCHAIN_ENABLED

    @property
    def langchain_primary_stack(self) -> str:
        normalized = self.LANGCHAIN_PRIMARY_STACK.strip().lower()
        if normalized not in {"legacy", "langchain"}:
            return "legacy"
        return normalized

    @property
    def langchain_ollama_base_url(self) -> str:
        raw = self.LANGCHAIN_OLLAMA_BASE_URL
        if isinstance(raw, str) and raw.strip():
            return raw.strip()
        return self.OLLAMA_BASE_URL

    @property
    def langchain_qdrant_physical_collection(self) -> str:
        model_name = self.LANGCHAIN_OLLAMA_EMBEDDINGS_MODEL.strip().lower() or "default"
        sanitized = "".join(char if char.isalnum() else "_" for char in model_name).strip("_") or "default"
        return f"repo_context_lc_v1_{sanitized}"


settings = Settings()
