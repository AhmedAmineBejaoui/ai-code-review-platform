"""
Project Service - Main FastAPI Application

Handles:
- Projects management
- Repositories management
- Branches management
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import check_database_health
from .routes import projects, repositories, branches

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
        "Project Service starting on %s:%d",
        settings.HOST,
        settings.PORT,
    )
    
    # Check database connectivity
    if check_database_health():
        logger.info("Database connection successful")
    else:
        logger.warning("Database connection failed - some features may not work")
    
    yield
    
    logger.info("Project Service shutting down")


app = FastAPI(
    title="AI Code Review Platform - Project Service",
    description="Projects, repositories, and branches management",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Configuration
settings = get_settings()
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
    
    return {
        "status": "healthy" if db_healthy else "degraded",
        "service": "project-service",
        "database": "connected" if db_healthy else "disconnected",
    }


@app.get("/", tags=["health"])
async def root():
    """Root endpoint."""
    return {
        "service": "project-service",
        "version": settings.SERVICE_VERSION,
        "status": "running",
    }


# ============ Include Routers ============

app.include_router(projects.router)
app.include_router(repositories.router)
app.include_router(branches.router)


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
