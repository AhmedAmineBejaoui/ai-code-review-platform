"""
Integration Service - Main FastAPI Application

Handles:
- GitHub webhooks
- Jira integration
- Slack notifications
- Microsoft Teams notifications
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import check_database_health
from .routes import github_router, jira_router, integrations_router

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
        "Integration Service starting on %s:%d",
        settings.HOST,
        settings.PORT,
    )
    
    # Check database connectivity
    if check_database_health():
        logger.info("Database connection successful")
    else:
        logger.warning("Database connection failed - some features may not work")
    
    yield
    
    logger.info("Integration Service shutting down")


app = FastAPI(
    title="AI Code Review Platform - Integration Service",
    description="GitHub webhooks, Jira, Slack, and Teams integrations",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ Health Endpoints ============

@app.get("/healthz", tags=["health"])
async def health_check():
    """Health check endpoint."""
    db_healthy = check_database_health()
    settings = get_settings()
    
    return {
        "status": "healthy" if db_healthy else "degraded",
        "service": "integration-service",
        "database": "connected" if db_healthy else "disconnected",
        "integrations": {
            "github": bool(settings.GITHUB_WEBHOOK_SECRET),
            "slack": settings.SLACK_ENABLED and bool(settings.SLACK_WEBHOOK_URL),
            "teams": settings.TEAMS_ENABLED and bool(settings.TEAMS_WEBHOOK_URL),
            "jira": settings.JIRA_ENABLED,
        },
    }


@app.get("/", tags=["health"])
async def root():
    """Root endpoint."""
    settings = get_settings()
    return {
        "service": "integration-service",
        "version": settings.SERVICE_VERSION,
        "status": "running",
    }


# ============ Include Routers ============

app.include_router(github_router)
app.include_router(jira_router)
app.include_router(integrations_router)


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
