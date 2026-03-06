from __future__ import annotations

import asyncio
from functools import lru_cache
from typing import Any

import jwt
from fastapi import Depends, Header, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError, PyJWKClient
from pydantic import BaseModel, Field

from app.data.repos.rbac_repo import RBACRepo
from app.settings import settings


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
    "superadmin": "admin",
    "super-admin": "admin",
    "super_admin": "admin",
    "reviewer": "reviewer",
    "review": "reviewer",
    "code-reviewer": "reviewer",
    "code_reviewer": "reviewer",
    "developer": "developer",
    "dev": "developer",
    "member": "developer",
    "user": "developer",
    "viewer": "developer",
}

_ROLE_PERMISSIONS: dict[str, set[str]] = {
    "admin": {"analyses.read", "analyses.create", "analyses.write", "secrets.manage"},
    "reviewer": {"analyses.read", "analyses.create", "analyses.write"},
    "developer": {"analyses.read", "analyses.create"},
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
    return _ROLE_ALIASES.get(value.strip().lower(), "developer")


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

    email = _extract_email_from_claims(claims)
    if email == "unknown@example.local":
        email = f"{user_id}@clerk.local"
    display_name = _extract_display_name_from_claims(claims)
    roles = _extract_roles(claims)
    primary_role = roles[0] if roles else "developer"
    org_id, org_slug, org_name, org_role = _extract_org_context_from_claims(claims)

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

        return AuthenticatedPrincipal(
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

    permissions = _permissions_for_roles(roles)
    return AuthenticatedPrincipal(
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
