"""
Shared configuration module for all microservices.
Each service imports this and extends with service-specific settings.
"""

import os
from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class BaseServiceSettings(BaseSettings):
    """Base settings shared across all microservices."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
    
    # Service identification
    SERVICE_NAME: str = "base-service"
    SERVICE_VERSION: str = "1.0.0"
    
    # Database
    DATABASE_URL: str = "postgresql+psycopg://postgres:simplepass@localhost:5432/ai_code_review_platform"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Service URLs for inter-service communication
    AUTH_SERVICE_URL: str = "http://localhost:4001"
    ANALYSIS_SERVICE_URL: str = "http://localhost:4002"
    PROJECT_SERVICE_URL: str = "http://localhost:4003"
    REVIEW_SERVICE_URL: str = "http://localhost:4004"
    INTEGRATION_SERVICE_URL: str = "http://localhost:4005"
    AI_SERVICE_URL: str = "http://localhost:4006"
    NOTIFICATION_SERVICE_URL: str = "http://localhost:4007"
    SECURITY_SERVICE_URL: str = "http://localhost:4008"
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
    ]


class ServiceClient:
    """HTTP client for inter-service communication."""
    
    def __init__(self, base_url: str, timeout: float = 30.0):
        import httpx
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None
    
    async def _get_client(self) -> "httpx.AsyncClient":
        import httpx
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=self.timeout,
            )
        return self._client
    
    async def get(self, path: str, **kwargs):
        client = await self._get_client()
        response = await client.get(path, **kwargs)
        response.raise_for_status()
        return response.json()
    
    async def post(self, path: str, **kwargs):
        client = await self._get_client()
        response = await client.post(path, **kwargs)
        response.raise_for_status()
        return response.json()
    
    async def put(self, path: str, **kwargs):
        client = await self._get_client()
        response = await client.put(path, **kwargs)
        response.raise_for_status()
        return response.json()
    
    async def delete(self, path: str, **kwargs):
        client = await self._get_client()
        response = await client.delete(path, **kwargs)
        response.raise_for_status()
        return response.json()
    
    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None
