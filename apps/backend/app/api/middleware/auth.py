from __future__ import annotations

import asyncio
import time
from functools import lru_cache
from typing import Any

import jwt
from fastapi import Depends, Header, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError, PyJWKClient
from pydantic import BaseModel, Field

from app.data.repos.rbac_repo import RBACRepo
from app.settings import settings


# TTL cache for authenticated principals to avoid DB calls on every request
# Key: (user_id, org_id), Value: (AuthenticatedPrincipal, timestamp)
_principal_cache: dict[tuple[str, str | None], tuple["AuthenticatedPrincipal", float]] = {}
_PRINCIPAL_CACHE_TTL_SECONDS = 60  # Cache principals for 60 seconds


def _get_cached_principal(user_id: str, org_id: str | None) -> "AuthenticatedPrincipal | None":
    """Get cached principal if still valid."""
    key = (user_id, org_id)
    if key in _principal_cache:
        principal, cached_at = _principal_cache[key]
        if time.time() - cached_at < _PRINCIPAL_CACHE_TTL_SECONDS:
            return principal
        # Expired, remove from cache
        del _principal_cache[key]
    return None


def _cache_principal(user_id: str, org_id: str | None, principal: "AuthenticatedPrincipal") -> None:
    """Cache principal with current timestamp."""
    key = (user_id, org_id)
    _principal_cache[key] = (principal, time.time())
    # Simple cache size limit - clear oldest entries if too large
    if len(_principal_cache) > 10000:
        # Remove oldest 20% of entries
        sorted_entries = sorted(_principal_cache.items(), key=lambda x: x[1][1])
        for k, _ in sorted_entries[:2000]:
            del _principal_cache[k]


class AuthenticatedPrincipal(BaseModel):
    user_id: str
    email: str
    display_name: str | None = None
    roles: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)
    org_id: str | None = None
    org_slug: str | None = None
    org_name: str | None = None
    org_role: str | None = None


_bearer_scheme = HTTPBearer(auto_error=False)

_ROLE_ALIASES: dict[str, str] = {
    "admin": "admin",
    "administrator": "admin",
    "owner": "admin",
    "superadmin": "admin",
    "super-admin": "admin",
    "super_admin": "admin",
    # Tech Lead role
    "tech_lead": "tech_lead",
    "tech-lead": "tech_lead",
    "techlead": "tech_lead",
    "lead": "tech_lead",
    "team_lead": "tech_lead",
    "team-lead": "tech_lead",
    # Reviewer levels
    "reviewer_lead": "reviewer_lead",
    "reviewer-lead": "reviewer_lead",
    "lead_reviewer": "reviewer_lead",
    "lead-reviewer": "reviewer_lead",
    "reviewer_senior": "reviewer_senior",
    "reviewer-senior": "reviewer_senior",
    "senior_reviewer": "reviewer_senior",
    "senior-reviewer": "reviewer_senior",
    "reviewer_junior": "reviewer_junior",
    "reviewer-junior": "reviewer_junior",
    "junior_reviewer": "reviewer_junior",
    "junior-reviewer": "reviewer_junior",
    # Generic reviewer (maps to senior by default for backward compatibility)
    "reviewer": "reviewer_senior",
    "review": "reviewer_senior",
    "code-reviewer": "reviewer_senior",
    "code_reviewer": "reviewer_senior",
    # Developer
    "developer": "developer",
    "dev": "developer",
    "member": "developer",
    "user": "developer",
    "viewer": "developer",
}

