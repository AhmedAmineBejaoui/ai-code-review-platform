"""
Proxy middleware for forwarding requests to downstream services.
"""

import logging
from typing import Optional

import httpx
from fastapi import Request, Response
from starlette.background import BackgroundTask

from .config import get_settings
from .routing import RouteConfig, find_route, get_service_url

logger = logging.getLogger(__name__)


class ProxyClient:
    """HTTP client for proxying requests to downstream services."""
    
    def __init__(self):
        self.settings = get_settings()
        self._client: Optional[httpx.AsyncClient] = None
    
    async def get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(
                    connect=self.settings.CONNECT_TIMEOUT,
                    read=self.settings.PROXY_TIMEOUT,
                    write=self.settings.PROXY_TIMEOUT,
                    pool=self.settings.PROXY_TIMEOUT,
                ),
                follow_redirects=True,
            )
        return self._client
    
    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None


# Global proxy client instance
proxy_client = ProxyClient()


async def proxy_request(
    request: Request,
    route_config: RouteConfig,
    user_id: Optional[str] = None,
) -> Response:
    """
    Proxy a request to the downstream service.
    
    Args:
        request: The incoming FastAPI request
        route_config: The route configuration for this request
        user_id: Optional authenticated user ID to pass to downstream service
    
    Returns:
        Response from the downstream service
    """
    settings = get_settings()
    client = await proxy_client.get_client()
    
    # Build the target URL
    service_url = get_service_url(route_config.service, settings)
    path = request.url.path
    
    # Optionally strip prefix
    if route_config.strip_prefix:
        path = path[len(route_config.prefix):]
        if not path.startswith("/"):
            path = "/" + path
    
    # Include query string
    target_url = f"{service_url}{path}"
    if request.url.query:
        target_url = f"{target_url}?{request.url.query}"
    
    # Build headers, forwarding most but setting some gateway-specific ones
    headers = dict(request.headers)
    
    # Remove hop-by-hop headers
    hop_by_hop = ["connection", "keep-alive", "transfer-encoding", "te", "trailer", "upgrade"]
    for h in hop_by_hop:
        headers.pop(h, None)
    
    # Add gateway headers
    headers["X-Forwarded-For"] = request.client.host if request.client else "unknown"
    headers["X-Forwarded-Proto"] = request.url.scheme
    headers["X-Forwarded-Host"] = request.url.hostname or "localhost"
    headers["X-Gateway-Service"] = "api-gateway"
    
    # Add authenticated user info if available
    if user_id:
        headers["X-User-ID"] = user_id
    
    # Get request body
    body = await request.body()
    
    logger.debug(
        "Proxying %s %s -> %s",
        request.method,
        request.url.path,
        target_url,
    )
    
    try:
        # Make the proxy request
        response = await client.request(
            method=request.method,
            url=target_url,
            headers=headers,
            content=body,
        )
        
        # Build response headers, excluding hop-by-hop headers
        response_headers = {}
        for key, value in response.headers.items():
            if key.lower() not in hop_by_hop + ["content-encoding", "content-length"]:
                response_headers[key] = value
        
        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=response_headers,
            media_type=response.headers.get("content-type"),
        )
        
    except httpx.TimeoutException:
        logger.error("Timeout proxying to %s", target_url)
        return Response(
            content='{"error": "Service timeout", "detail": "The downstream service did not respond in time"}',
            status_code=504,
            media_type="application/json",
        )
    except httpx.ConnectError:
        logger.error("Connection error proxying to %s", target_url)
        return Response(
            content='{"error": "Service unavailable", "detail": "Could not connect to downstream service"}',
            status_code=503,
            media_type="application/json",
        )
    except Exception as e:
        logger.exception("Error proxying to %s: %s", target_url, str(e))
        return Response(
            content='{"error": "Internal gateway error", "detail": "An unexpected error occurred"}',
            status_code=502,
            media_type="application/json",
        )
