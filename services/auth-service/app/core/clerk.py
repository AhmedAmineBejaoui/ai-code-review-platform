"""
Auth Service — Clerk JWT validation core
─────────────────────────────────────────
MOVED FROM: apps/backend/app/api/middleware/auth.py
LOGIC:      Unchanged — only the import paths and cache wiring differ.

Validates a Clerk-issued JWT and returns a validated Principal dict.
Caches validated principals for PRINCIPAL_CACHE_TTL_SECONDS.
"""
from __future__ import annotations

import logging
import time
from typing import Any

from app.settings import settings

logger = logging.getLogger(__name__)

# ── Principal cache ───────────────────────────────────────────────────────────
# key: (user_id, org_id | None) → (principal_dict, expires_at)
_PRINCIPAL_CACHE: dict[tuple[str, str | None], tuple[dict[str, Any], float]] = {}
_CACHE_TTL  = settings.PRINCIPAL_CACHE_TTL_SECONDS
_CACHE_MAX  = settings.PRINCIPAL_CACHE_MAX_SIZE


def _cache_get(user_id: str, org_id: str | None) -> dict[str, Any] | None:
    entry = _PRINCIPAL_CACHE.get((user_id, org_id))
    if entry and time.monotonic() < entry[1]:
        return entry[0]
    _PRINCIPAL_CACHE.pop((user_id, org_id), None)
    return None


def _cache_set(user_id: str, org_id: str | None, principal: dict[str, Any]) -> None:
    if len(_PRINCIPAL_CACHE) >= _CACHE_MAX:
        # Simple eviction: remove oldest 10 %
        oldest = sorted(_PRINCIPAL_CACHE, key=lambda k: _PRINCIPAL_CACHE[k][1])
        for key in oldest[: _CACHE_MAX // 10]:
            _PRINCIPAL_CACHE.pop(key, None)
    _PRINCIPAL_CACHE[(user_id, org_id)] = (principal, time.monotonic() + _CACHE_TTL)


# ── JWT helpers ───────────────────────────────────────────────────────────────

def _fetch_jwks() -> dict[str, Any]:
    """Fetch JWKS from Clerk — cached in memory by PyJWT."""
    if not settings.CLERK_JWKS_URL:
        raise ValueError("CLERK_JWKS_URL is not configured")
    import requests
    resp = requests.get(settings.CLERK_JWKS_URL, timeout=10)
    resp.raise_for_status()
    return resp.json()


def _decode_jwt(token: str) -> dict[str, Any]:
    """Validate and decode a Clerk RS256 JWT. Raises on failure."""
    import jwt
    from jwt import PyJWKClient

    jwks_url = settings.CLERK_JWKS_URL
    if not jwks_url:
        raise ValueError("CLERK_JWKS_URL not configured")

    jwks_client = PyJWKClient(jwks_url)
    signing_key = jwks_client.get_signing_key_from_jwt(token)
    options: dict[str, Any] = {"leeway": settings.CLERK_JWT_LEEWAY_SECONDS}
    if settings.CLERK_AUDIENCE:
        options["audience"] = settings.CLERK_AUDIENCE

    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        options=options,
    )


def _extract_email(claims: dict[str, Any]) -> str:
    """Extract email from Clerk JWT claims (multiple possible locations)."""
    for key in ("email", "email_address"):
        if isinstance(claims.get(key), str) and claims[key].strip():
            return claims[key].strip()
    addrs = claims.get("email_addresses") or []
    for addr in addrs:
        if isinstance(addr, dict):
            for k in ("email", "email_address"):
                if isinstance(addr.get(k), str) and addr[k].strip():
                    return addr[k].strip()
    sub = claims.get("sub", "")
    return f"{sub}@clerk.local"


def _extract_role(claims: dict[str, Any]) -> str:
    """Extract role from publicMetadata / app_metadata / unsafe_metadata."""
    for meta_key in ("public_metadata", "publicMetadata", "app_metadata", "unsafe_metadata"):
        meta = claims.get(meta_key)
        if isinstance(meta, dict) and isinstance(meta.get("role"), str):
            return meta["role"].strip().lower()
    return "developer"