_ROLE_PERMISSIONS: dict[str, set[str]] = {
    "admin": {
        # Core permissions
        "analyses.read", "analyses.create", "analyses.write", "secrets.manage",
        # All review permissions
        "reviews.assign", "reviews.claim", "reviews.delegate", "reviews.approve",
        "reviews.block", "reviews.warn", "reviews.override", "reviews.bulk_action",
        "reviews.request_changes", "reviews.suggest_changes", "reviews.escalate",
        # All collaboration permissions
        "comments.create", "comments.read", "comments.resolve", "comments.edit", "comments.reply",
        "threads.create", "threads.participate", "threads.moderate",
        # All assignment permissions
        "assignments.view_own", "assignments.view_all", "assignments.create", "assignments.modify",
        # All metrics permissions
        "metrics.read_self", "metrics.read_team", "metrics.read_all",
        # Template permissions
        "templates.create", "templates.use",
        # Project settings permissions (Admin can read/write/audit)
        "project_settings.read", "project_settings.write", "project_settings.audit",
    },
    "tech_lead": {
        # Core permissions
        "analyses.read", "analyses.create", "analyses.write",
        # Advanced review permissions (same as reviewer_lead)
        "reviews.assign", "reviews.claim", "reviews.delegate", "reviews.approve",
        "reviews.block", "reviews.warn", "reviews.override", "reviews.bulk_action",
        "reviews.request_changes", "reviews.escalate",
        # Collaboration permissions
        "comments.create", "comments.read", "comments.resolve", "comments.edit",
        "threads.create", "threads.moderate",
        # Assignment permissions
        "assignments.view_all", "assignments.create", "assignments.modify",
        # Metrics permissions
        "metrics.read_self", "metrics.read_team",
        # Template permissions
        "templates.create", "templates.use",
        # Project settings permissions (Tech Lead can read/write/audit)
        "project_settings.read", "project_settings.write", "project_settings.audit",
    },
    "reviewer_lead": {
        # Core permissions
        "analyses.read", "analyses.create", "analyses.write",
        # Advanced review permissions
        "reviews.assign", "reviews.claim", "reviews.delegate", "reviews.approve",
        "reviews.block", "reviews.warn", "reviews.override", "reviews.bulk_action",
        "reviews.request_changes", "reviews.escalate",
        # Collaboration permissions
        "comments.create", "comments.read", "comments.resolve", "comments.edit",
        "threads.create", "threads.moderate",
        # Assignment permissions
        "assignments.view_all", "assignments.create", "assignments.modify",
        # Metrics permissions
        "metrics.read_self", "metrics.read_team",
        # Template permissions
        "templates.create", "templates.use",
        # Project settings permissions (Reviewer Lead can read only)
        "project_settings.read",
    },
    "reviewer_senior": {
        # Core permissions
        "analyses.read", "analyses.create", "analyses.write",
        # Review permissions (can block)
        "reviews.approve", "reviews.block", "reviews.warn",
        "reviews.claim", "reviews.request_changes",
        # Collaboration permissions
        "comments.create", "comments.read", "comments.resolve",
        "threads.create", "threads.participate",
        # Assignment permissions
        "assignments.view_own",
        # Metrics permissions
        "metrics.read_self",
        # Template permissions
        "templates.use",
    },
    "reviewer_junior": {
        # Core permissions
        "analyses.read", "analyses.create", "analyses.write",
        # Review permissions (cannot block)
        "reviews.approve", "reviews.warn", "reviews.claim", "reviews.suggest_changes",
        # Collaboration permissions
        "comments.create", "comments.read",
        "threads.participate",
        # Assignment permissions
        "assignments.view_own",
        # Metrics permissions
        "metrics.read_self",
    },
    "developer": {
        "analyses.read", "analyses.create",
        # Basic collaboration
        "comments.read", "comments.reply",
        "threads.participate",
        # Project settings permissions (Developer can read only)
        "project_settings.read",
    },
}


@lru_cache(maxsize=1)
def get_rbac_repo() -> RBACRepo:
    return RBACRepo()


@lru_cache(maxsize=1)
def get_clerk_jwk_client() -> PyJWKClient:
    issuer = (settings.CLERK_ISSUER_URL or "").rstrip("/")
    jwks_url = settings.CLERK_JWKS_URL or (f"{issuer}/.well-known/jwks.json" if issuer else "")
    if not jwks_url:
        raise RuntimeError("CLERK_JWKS_URL or CLERK_ISSUER_URL must be configured when CLERK_AUTH_ENABLED=true")
    return PyJWKClient(jwks_url)


def _is_auth_enforced() -> bool:
    return settings.RBAC_ENFORCEMENT_ENABLED or settings.CLERK_AUTH_ENABLED


def _first_non_empty_string(*values: Any) -> str | None:
    for value in values:
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _normalize_role(value: Any) -> str:
    if not isinstance(value, str):
        return "developer"
    normalized = value.strip().lower()
    if normalized.startswith("org:"):
        normalized = normalized.removeprefix("org:")
    return _ROLE_ALIASES.get(normalized, "developer")


def _extract_dict(parent: dict[str, Any], *keys: str) -> dict[str, Any]:
    for key in keys:
        candidate = parent.get(key)
        if isinstance(candidate, dict):
            return candidate
    return {}


