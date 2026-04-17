"""
API Gateway - Main FastAPI Application

This is the single entry point for all API requests. It:
1. Authenticates requests using Clerk JWT
2. Applies rate limiting
3. Routes requests to appropriate microservices
4. Handles CORS
5. Provides health checks and observability
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .routing import find_route, ROUTES, ServiceName
from .proxy import proxy_request, proxy_client
from .auth import authenticate_request
from .rate_limit import rate_limiter

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    settings = get_settings()
    logger.info(
        "API Gateway starting on %s:%d",
        settings.HOST,
        settings.PORT,
    )
    logger.info("Auth enabled: %s", settings.CLERK_AUTH_ENABLED)
    logger.info("Rate limiting enabled: %s", settings.RATE_LIMIT_ENABLED)
    
    yield
    
    # Cleanup
    await proxy_client.close()
    logger.info("API Gateway shutting down")


app = FastAPI(
    title="AI Code Review Platform - API Gateway",
    description="Unified API Gateway for the AI Code Review Platform microservices",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS Configuration
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Type",
        "Authorization",
        "X-API-Key",
        "X-Requested-With",
    ],
    expose_headers=["Content-Type", "X-Total-Count", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
    max_age=3600,
)


# ============ Health & Status Endpoints ============

@app.get("/healthz", tags=["health"])
async def health_check():
    """
    Gateway health check.
    Returns the status of the gateway and connectivity to downstream services.
    """
    settings = get_settings()
    
    services_status = {}
    
    # Check each service health (basic connectivity)
    import httpx
    async with httpx.AsyncClient(timeout=5.0) as client:
        service_urls = {
            "auth": settings.AUTH_SERVICE_URL,
            "analysis": settings.ANALYSIS_SERVICE_URL,
            "project": settings.PROJECT_SERVICE_URL,
            "review": settings.REVIEW_SERVICE_URL,
            "integration": settings.INTEGRATION_SERVICE_URL,
            "ai": settings.AI_SERVICE_URL,
            "notification": settings.NOTIFICATION_SERVICE_URL,
            "security": settings.SECURITY_SERVICE_URL,
        }
        
        for name, url in service_urls.items():
            try:
                response = await client.get(f"{url}/healthz")
                services_status[name] = "healthy" if response.status_code == 200 else "degraded"
            except Exception:
                services_status[name] = "unavailable"
    
    # Determine overall status
    healthy_count = sum(1 for s in services_status.values() if s == "healthy")
    total_count = len(services_status)
    
    if healthy_count == total_count:
        overall_status = "healthy"
    elif healthy_count > 0:
        overall_status = "degraded"
    else:
        overall_status = "unhealthy"
    
    return {
        "status": overall_status,
        "gateway": "healthy",
        "services": services_status,
    }


@app.get("/", tags=["health"])
async def root():
    """Root endpoint - basic gateway info."""
    return {
        "service": "api-gateway",
        "version": settings.SERVICE_VERSION,
        "status": "running",
    }


@app.get("/__routes", tags=["debug"])
async def list_routes():
    """List all configured routes (debug endpoint)."""
    return [
        {
            "prefix": route.prefix,
            "service": route.service.value,
            "require_auth": route.require_auth,
        }
        for route in ROUTES
    ]


@app.get("/metrics", tags=["observability"])
async def metrics():
    """Prometheus-compatible metrics endpoint."""
    # Basic metrics - can be expanded with prometheus_client
    return Response(
        content="# HELP gateway_requests_total Total requests processed\n# TYPE gateway_requests_total counter\ngateway_requests_total 0\n",
        media_type="text/plain",
    )


# ============ Catch-All Proxy Handler ============

@app.api_route(
    "/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
    include_in_schema=False,
)
async def proxy_handler(request: Request, path: str):
    """
    Catch-all handler that proxies requests to downstream services.
    """
    full_path = f"/{path}"
    
    # Find matching route
    route_config = find_route(full_path)
    
    if not route_config:
        return JSONResponse(
            status_code=404,
            content={
                "error": "Not Found",
                "detail": f"No service configured for path: {full_path}",
            },
        )
    
    # Authentication
    user_id = None
    if route_config.require_auth:
        is_authenticated, user_id, claims = await authenticate_request(request)
        
        settings = get_settings()
        if settings.CLERK_AUTH_ENABLED and not is_authenticated:
            return JSONResponse(
                status_code=401,
                content={
                    "error": "Unauthorized",
                    "detail": "Missing or invalid authentication credentials",
                },
            )
    
    # Rate limiting
    allowed, remaining, reset_time = await rate_limiter.check_rate_limit(
        request,
        user_id=user_id,
        limit_override=route_config.rate_limit_override,
    )
    
    if not allowed:
        return JSONResponse(
            status_code=429,
            content={
                "error": "Too Many Requests",
                "detail": "Rate limit exceeded. Please retry later.",
            },
            headers={
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(reset_time),
                "Retry-After": str(reset_time - int(__import__("time").time())),
            },
        )
    
    # Proxy the request
    response = await proxy_request(request, route_config, user_id)
    
    # Add rate limit headers
    if remaining >= 0:
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_time)
    
    return response


# ============ Entry Point ============

if __name__ == "__main__":
    import uvicorn
    
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