def _extract_org(claims: dict[str, Any]) -> tuple[str | None, str | None]:
    """Extract (org_id, org_role) from Clerk claims."""
    org_id   = claims.get("org_id") or claims.get("organization", {}).get("id")
    org_role = claims.get("org_role") or claims.get("organization", {}).get("role")
    return (str(org_id) if org_id else None), (str(org_role) if org_role else None)


def _normalize_role(role: str) -> str:
    aliases = {
        "administrator": "admin", "owner": "admin", "superadmin": "admin",
        "tech_lead": "reviewer_lead", "lead": "reviewer_lead",
        "senior": "reviewer_senior", "reviewer": "reviewer_senior",
        "junior": "reviewer_junior",
        "dev": "developer", "member": "developer",
        "read_only": "viewer", "guest": "viewer",
    }
    return aliases.get(role.lower().strip(), role.lower().strip())


# ── Public API ────────────────────────────────────────────────────────────────

def validate_token(token: str, *, rbac_repo: Any = None) -> dict[str, Any]:
    """
    Validate a Clerk JWT.
    Returns a Principal dict on success, raises on failure.

    This is the single source of truth for authentication in the system.
    The API Gateway calls this via POST /v1/auth/validate.
    """
    if not settings.CLERK_AUTH_ENABLED:
        # Dev/test mode: return a permissive principal
        return {
            "user_id":      "dev_user",
            "email":        "dev@local.test",
            "display_name": "Dev User",
            "roles":        ["developer"],
            "permissions":  ["analyses.read", "analyses.create"],
            "org_id":       None,
            "org_role":     None,
        }

    claims   = _decode_jwt(token)
    user_id  = claims.get("sub", "")
    email    = _extract_email(claims)
    org_id, org_role = _extract_org(claims)

    # ── Check principal cache ─────────────────────────────────────────────────
    cached = _cache_get(user_id, org_id)
    if cached:
        return cached

    # ── Extract & normalize role ──────────────────────────────────────────────
    raw_role = _extract_role(claims)
    role     = _normalize_role(raw_role)

    # ── Admin email elevation ─────────────────────────────────────────────────
    if email.strip().lower() in settings.admin_emails:
        role = "admin"

    # ── Build display_name ────────────────────────────────────────────────────
    display_name = (
        claims.get("name")
        or f"{claims.get('given_name', '')} {claims.get('family_name', '')}".strip()
        or claims.get("username")
        or email.split("@")[0]
    )

    # ── Resolve permissions from role (simplified map) ────────────────────────
    permissions = _permissions_for_role(role)

    # ── Sync to DB if rbac_repo is provided ───────────────────────────────────
    if rbac_repo is not None:
        try:
            rbac_repo.upsert_clerk_user(user_id, email, display_name, role)
            db_user = rbac_repo.get_user(user_id)
            if db_user:
                role        = db_user.roles[0] if db_user.roles else role
                permissions = db_user.permissions
        except Exception as exc:
            logger.warning("DB sync failed for user %s: %s", user_id, exc)

    principal: dict[str, Any] = {
        "user_id":      user_id,
        "email":        email,
        "display_name": display_name,
        "roles":        [role],
        "permissions":  permissions,
        "org_id":       org_id,
        "org_role":     org_role,
    }

    _cache_set(user_id, org_id, principal)
    return principal


def _permissions_for_role(role: str) -> list[str]:
    base = ["analyses.read"]
    mapping: dict[str, list[str]] = {
        "admin":           base + ["analyses.create", "analyses.write", "secrets.manage",
                                   "reviews.assign", "reviews.approve", "reviews.block"],
        "reviewer_lead":   base + ["analyses.create", "analyses.write",
                                   "reviews.assign", "reviews.approve", "reviews.block",
                                   "reviews.delegate"],
        "reviewer_senior": base + ["analyses.create", "analyses.write",
                                   "reviews.approve", "reviews.block"],
        "reviewer_junior": base + ["analyses.create", "reviews.approve"],
        "developer":       base + ["analyses.create"],
        "viewer":          base,
    }
    return mapping.get(role, base)