def _extract_roles(claims: dict[str, Any]) -> list[str]:
    metadata = _extract_dict(claims, "metadata")
    public_metadata = _extract_dict(claims, "public_metadata", "publicMetadata")
    app_metadata = _extract_dict(claims, "app_metadata", "appMetadata")
    unsafe_metadata = _extract_dict(claims, "unsafe_metadata", "unsafeMetadata")

    candidates: list[Any] = [
        claims.get("role"),
        claims.get("org_role"),
        metadata.get("role"),
        public_metadata.get("role"),
        app_metadata.get("role"),
        unsafe_metadata.get("role"),
    ]

    raw_roles = claims.get("roles")
    if isinstance(raw_roles, list):
        candidates.extend(raw_roles)

    roles: list[str] = []
    for candidate in candidates:
        if not isinstance(candidate, str) or not candidate.strip():
            continue
        normalized = _normalize_role(candidate)
        if normalized not in roles:
            roles.append(normalized)

    return roles or ["developer"]


def _normalize_org_role(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    normalized = value.strip().lower()
    if not normalized:
        return None
    if normalized.startswith("org:"):
        normalized = normalized.removeprefix("org:")
    if normalized in {"owner", "admin", "member"}:
        return normalized
    if normalized in {"basic_member", "basic-member", "contributor", "developer", "dev"}:
        return "member"
    return None


def _extract_org_context_from_claims(claims: dict[str, Any]) -> tuple[str | None, str | None, str | None, str | None]:
    org_block = _extract_dict(claims, "organization", "org", "org_data")
    org_id = _first_non_empty_string(
        claims.get("org_id"),
        claims.get("organization_id"),
        org_block.get("id"),
    )
    org_slug = _first_non_empty_string(
        claims.get("org_slug"),
        claims.get("organization_slug"),
        org_block.get("slug"),
    )
    org_name = _first_non_empty_string(
        claims.get("org_name"),
        claims.get("organization_name"),
        org_block.get("name"),
        org_slug,
        org_id,
    )
    org_role = _normalize_org_role(
        _first_non_empty_string(
            claims.get("org_role"),
            claims.get("organization_role"),
            org_block.get("role"),
        )
    )
    return org_id, org_slug, org_name, org_role


def _permissions_for_roles(roles: list[str]) -> list[str]:
    permissions: set[str] = set()
    for role in roles:
        permissions.update(_ROLE_PERMISSIONS.get(role, _ROLE_PERMISSIONS["developer"]))
    return sorted(permissions)


def _apply_admin_email_override(email: str, roles: list[str]) -> list[str]:
    normalized_email = email.strip().lower()
    if not normalized_email or normalized_email not in settings.admin_emails:
        return roles

    elevated_roles = ["admin"]
    for role in roles:
        if role != "admin":
            elevated_roles.append(role)
    return elevated_roles


def _decode_clerk_jwt(token: str) -> dict[str, Any]:
    signing_key = get_clerk_jwk_client().get_signing_key_from_jwt(token)

    issuer = (settings.CLERK_ISSUER_URL or "").rstrip("/") or None
    audience = settings.CLERK_AUDIENCE.strip() if settings.CLERK_AUDIENCE else None
    options = {"verify_aud": audience is not None}

    payload = jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        audience=audience,
        issuer=issuer,
        options=options,
        leeway=settings.CLERK_JWT_LEEWAY_SECONDS,
    )
    if not isinstance(payload, dict):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Clerk token payload")
    return payload


def _extract_email_from_claims(claims: dict[str, Any]) -> str:
    direct = _first_non_empty_string(claims.get("email"), claims.get("email_address"))
    if direct:
        return direct

    addresses = claims.get("email_addresses")
    if isinstance(addresses, list):
        for candidate in addresses:
            if isinstance(candidate, dict):
                nested = _first_non_empty_string(candidate.get("email_address"), candidate.get("email"))
                if nested:
                    return nested

    return "unknown@example.local"


def _is_placeholder_email(email: str | None) -> bool:
    if not isinstance(email, str):
        return True
    normalized = email.strip().lower()
    if not normalized:
        return True
    return normalized == "unknown@example.local" or normalized.endswith("@clerk.local")


def _extract_display_name_from_claims(claims: dict[str, Any]) -> str | None:
    return _first_non_empty_string(
        claims.get("name"),
        claims.get("username"),
        " ".join(
            item
            for item in [claims.get("given_name"), claims.get("family_name")]
            if isinstance(item, str) and item.strip()
        ),
    )


