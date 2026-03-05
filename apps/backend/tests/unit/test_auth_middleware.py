from __future__ import annotations

import asyncio

import pytest
from fastapi import HTTPException

from app.api.middleware import auth as auth_middleware
from app.data.models.rbac import RBACUser


def test_extract_roles_defaults_to_developer() -> None:
    assert auth_middleware._extract_roles({}) == ["developer"]


def test_extract_roles_normalizes_aliases() -> None:
    claims = {
        "metadata": {"role": "reviewer"},
        "roles": ["dev", "admin"],
    }

    roles = auth_middleware._extract_roles(claims)
    assert "reviewer" in roles
    assert "developer" in roles
    assert "admin" in roles


def test_permissions_for_roles_union() -> None:
    permissions = auth_middleware._permissions_for_roles(["developer", "reviewer"])
    assert permissions == ["analyses.create", "analyses.read", "analyses.write"]


def test_require_permission_rejects_missing_permission_when_auth_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(auth_middleware.settings, "RBAC_ENFORCEMENT_ENABLED", False)
    monkeypatch.setattr(auth_middleware.settings, "CLERK_AUTH_ENABLED", True)

    principal = auth_middleware.AuthenticatedPrincipal(
        user_id="user_123",
        email="dev@example.com",
        roles=["developer"],
        permissions=["analyses.read"],
    )

    dependency = auth_middleware.require_permission("analyses.write")

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(dependency(principal=principal))

    assert exc_info.value.status_code == 403


def test_require_permission_is_noop_when_auth_not_enforced(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(auth_middleware.settings, "RBAC_ENFORCEMENT_ENABLED", False)
    monkeypatch.setattr(auth_middleware.settings, "CLERK_AUTH_ENABLED", False)

    dependency = auth_middleware.require_permission("analyses.read")
    result = asyncio.run(dependency(principal=None))
    assert result is None


def test_build_principal_from_clerk_token_upserts_local_user(monkeypatch: pytest.MonkeyPatch) -> None:
    claims = {
        "sub": "user_test_123",
        "email": "new.user@example.com",
        "name": "New User",
        "role": "reviewer",
    }

    class _Repo:
        def __init__(self) -> None:
            self.upsert_calls: list[tuple[str, str, str | None, str]] = []

        def upsert_clerk_user(self, user_id: str, email: str, display_name: str | None, clerk_role: str) -> None:
            self.upsert_calls.append((user_id, email, display_name, clerk_role))

        def get_user(self, user_id: str) -> RBACUser | None:
            assert user_id == "user_test_123"
            return RBACUser(
                id=user_id,
                email="new.user@example.com",
                display_name="New User",
                is_active=True,
                roles=["reviewer"],
                permissions=["analyses.read", "analyses.create", "analyses.write"],
            )

    repo = _Repo()

    monkeypatch.setattr(auth_middleware, "_decode_clerk_jwt", lambda token: claims)

    principal = asyncio.run(auth_middleware._build_principal_from_clerk_token("token", repo))  # type: ignore[arg-type]

    assert repo.upsert_calls == [("user_test_123", "new.user@example.com", "New User", "reviewer")]
    assert principal.user_id == "user_test_123"
    assert principal.roles == ["reviewer"]
