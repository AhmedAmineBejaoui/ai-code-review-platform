"""Shared settings base.

Every service inherits from :class:`BaseServiceSettings` and reads from the
project root ``.env`` file (same convention as the legacy monolith).
Service-specific settings live next to each service.

The routing table for the API gateway lives here too so every service can
introspect where its peers listen — useful later for S2S calls.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Walk up until we find the repository root (the directory containing `.env`
# or the `apps/` folder). This matches the legacy backend's resolution logic.
def _find_repo_root() -> Path:
    here = Path(__file__).resolve()
    for parent in [here, *here.parents]:
        if (parent / ".env").exists() or (parent / "apps").is_dir():
            return parent
    return here.parent


REPO_ROOT = _find_repo_root()
ENV_FILE = REPO_ROOT / ".env"


class BaseServiceSettings(BaseSettings):
    """Baseline settings every service extends.

    Values are sourced from the repo-root ``.env`` (legacy convention) and
    overridable via real environment variables. Unknown keys are ignored so
    adding a variable for one service does not break another.
    """

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Identity ------------------------------------------------------
    service_name: str = "unnamed-service"
    environment: Literal["development", "staging", "production"] = "development"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"

    # --- Shared infra --------------------------------------------------
    database_url: str | None = Field(default=None, alias="DATABASE_URL")
    redis_url: str | None = Field(default=None, alias="REDIS_URL")

    # --- Auth (Clerk) --------------------------------------------------
    clerk_auth_enabled: bool = Field(default=False, alias="CLERK_AUTH_ENABLED")
    clerk_issuer_url: str | None = Field(default=None, alias="CLERK_ISSUER_URL")
    clerk_jwks_url: str | None = Field(default=None, alias="CLERK_JWKS_URL")
    clerk_secret_key: str | None = Field(default=None, alias="CLERK_SECRET_KEY")

    # --- Ports (central registry, shared by gateway + services) --------
    gateway_port: int = Field(default=8000, alias="GATEWAY_PORT")
    legacy_backend_port: int = Field(default=8100, alias="LEGACY_BACKEND_PORT")

    analysis_service_port: int = Field(default=8001, alias="ANALYSIS_SERVICE_PORT")
    kb_service_port: int = Field(default=8002, alias="KB_SERVICE_PORT")
    reviews_service_port: int = Field(default=8003, alias="REVIEWS_SERVICE_PORT")
    org_service_port: int = Field(default=8004, alias="ORG_SERVICE_PORT")
    config_service_port: int = Field(default=8005, alias="CONFIG_SERVICE_PORT")
    notifications_service_port: int = Field(default=8006, alias="NOTIFICATIONS_SERVICE_PORT")

    # Where each peer lives on the network. Hostnames default to localhost
    # for native dev; override in docker-compose via env vars.
    legacy_backend_host: str = Field(default="localhost", alias="LEGACY_BACKEND_HOST")
    analysis_service_host: str = Field(default="localhost", alias="ANALYSIS_SERVICE_HOST")
    kb_service_host: str = Field(default="localhost", alias="KB_SERVICE_HOST")
    reviews_service_host: str = Field(default="localhost", alias="REVIEWS_SERVICE_HOST")
    org_service_host: str = Field(default="localhost", alias="ORG_SERVICE_HOST")
    config_service_host: str = Field(default="localhost", alias="CONFIG_SERVICE_HOST")
    notifications_service_host: str = Field(default="localhost", alias="NOTIFICATIONS_SERVICE_HOST")

    # Gateway → upstream timeout (seconds).
    upstream_timeout_seconds: float = Field(default=60.0, alias="UPSTREAM_TIMEOUT_SECONDS")

    # --- Helpers -------------------------------------------------------
    @property
    def legacy_backend_url(self) -> str:
        return f"http://{self.legacy_backend_host}:{self.legacy_backend_port}"

    def service_url(self, name: str) -> str:
        """Return the base URL of a named service (e.g. ``"analysis"``)."""
        host = getattr(self, f"{name}_service_host")
        port = getattr(self, f"{name}_service_port")
        return f"http://{host}:{port}"


@lru_cache(maxsize=1)
def get_base_settings() -> BaseServiceSettings:
    return BaseServiceSettings()
