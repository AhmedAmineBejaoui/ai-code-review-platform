import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
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
    project_comprehension,
    rag_query,
    review_queue,
    reviews,
    reviewer_metrics,
    webhook_github,
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
        {"name": "rag", "description": "RAG query and intelligent code analysis APIs."},
    ],
)
register_exception_handlers(app)
app.add_middleware(RateLimitMiddleware)

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
    return {"status": "ok"}


app.include_router(webhook_github.router)
app.include_router(analyses.router)
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
app.include_router(rag_query.router)


@app.get("/__routes")
async def list_routes():
    return [{"path": getattr(r, "path", None), "methods": list(getattr(r, "methods", []))} for r in app.routes]
