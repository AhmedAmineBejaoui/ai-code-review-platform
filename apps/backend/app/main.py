import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.errors import register_exception_handlers
from app.api.http import analyses, webhook_github
from app.data.database import close_db, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
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
    ],
)
register_exception_handlers(app)


@app.get("/healthz")
async def health():
    return {"status": "ok"}


app.include_router(webhook_github.router)
app.include_router(analyses.router)


@app.get("/__routes")
async def list_routes():
    return [{"path": getattr(r, "path", None), "methods": list(getattr(r, "methods", []))} for r in app.routes]
