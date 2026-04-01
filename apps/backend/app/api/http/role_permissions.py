"""
Role Permissions API endpoints for dynamic permission management.
Allows admins to enable/disable permissions for specific roles.
"""
from __future__ import annotations

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict

from app.api.dependencies.auth import get_current_user_optional
from app.data.repos.rbac_repo import RBACRepo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/roles", tags=["role-permissions"])


# ─── Request/Response Models ──────────────────────────────────────────────────


class PermissionDetail(BaseModel):
    id: str
    role_id: str
    permission_id: str
    permission_code: str
    permission_description: str
    enabled: bool
    updated_at: str | None = None
    updated_by: str | None = None


class RoleWithPermissions(BaseModel):
    id: str
    code: str
    label: str
    is_system: bool
    permissions: List[PermissionDetail]


class AllRolesPermissionsResponse(BaseModel):
    roles: List[RoleWithPermissions]
    total_roles: int
    total_permissions: int


class RolePermissionsResponse(BaseModel):
    role_id: str
    role_code: str | None = None
    permissions: List[PermissionDetail]
    total: int


class TogglePermissionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    enabled: bool
    reason: str | None = None


class TogglePermissionResponse(BaseModel):
    success: bool
    permission: PermissionDetail


# ─── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/permissions", response_model=AllRolesPermissionsResponse)
async def get_all_roles_with_permissions(
    _user: dict | None = Depends(get_current_user_optional),
):
    """Get all roles with their permissions (including enabled/disabled status).
    
    This is the main endpoint for the admin UI to manage role permissions.
    """
    repo = RBACRepo()
    roles = repo.get_all_roles_with_permissions()
    
    total_permissions = sum(len(role.get("permissions", [])) for role in roles)
    
    return AllRolesPermissionsResponse(
        roles=[
            RoleWithPermissions(
                id=role["id"],
                code=role["code"],
                label=role["label"],
                is_system=role["is_system"],
                permissions=[
                    PermissionDetail(
                        id=str(p.get("id", "")),
                        role_id=str(p.get("role_id", "")),
                        permission_id=str(p.get("permission_id", "")),
                        permission_code=str(p.get("permission_code", "")),
                        permission_description=str(p.get("permission_description", "")),
                        enabled=bool(p.get("enabled", False)),
                        updated_at=str(p.get("updated_at")) if p.get("updated_at") else None,
                        updated_by=p.get("updated_by"),
                    )
                    for p in role.get("permissions", [])
                ],
            )
            for role in roles
        ],
        total_roles=len(roles),
        total_permissions=total_permissions,
    )


@router.get("/{role_id}/permissions", response_model=RolePermissionsResponse)
async def get_role_permissions(
    role_id: str,
    include_disabled: bool = False,
    _user: dict | None = Depends(get_current_user_optional),
):
    """Get all permissions for a specific role.
    
    Args:
        role_id: The role ID
        include_disabled: If True, include disabled permissions (default: False)
    """
    repo = RBACRepo()
    permissions = repo.get_role_permissions(role_id, include_disabled=include_disabled)
    
    return RolePermissionsResponse(
        role_id=role_id,
        permissions=[
            PermissionDetail(
                id=str(p.get("id", "")),
                role_id=str(p.get("role_id", "")),
                permission_id=str(p.get("permission_id", "")),
                permission_code=str(p.get("permission_code", "")),
                permission_description=str(p.get("permission_description", "")),
                enabled=bool(p.get("enabled", False)),
                updated_at=str(p.get("updated_at")) if p.get("updated_at") else None,
                updated_by=p.get("updated_by"),
            )
            for p in permissions
        ],
        total=len(permissions),
    )


@router.patch(
    "/{role_id}/permissions/{permission_id}/toggle",
    response_model=TogglePermissionResponse,
)
async def toggle_role_permission(
    role_id: str,
    permission_id: str,
    request: TogglePermissionRequest,
    _user: dict | None = Depends(get_current_user_optional),
):
    """Toggle a permission for a role (enable/disable).
    
    This allows admins to dynamically control which permissions each role has.
    
    Args:
        role_id: The role ID
        permission_id: The permission ID
        request: Toggle request with enabled status and optional reason
    """
    repo = RBACRepo()
    
    # Get current user ID for audit trail
    updated_by = "system"
    if _user and isinstance(_user, dict):
        updated_by = _user.get("user_id") or _user.get("id") or "system"
    
    result = repo.toggle_role_permission(
        role_id=role_id,
        permission_id=permission_id,
        enabled=request.enabled,
        updated_by=updated_by,
        reason=request.reason,
    )
    
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role-permission mapping not found for role {role_id} and permission {permission_id}",
        )
    
    return TogglePermissionResponse(
        success=True,
        permission=PermissionDetail(
            id=result.get("id", ""),
            role_id=result.get("role_id", ""),
            permission_id=result.get("permission_id", ""),
            permission_code=result.get("permission_code", ""),
            permission_description=result.get("permission_description", ""),
            enabled=result.get("enabled", False),
            updated_at=str(result.get("updated_at")) if result.get("updated_at") else None,
            updated_by=result.get("updated_by"),
        ),
    )


@router.post("/{role_id}/permissions/{permission_id}/enable")
async def enable_role_permission(
    role_id: str,
    permission_id: str,
    reason: str | None = None,
    _user: dict | None = Depends(get_current_user_optional),
):
    """Convenience endpoint to enable a permission for a role."""
    return await toggle_role_permission(
        role_id=role_id,
        permission_id=permission_id,
        request=TogglePermissionRequest(enabled=True, reason=reason),
        _user=_user,
    )


@router.post("/{role_id}/permissions/{permission_id}/disable")
async def disable_role_permission(
    role_id: str,
    permission_id: str,
    reason: str | None = None,
    _user: dict | None = Depends(get_current_user_optional),
):
    """Convenience endpoint to disable a permission for a role."""
    return await toggle_role_permission(
        role_id=role_id,
        permission_id=permission_id,
        request=TogglePermissionRequest(enabled=False, reason=reason),
        _user=_user,
    )