async def _build_principal_from_clerk_token(token: str, repo: RBACRepo) -> AuthenticatedPrincipal:
    try:
        claims = await asyncio.to_thread(_decode_clerk_jwt, token)
    except InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Clerk token") from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unable to validate Clerk token") from exc

    user_id = _first_non_empty_string(claims.get("sub"), claims.get("user_id"), claims.get("uid"))
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Clerk token missing subject")

    org_id, org_slug, org_name, org_role = _extract_org_context_from_claims(claims)
    
    # Check cache first to avoid DB calls on every request
    cached_principal = _get_cached_principal(user_id, org_id)
    if cached_principal is not None:
        return cached_principal

    existing_user = await asyncio.to_thread(repo.get_user, user_id)
    email_from_claims = _extract_email_from_claims(claims)
    if _is_placeholder_email(email_from_claims):
        if existing_user is not None and not _is_placeholder_email(existing_user.email):
            email = existing_user.email.strip().lower()
        else:
            email = f"{user_id}@clerk.local"
    else:
        email = email_from_claims.strip().lower()
    display_name = _extract_display_name_from_claims(claims)
    roles = _extract_roles(claims)
    roles = _apply_admin_email_override(email, roles)
    primary_role = roles[0] if roles else "developer"

    await asyncio.to_thread(repo.upsert_clerk_user, user_id, email, display_name, primary_role)
    if org_id:
        await asyncio.to_thread(
            repo.upsert_organization_membership,
            user_id,
            org_id,
            org_name or org_id,
            org_slug,
            org_role,
        )

    user = await asyncio.to_thread(repo.get_user, user_id)
    if user is not None:
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="RBAC user is inactive")

        resolved_org_name = org_name
        if org_id and not resolved_org_name:
            membership = next(
                (item for item in user.organization_memberships if item.organization_id == org_id and item.status == "active"),
                None,
            )
            if membership is not None:
                resolved_org_name = membership.organization_name

        principal = AuthenticatedPrincipal(
            user_id=user.id,
            email=user.email or email,
            display_name=user.display_name or display_name,
            roles=user.roles,
            permissions=user.permissions,
            org_id=org_id,
            org_slug=org_slug,
            org_name=resolved_org_name,
            org_role=org_role,
        )
        _cache_principal(user_id, org_id, principal)
        return principal

    permissions = _permissions_for_roles(roles)
    principal = AuthenticatedPrincipal(
        user_id=user_id,
        email=email,
        display_name=display_name,
        roles=roles,
        permissions=permissions,
        org_id=org_id,
        org_slug=org_slug,
        org_name=org_name,
        org_role=org_role,
    )
    _cache_principal(user_id, org_id, principal)
    return principal


async def get_current_principal(
    authorization: HTTPAuthorizationCredentials | None = Security(_bearer_scheme),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    repo: RBACRepo = Depends(get_rbac_repo),
) -> AuthenticatedPrincipal | None:
    if authorization is not None:
        if authorization.scheme.lower() != "bearer":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unsupported authorization scheme")
        token = authorization.credentials.strip()
        if not token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Empty bearer token")
        return await _build_principal_from_clerk_token(token, repo)

    if not _is_auth_enforced() and not x_user_id:
        return None

    if not x_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authentication credentials")

    user = await asyncio.to_thread(repo.get_user, x_user_id.strip())
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="RBAC user is missing or inactive")

    return AuthenticatedPrincipal(
        user_id=user.id,
        email=user.email,
        display_name=user.display_name,
        roles=user.roles,
        permissions=user.permissions,
        org_id=None,
        org_slug=None,
        org_name=None,
        org_role=None,
    )


def require_permission(permission_code: str):
    async def dependency(principal: AuthenticatedPrincipal | None = Depends(get_current_principal)) -> AuthenticatedPrincipal | None:
        if not _is_auth_enforced():
            return principal

        if principal is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authentication credentials")

        if settings.CLERK_ORGANIZATIONS_ENFORCED and not principal.org_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization context is required for this action",
            )

        if permission_code not in principal.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permission: {permission_code}",
            )
        return principal

    return dependency


def enforce_permission(principal: AuthenticatedPrincipal | None, permission_code: str) -> None:
    """Inline permission check — use when you already have the principal instance."""
    if not _is_auth_enforced():
        return
    if principal is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    if permission_code not in (principal.permissions or []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Missing required permission: {permission_code}",
        )
