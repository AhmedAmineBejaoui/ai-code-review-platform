from __future__ import annotations

import asyncio
from functools import lru_cache

from fastapi import Depends, Header, HTTPException, status
from pydantic import BaseModel, Field

from app.data.repos.rbac_repo import RBACRepo
from app.settings import settings


class AuthenticatedPrincipal(BaseModel):
    user_id: str
    email: str
    display_name: str | None = None
    roles: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)


@lru_cache(maxsize=1)
def get_rbac_repo() -> RBACRepo:
    return RBACRepo()


async def get_current_principal(
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    repo: RBACRepo = Depends(get_rbac_repo),
) -> AuthenticatedPrincipal | None:
    if not settings.RBAC_ENFORCEMENT_ENABLED and not x_user_id:
        return None

    if not x_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing X-User-Id header")

    user = await asyncio.to_thread(repo.get_user, x_user_id.strip())
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="RBAC user is missing or inactive")

    return AuthenticatedPrincipal(
        user_id=user.id,
        email=user.email,
        display_name=user.display_name,
        roles=user.roles,
        permissions=user.permissions,
    )


def require_permission(permission_code: str):
    async def dependency(principal: AuthenticatedPrincipal | None = Depends(get_current_principal)) -> AuthenticatedPrincipal | None:
        if not settings.RBAC_ENFORCEMENT_ENABLED:
            return principal
        assert principal is not None
        if permission_code not in principal.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permission: {permission_code}",
            )
        return principal

    return dependency
