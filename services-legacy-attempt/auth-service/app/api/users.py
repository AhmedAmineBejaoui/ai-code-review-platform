"""
Auth Service — /v1/users + /v1/rbac + /v1/admin/users routes
──────────────────────────────────────────────────────────────
MOVED FROM: apps/backend/app/api/http/admin.py  (user management section)
LOGIC:      Unchanged — same SQL queries via RBACRepo.
"""
from __future__ import annotations

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.data.rbac_repo import get_rbac_repo
from shared.errors import ApiError

router = APIRouter(tags=["users"])


# ── GET /v1/users ─────────────────────────────────────────────────────────────
@router.get("/v1/admin/users")
async def list_users(limit: int = Query(default=250, le=500)) -> dict:
    repo  = get_rbac_repo()
    users = repo.list_users(limit=limit)
    return {"items": [_user_to_dict(u) for u in users]}


# ── GET /v1/admin/users/{id} ──────────────────────────────────────────────────
@router.get("/v1/admin/users/{user_id}")
async def get_user(user_id: str) -> dict:
    repo = get_rbac_repo()
    user = repo.get_user(user_id)
    if user is None:
        raise ApiError(status_code=404, code="USER_NOT_FOUND", message="User not found")
    return {"item": _user_to_dict(user)}


# ── PATCH /v1/admin/users/{id} ────────────────────────────────────────────────
class UserUpdateRequest(BaseModel):
    role:     str | None  = None
    isActive: bool | None = None


@router.patch("/v1/admin/users/{user_id}")
async def update_user(user_id: str, body: UserUpdateRequest) -> dict:
    repo = get_rbac_repo()
    user = repo.get_user(user_id)
    if user is None:
        raise ApiError(status_code=404, code="USER_NOT_FOUND", message="User not found")

    if body.role is not None:
        # Validate role code exists in DB
        valid_roles = {"admin", "reviewer_lead", "reviewer_senior", "reviewer_junior",
                       "reviewer", "developer", "viewer"}
        if body.role not in valid_roles:
            raise ApiError(status_code=400, code="ROLE_NOT_FOUND",
                           message=f"Role '{body.role}' is not defined")
        repo.update_user_role(user_id, body.role)

    if body.isActive is not None:
        repo.update_user_active(user_id, body.isActive)

    updated = repo.get_user(user_id)
    return {"item": _user_to_dict(updated)}


# ── helpers ───────────────────────────────────────────────────────────────────
def _user_to_dict(user: object) -> dict:
    return {
        "id":          getattr(user, "id", ""),
        "email":       getattr(user, "email", ""),
        "displayName": getattr(user, "display_name", None),
        "isActive":    getattr(user, "is_active", True),
        "roles":       getattr(user, "roles", []),
        "permissions": getattr(user, "permissions", []),
    }
