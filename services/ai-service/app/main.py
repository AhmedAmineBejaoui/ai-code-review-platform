"""
AI Service - Main FastAPI Application

Handles:
- Knowledge Base management
- RAG queries and context retrieval
- RAG evaluation and benchmarking
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import check_database_health
from .routes import knowledge_base_router, rag_query_router, rag_evaluation_router

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
        "AI Service starting on %s:%d",
        settings.HOST,
        settings.PORT,
    )
    
    # Check database connectivity
    if check_database_health():
        logger.info("Database connection successful")
    else:
        logger.warning("Database connection failed - some features may not work")
    
    # Log configuration
    logger.info(f"Qdrant enabled: {settings.QDRANT_ENABLED}")
    logger.info(f"Neo4j enabled: {settings.NEO4J_ENABLED}")
    logger.info(f"LLM enabled: {settings.LLM_ENABLED}")
    logger.info(f"RAG agents enabled: {settings.RAG_AGENTS_ENABLED}")
    
    yield
    
    logger.info("AI Service shutting down")


app = FastAPI(
    title="AI Code Review Platform - AI Service",
    description="Knowledge Base, RAG queries, and AI-powered analysis",
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
        "service": "ai-service",
        "database": "connected" if db_healthy else "disconnected",
        "features": {
            "qdrant": settings.QDRANT_ENABLED,
            "neo4j": settings.NEO4J_ENABLED,
            "llm": settings.LLM_ENABLED,
            "rag_agents": settings.RAG_AGENTS_ENABLED,
        },
    }


@app.get("/", tags=["health"])
async def root():
    """Root endpoint."""
    settings = get_settings()
    return {
        "service": "ai-service",
        "version": settings.SERVICE_VERSION,
        "status": "running",
    }


# ============ Include Routers ============

app.include_router(knowledge_base_router)
app.include_router(rag_query_router)
app.include_router(rag_evaluation_router)


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
