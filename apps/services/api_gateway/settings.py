"""API-gateway-specific settings.

Only holds CORS config. Shared values (ports, hosts, auth, timeouts) come
from :class:`common.settings.BaseServiceSettings`.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field

from common.settings import BaseServiceSettings


class GatewaySettings(BaseServiceSettings):
    service_name: str = "api-gateway"

    # CORS — mirror the legacy monolith's defaults so the dashboard keeps working.
    cors_allowed_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
        ]
    )


@lru_cache(maxsize=1)
def get_gateway_settings() -> GatewaySettings:
    return GatewaySettings()
