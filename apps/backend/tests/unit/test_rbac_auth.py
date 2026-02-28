from __future__ import annotations

import asyncio

import pytest
from fastapi import HTTPException

from app.api.middleware.auth import AuthenticatedPrincipal, get_current_principal, require_permission
from app.data.models.rbac import RBACUser
from app.settings import settings


class _FakeRBACRepo:
    def __init__(self, user: RBACUser | None) -> None:
        self._user = user

    def get_user(self, user_id: str) -> RBACUser | None:
        if self._user and self._user.id == user_id:
            return self._user
        return None


def test_get_current_principal_is_optional_when_rbac_disabled() -> None:
    old = settings.RBAC_ENFORCEMENT_ENABLED
    settings.RBAC_ENFORCEMENT_ENABLED = False
    try:
        principal = asyncio.run(get_current_principal(x_user_id=None, repo=_FakeRBACRepo(None)))
        assert principal is None
    finally:
        settings.RBAC_ENFORCEMENT_ENABLED = old


def test_get_current_principal_requires_header_when_rbac_enabled() -> None:
    old = settings.RBAC_ENFORCEMENT_ENABLED
    settings.RBAC_ENFORCEMENT_ENABLED = True
    try:
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(get_current_principal(x_user_id=None, repo=_FakeRBACRepo(None)))
        assert exc_info.value.status_code == 401
    finally:
        settings.RBAC_ENFORCEMENT_ENABLED = old


def test_require_permission_rejects_missing_permission() -> None:
    old = settings.RBAC_ENFORCEMENT_ENABLED
    settings.RBAC_ENFORCEMENT_ENABLED = True
    checker = require_permission("analyses.write")
    principal = AuthenticatedPrincipal(
        user_id="u1",
        email="u1@example.com",
        roles=["viewer"],
        permissions=["analyses.read"],
    )
    try:
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(checker(principal=principal))
        assert exc_info.value.status_code == 403
    finally:
        settings.RBAC_ENFORCEMENT_ENABLED = old
