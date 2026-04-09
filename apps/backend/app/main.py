import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.errors import register_exception_handlers
from app.api.middleware.rate_limit import RateLimitMiddleware
from app.api.http import (
    admin,
    analyses,
    branch_policies,
    branch_protection,
    branches,
    internal_analysis_engine,
    knowledge_base,
    notifications,
    object_storage,
    project_comprehension,
    project_settings,
    project_roles,
    projects,
    rag_feedback,
    rag_query,
    repositories,
    reviewer_metrics,
    review_queue,
    reviews,
    role_permissions,
    security,
    statistics,
    teams,
    webhook_github,
    integrations,
)
from app.core.security.secret_store import get_secret_store
from app.data.database import close_db, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    get_secret_store().bootstrap_from_env()
    logger = logging.getLogger(__name__)
    # Print registered routes to help debug 404s from external webhooks.
    try:
        routes = []
        for route in app.routes:
            methods = getattr(route, "methods", None)
            path = getattr(route, "path", None)
            routes.append({"path": path, "methods": list(methods) if methods else None})
        logger.info("Registered routes: %s", routes)
    except Exception:
        pass
    yield
    close_db()


app = FastAPI(
    title="AI Code Review Backend",
    version="1.0.0",
    lifespan=lifespan,
    openapi_tags=[
        {"name": "analyses", "description": "Analysis intake and read APIs."},
        {"name": "branches", "description": "Branch management and operations APIs."},
        {"name": "branch-protection", "description": "Branch protection rules and validation APIs."},
        {"name": "branch-policies", "description": "Organization-level branch policies for naming, workflow, and merge strategies."},
        {"name": "reviews", "description": "Review management, assignments, comments, and change requests APIs."},
        {"name": "knowledge-base", "description": "Repo context onboarding and retrieval APIs."},
        {"name": "projects", "description": "Project comprehension and context management APIs."},
        {"name": "project-settings", "description": "Project settings including auto-analysis toggle management."},
        {"name": "rag", "description": "RAG query and intelligent code analysis APIs."},
    ],
)
register_exception_handlers(app)
app.add_middleware(RateLimitMiddleware)

# ─── CORS Configuration ────────────────────────────────────────────────────────
# Allow requests from frontend (Next.js running on localhost:3000 or :3001)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
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
    expose_headers=["Content-Type", "X-Total-Count"],
    max_age=3600,
)

# ─── Prometheus metrics ────────────────────────────────────────────────────────
# Exposes /metrics endpoint for Prometheus scraping.
# Called before include_router so all routes are instrumented.
Instrumentator(
    should_group_status_codes=True,
    should_ignore_untemplated=True,
    excluded_handlers=["/metrics", "/healthz", "/__routes"],
).instrument(app).expose(app, include_in_schema=False, tags=["observability"])


@app.get("/healthz")
async def health():
    """Health check endpoint with service status."""
    from app.integrations.object_storage.s3_minio_client import get_minio_client
    from app.settings import settings

    services = {
        "api": "ok",
    }

    # Check MinIO health if enabled
    if settings.OBJECT_STORAGE_ENABLED:
        try:
            minio_health = get_minio_client().health_check()
            services["minio"] = minio_health.get("status", "unknown")
        except Exception:
            services["minio"] = "error"

    # Check Qdrant health if enabled
    if settings.QDRANT_ENABLED:
        services["qdrant"] = "configured"

    overall_status = "ok" if all(
        s in ("ok", "healthy", "configured", "disabled")
        for s in services.values()
    ) else "degraded"

    return {"status": overall_status, "services": services}


app.include_router(webhook_github.router)
app.include_router(analyses.router, prefix="/v1")
app.include_router(branches.router)
app.include_router(branch_protection.router)
app.include_router(branch_policies.router)
app.include_router(reviews.router)
app.include_router(review_queue.router)
app.include_router(reviewer_metrics.router)
app.include_router(notifications.router)
app.include_router(knowledge_base.router)
app.include_router(admin.router)
app.include_router(internal_analysis_engine.router)
app.include_router(project_comprehension.router)
app.include_router(project_settings.router, prefix="/api/v1", tags=["project-settings"])
app.include_router(rag_feedback.router)
app.include_router(rag_query.router)
app.include_router(repositories.router)
app.include_router(projects.router)
app.include_router(statistics.router)
app.include_router(security.router)
app.include_router(teams.router)
app.include_router(object_storage.router)
app.include_router(integrations.router)
app.include_router(project_roles.router)
app.include_router(role_permissions.router)


@app.get("/__routes")
async def list_routes():
    return [{"path": getattr(r, "path", None), "methods": list(getattr(r, "methods", []))} for r in app.routes]
