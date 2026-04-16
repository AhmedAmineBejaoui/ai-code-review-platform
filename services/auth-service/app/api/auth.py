"""
Auth Service — /v1/auth routes
────────────────────────────────
POST /v1/auth/validate   ← called by API Gateway on every request
POST /v1/auth/sync       ← syncs Clerk user data to PostgreSQL
"""
from __future__ import annotations

import logging

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.clerk import validate_token
from shared.errors import ApiError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/auth", tags=["auth"])


class ValidateRequest(BaseModel):
    token: str


class SyncRequest(BaseModel):
    user_id:      str
    email:        str
    display_name: str | None = None
    role:         str        = "developer"
    org_id:       str | None = None
    org_slug:     str | None = None
    org_name:     str | None = None
    org_role:     str | None = None


@router.post("/validate")
async def validate(body: ValidateRequest) -> dict:
    """
    Validate a Clerk JWT and return a Principal.
    Called by the API Gateway AuthMiddleware on every authenticated request.
    """
    try:
        from app.data.rbac_repo import get_rbac_repo
        principal = validate_token(body.token, rbac_repo=get_rbac_repo())
        return principal
    except Exception as exc:
        logger.warning("Token validation failed: %s", exc)
        raise ApiError(status_code=401, code="INVALID_TOKEN", message=str(exc)) from exc


@router.post("/sync", status_code=204)
async def sync(body: SyncRequest) -> None:
    """
    Sync a Clerk user's data (role, email, display_name) to PostgreSQL.
    Called by the dashboard after sign-in to ensure DB is up to date.
    """
    from app.data.rbac_repo import get_rbac_repo
    try:
        repo = get_rbac_repo()
        repo.upsert_clerk_user(
            body.user_id,
            body.email,
            body.display_name,
            body.role,
        )
    except Exception as exc:
        logger.error("Sync failed for user %s: %s", body.user_id, exc)
        raise ApiError(status_code=500, code="SYNC_FAILED", message=str(exc)) from exc
