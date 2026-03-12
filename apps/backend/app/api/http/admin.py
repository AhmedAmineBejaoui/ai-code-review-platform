from __future__ import annotations

import asyncio
import hashlib
import json
import secrets
import uuid
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, Depends, Path, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.api.errors import ApiError
from app.api.middleware.auth import AuthenticatedPrincipal, require_permission
from app.data.database import get_engine
from app.data.repos.analyses_repo import AnalysesRepo
from app.integrations.object_storage.s3_minio_client import S3MinioClient
from app.integrations.vector_store.qdrant_client import QdrantClient
from app.settings import settings
from app.workers.queue import QueueUnavailableError, enqueue_analysis_job
from app.workers.tasks.ingest_kb import run_repo_onboarding

router = APIRouter(prefix="/v1/admin", tags=["admin"])

_ADMIN_POLICY_REPO_KEY = "__admin_policy__"
_ADMIN_INTEGRATIONS_REPO_KEY = "__admin_integrations__"
_ADMIN_CI_TOKEN_REPO_KEY = "__admin_ci_token__"
_TOKEN_PREFIX_LEN = 12


class AdminUserUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["admin", "reviewer", "developer", "viewer"] | None = None
    isActive: bool | None = None


class PolicyRepoRule(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    repo: str = Field(min_length=1, max_length=255)
    severityProfile: Literal["strict", "moderate", "relaxed"] = "strict"


class AdminPolicyConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    failOnBlocker: bool = True
    maxComments: int = Field(default=50, ge=1, le=500)
    enabledCategories: dict[str, bool] = Field(
        default_factory=lambda: {
            "security": True,
            "performance": True,
            "quality": True,
            "maintainability": True,
        }
    )
    ignoredPaths: list[str] = Field(default_factory=list, max_length=200)
    repoRules: list[PolicyRepoRule] = Field(default_factory=list, max_length=100)


class AdminPoliciesUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    config: AdminPolicyConfig


class AdminPoliciesTestRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    target: str | None = Field(default=None, max_length=255)
    config: AdminPolicyConfig | None = None


class AdminIntegrationsUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ciEnabled: bool | None = None
    failOnBlocker: bool | None = None


class KnowledgeBaseReindexRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    repoId: str = Field(min_length=1, max_length=255)
    repoPath: str | None = Field(default=None, max_length=4096)


def _utc_iso_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _to_iso(value: Any) -> str | None:
    if isinstance(value, datetime):
        candidate = value
        if candidate.tzinfo is None:
            candidate = candidate.replace(tzinfo=timezone.utc)
        return candidate.isoformat().replace("+00:00", "Z")
    if value is None:
        return None
    text_value = str(value).strip()
    return text_value or None


def _as_json_object(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return {}
        if isinstance(parsed, dict):
            return parsed
    return {}


def _ensure_admin_access(
    principal: AuthenticatedPrincipal | None = Depends(require_permission("analyses.write")),
) -> AuthenticatedPrincipal:
    if principal is None:
        if settings.RBAC_ENFORCEMENT_ENABLED or settings.CLERK_AUTH_ENABLED:
            raise ApiError(
                status_code=401,
                code="UNAUTHORIZED",
                message="Missing authentication credentials",
            )
        return AuthenticatedPrincipal(
            user_id="local-admin",
            email="local-admin@example.local",
            roles=["admin"],
            permissions=["analyses.read", "analyses.create", "analyses.write", "secrets.manage"],
        )

    normalized_roles = {role.strip().lower() for role in principal.roles if isinstance(role, str)}
    if "admin" not in normalized_roles:
        raise ApiError(
            status_code=403,
            code="FORBIDDEN",
            message="Admin role required",
        )
    return principal


def _policy_defaults() -> dict[str, Any]:
    return {
        "failOnBlocker": True,
        "maxComments": 50,
        "enabledCategories": {
            "security": True,
            "performance": True,
            "quality": True,
            "maintainability": True,
        },
        "ignoredPaths": ["vendor/**", "node_modules/**", "dist/**", "build/**"],
        "repoRules": [],
    }


def _integration_defaults() -> dict[str, Any]:
    return {
        "ciEnabled": True,
        "failOnBlocker": True,
    }


def _load_versioned_settings(conn: Connection, repo_key: str, defaults: dict[str, Any]) -> tuple[dict[str, Any], int, str | None]:
    row = (
        conn.execute(
            text(
                """
                SELECT version, rules_json, created_at
                FROM policies
                WHERE repo = :repo
                ORDER BY version DESC
                LIMIT 1
                """
            ),
            {"repo": repo_key},
        )
        .mappings()
        .first()
    )
    if row is None:
        return dict(defaults), 0, None

    payload = _as_json_object(row.get("rules_json"))
    merged: dict[str, Any] = dict(defaults)
    merged.update(payload)
    version = int(row.get("version") or 0)
    created_at = _to_iso(row.get("created_at"))
    return merged, version, created_at


def _save_versioned_settings(conn: Connection, repo_key: str, payload: dict[str, Any], *, blocking_enabled: bool = False) -> tuple[int, str]:
    version_row = (
        conn.execute(
            text("SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM policies WHERE repo = :repo"),
            {"repo": repo_key},
        )
        .mappings()
        .first()
    )
    next_version = int(version_row["next_version"] if version_row is not None else 1)
    created_at = _utc_iso_now()
    conn.execute(
        text(
            """
            INSERT INTO policies (id, repo, version, blocking_enabled, rules_json, created_at)
            VALUES (:id, :repo, :version, :blocking_enabled, CAST(:rules_json AS jsonb), NOW())
            """
        ),
        {
            "id": f"policy_{uuid.uuid4().hex}",
            "repo": repo_key,
            "version": next_version,
            "blocking_enabled": blocking_enabled,
            "rules_json": json.dumps(payload),
        },
    )
    return next_version, created_at


def _insert_audit_log(
    conn: Connection,
    *,
    actor: str,
    action: str,
    target_type: str,
    target_id: str,
    meta: dict[str, Any] | None = None,
) -> None:
    conn.execute(
        text(
            """
            INSERT INTO audit_logs (id, actor, action, target_type, target_id, meta_json)
            VALUES (:id, :actor, :action, :target_type, :target_id, CAST(:meta_json AS jsonb))
            """
        ),
        {
            "id": f"audit_{uuid.uuid4().hex}",
            "actor": actor,
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "meta_json": json.dumps(meta or {}),
        },
    )


def _collect_admin_users(limit: int) -> dict[str, Any]:
    engine = get_engine()
    with engine.connect() as conn:
        users_rows = (
            conn.execute(
                text(
                    """
                    SELECT id, email, display_name, is_active, created_at
                    FROM users
                    ORDER BY created_at DESC
                    LIMIT :limit
                    """
                ),
                {"limit": limit},
            )
            .mappings()
            .all()
        )
        role_rows = (
            conn.execute(
                text(
                    """
                    SELECT ur.user_id, r.code
                    FROM user_roles ur
                    JOIN roles r ON r.id = ur.role_id
                    ORDER BY ur.user_id ASC, r.code ASC
                    """
                )
            )
            .mappings()
            .all()
        )
        permission_rows = (
            conn.execute(
                text(
                    """
                    SELECT ur.user_id, p.code
                    FROM user_roles ur
                    JOIN role_permissions rp ON rp.role_id = ur.role_id
                    JOIN permissions p ON p.id = rp.permission_id
                    ORDER BY ur.user_id ASC, p.code ASC
                    """
                )
            )
            .mappings()
            .all()
        )
        membership_rows = (
            conn.execute(
                text(
                    """
                    SELECT om.user_id, om.organization_id, om.role, om.status, o.name, o.slug
                    FROM organization_memberships om
                    JOIN organizations o ON o.id = om.organization_id
                    ORDER BY om.user_id ASC, o.name ASC
                    """
                )
            )
            .mappings()
            .all()
        )
        permissions_catalog_rows = (
            conn.execute(
                text(
                    """
                    SELECT
                        p.code,
                        p.description,
                        COUNT(DISTINCT ur.user_id) AS user_count
                    FROM permissions p
                    LEFT JOIN role_permissions rp ON rp.permission_id = p.id
                    LEFT JOIN user_roles ur ON ur.role_id = rp.role_id
                    GROUP BY p.code, p.description
                    ORDER BY p.code ASC
                    """
                )
            )
            .mappings()
            .all()
        )
        role_stat_rows = (
            conn.execute(
                text(
                    """
                    SELECT r.code, COUNT(DISTINCT ur.user_id) AS user_count
                    FROM roles r
                    LEFT JOIN user_roles ur ON ur.role_id = r.id
                    GROUP BY r.code
                    ORDER BY r.code ASC
                    """
                )
            )
            .mappings()
            .all()
        )
        total_row = (
            conn.execute(
                text(
                    """
                    SELECT
                        COUNT(*) AS total_users,
                        SUM(CASE WHEN is_active THEN 1 ELSE 0 END) AS active_users,
                        SUM(CASE WHEN is_active THEN 0 ELSE 1 END) AS inactive_users
                    FROM users
                    """
                )
            )
            .mappings()
            .first()
        )

    roles_by_user: dict[str, list[str]] = {}
    for row in role_rows:
        user_id = str(row["user_id"])
        roles_by_user.setdefault(user_id, []).append(str(row["code"]))

    permissions_by_user: dict[str, list[str]] = {}
    for row in permission_rows:
        user_id = str(row["user_id"])
        permissions_by_user.setdefault(user_id, []).append(str(row["code"]))

    memberships_by_user: dict[str, list[dict[str, Any]]] = {}
    for row in membership_rows:
        user_id = str(row["user_id"])
        memberships_by_user.setdefault(user_id, []).append(
            {
                "organizationId": str(row["organization_id"]),
                "organizationName": str(row["name"]),
                "organizationSlug": str(row["slug"]) if row.get("slug") else None,
                "role": str(row["role"]),
                "status": str(row["status"]),
            }
        )

    users: list[dict[str, Any]] = []
    for row in users_rows:
        user_id = str(row["id"])
        users.append(
            {
                "id": user_id,
                "email": str(row["email"]),
                "displayName": row.get("display_name"),
                "isActive": bool(row.get("is_active", False)),
                "createdAt": _to_iso(row.get("created_at")),
                "roles": sorted(set(roles_by_user.get(user_id, []))),
                "permissions": sorted(set(permissions_by_user.get(user_id, []))),
                "organizationMemberships": memberships_by_user.get(user_id, []),
            }
        )

    role_stats = {str(row["code"]): int(row.get("user_count") or 0) for row in role_stat_rows}

    return {
        "items": users,
        "permissions": [
            {
                "code": str(row["code"]),
                "description": str(row["description"]),
                "userCount": int(row.get("user_count") or 0),
            }
            for row in permissions_catalog_rows
        ],
        "stats": {
            "totalUsers": int((total_row or {}).get("total_users") or 0),
            "activeUsers": int((total_row or {}).get("active_users") or 0),
            "inactiveUsers": int((total_row or {}).get("inactive_users") or 0),
            "admins": role_stats.get("admin", 0),
            "reviewers": role_stats.get("reviewer", 0),
            "developers": role_stats.get("developer", 0),
            "viewers": role_stats.get("viewer", 0),
        },
    }


def _fetch_user_by_id(conn: Connection, user_id: str) -> dict[str, Any] | None:
    row = (
        conn.execute(
            text(
                """
                SELECT id, email, display_name, is_active, created_at
                FROM users
                WHERE id = :user_id
                LIMIT 1
                """
            ),
            {"user_id": user_id},
        )
        .mappings()
        .first()
    )
    if row is None:
        return None

    role_rows = (
        conn.execute(
            text(
                """
                SELECT r.code
                FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = :user_id
                ORDER BY r.code ASC
                """
            ),
            {"user_id": user_id},
        )
        .mappings()
        .all()
    )
    permission_rows = (
        conn.execute(
            text(
                """
                SELECT DISTINCT p.code
                FROM user_roles ur
                JOIN role_permissions rp ON rp.role_id = ur.role_id
                JOIN permissions p ON p.id = rp.permission_id
                WHERE ur.user_id = :user_id
                ORDER BY p.code ASC
                """
            ),
            {"user_id": user_id},
        )
        .mappings()
        .all()
    )
    membership_rows = (
        conn.execute(
            text(
                """
                SELECT om.organization_id, om.role, om.status, o.name, o.slug
                FROM organization_memberships om
                JOIN organizations o ON o.id = om.organization_id
                WHERE om.user_id = :user_id
                ORDER BY o.name ASC
                """
            ),
            {"user_id": user_id},
        )
        .mappings()
        .all()
    )
    return {
        "id": str(row["id"]),
        "email": str(row["email"]),
        "displayName": row.get("display_name"),
        "isActive": bool(row.get("is_active", False)),
        "createdAt": _to_iso(row.get("created_at")),
        "roles": [str(item["code"]) for item in role_rows],
        "permissions": [str(item["code"]) for item in permission_rows],
        "organizationMemberships": [
            {
                "organizationId": str(item["organization_id"]),
                "organizationName": str(item["name"]),
                "organizationSlug": str(item["slug"]) if item.get("slug") else None,
                "role": str(item["role"]),
                "status": str(item["status"]),
            }
            for item in membership_rows
        ],
    }


def _update_admin_user(user_id: str, payload: AdminUserUpdateRequest, actor_id: str) -> dict[str, Any]:
    engine = get_engine()
    with engine.begin() as conn:
        existing = _fetch_user_by_id(conn, user_id)
        if existing is None:
            raise ApiError(
                status_code=404,
                code="USER_NOT_FOUND",
                message="User not found",
                details={"user_id": user_id},
            )

        if payload.isActive is not None:
            conn.execute(
                text("UPDATE users SET is_active = :is_active WHERE id = :user_id"),
                {"is_active": payload.isActive, "user_id": user_id},
            )

        if payload.role is not None:
            role_row = (
                conn.execute(
                    text("SELECT id FROM roles WHERE code = :code LIMIT 1"),
                    {"code": payload.role},
                )
                .mappings()
                .first()
            )
            if role_row is None:
                raise ApiError(
                    status_code=400,
                    code="ROLE_NOT_FOUND",
                    message="Role is not defined",
                    details={"role": payload.role},
                )
            conn.execute(
                text(
                    """
                    DELETE FROM user_roles
                    WHERE user_id = :user_id
                      AND role_id IN (SELECT id FROM roles WHERE is_system = TRUE)
                    """
                ),
                {"user_id": user_id},
            )
            conn.execute(
                text(
                    """
                    INSERT INTO user_roles (id, user_id, role_id)
                    VALUES (:id, :user_id, :role_id)
                    ON CONFLICT (user_id, role_id) DO NOTHING
                    """
                ),
                {
                    "id": f"ur_{uuid.uuid4().hex}",
                    "user_id": user_id,
                    "role_id": str(role_row["id"]),
                },
            )

        _insert_audit_log(
            conn,
            actor=actor_id,
            action="admin.user.update",
            target_type="user",
            target_id=user_id,
            meta={
                "role": payload.role,
                "isActive": payload.isActive,
            },
        )

        updated = _fetch_user_by_id(conn, user_id)
        if updated is None:
            raise ApiError(
                status_code=404,
                code="USER_NOT_FOUND",
                message="User not found",
                details={"user_id": user_id},
            )
        return updated
