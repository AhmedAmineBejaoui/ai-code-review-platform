"""
Organizations API routes.
"""

import logging
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel, Field

from ..database import get_engine
from ..repositories import OrganizationsRepo, UsersRepo

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/organizations", tags=["organizations"])


# ============ Request/Response Models ============

class CreateOrganizationRequest(BaseModel):
    clerk_organization_id: str = Field(..., min_length=1, max_length=255)
    name: str = Field(..., min_length=1, max_length=255)
    slug: str | None = Field(None, max_length=255)


class UpdateOrganizationRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    slug: str | None = Field(None, max_length=255)


class AddMemberRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=255)
    role: Literal["admin", "reviewer", "developer"] = Field(default="developer")
    status: Literal["active", "invited", "revoked"] = Field(default="active")


class UpdateMemberRequest(BaseModel):
    role: Literal["admin", "reviewer", "developer"] | None = None
    status: Literal["active", "invited", "revoked"] | None = None


# ============ Helper Functions ============

def _to_iso(dt: Any) -> str | None:
    if dt is None:
        return None
    if hasattr(dt, "isoformat"):
        return dt.isoformat()
    return str(dt)


def _map_platform_role_to_db_role(platform_role: str) -> str:
    mapping = {
        "admin": "admin",
        "reviewer": "member",
        "developer": "member",
    }
    return mapping.get(platform_role, "member")


def get_orgs_repo() -> OrganizationsRepo:
    return OrganizationsRepo(get_engine())


def get_users_repo() -> UsersRepo:
    return UsersRepo(get_engine())


# ============ Organization Endpoints ============

@router.post("")
async def create_organization(
    request: CreateOrganizationRequest,
    repo: OrganizationsRepo = Depends(get_orgs_repo),
):
    """Create a new organization."""
    org = repo.create_organization(
        org_id=request.clerk_organization_id,
        name=request.name,
        slug=request.slug,
    )
    
    return {
        "id": org.id,
        "name": org.name,
        "slug": org.slug,
    }


@router.get("/{org_id}")
async def get_organization(
    org_id: str = Path(..., min_length=1),
    repo: OrganizationsRepo = Depends(get_orgs_repo),
):
    """Get organization details."""
    org = repo.get_organization(org_id)
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    return {
        "id": org.id,
        "name": org.name,
        "slug": org.slug,
        "createdAt": _to_iso(org.created_at),
        "updatedAt": _to_iso(org.updated_at),
    }


@router.patch("/{org_id}")
async def update_organization(
    request: UpdateOrganizationRequest,
    org_id: str = Path(..., min_length=1),
    repo: OrganizationsRepo = Depends(get_orgs_repo),
):
    """Update organization details."""
    org = repo.update_organization(
        org_id=org_id,
        name=request.name,
        slug=request.slug,
    )
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    return {"id": org_id, "updated": True}


@router.delete("/{org_id}")
async def delete_organization(
    org_id: str = Path(..., min_length=1),
    repo: OrganizationsRepo = Depends(get_orgs_repo),
):
    """Delete an organization."""
    if not repo.delete_organization(org_id):
        raise HTTPException(status_code=404, detail="Organization not found")
    
    return {"id": org_id, "deleted": True}


@router.get("")
async def list_organizations(
    repo: OrganizationsRepo = Depends(get_orgs_repo),
):
    """List all organizations (for admin) or user's organizations."""
    # TODO: Filter by authenticated user when auth is enabled
    # For now, this needs the user_id to be passed or derived from auth
    return {"items": []}


# ============ Organization Members Endpoints ============

@router.get("/{org_id}/members")
async def list_organization_members(
    org_id: str = Path(..., min_length=1),
    repo: OrganizationsRepo = Depends(get_orgs_repo),
):
    """List all members of an organization."""
    org = repo.get_organization(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    members = repo.get_members(org_id)
    
    return {
        "items": [
            {
                "id": m.id,
                "userId": m.user_id,
                "role": m.role,
                "status": m.status,
                "createdAt": _to_iso(m.created_at),
            }
            for m in members
        ],
        "total": len(members),
    }


@router.post("/{org_id}/members")
async def add_organization_member(
    request: AddMemberRequest,
    org_id: str = Path(..., min_length=1),
    repo: OrganizationsRepo = Depends(get_orgs_repo),
):
    """Add a member to an organization."""
    org = repo.get_organization(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    membership = repo.add_member(
        org_id=org_id,
        user_id=request.user_id,
        role=_map_platform_role_to_db_role(request.role),
        status=request.status,
    )
    
    return {
        "id": membership.id,
        "userId": membership.user_id,
        "organizationId": org_id,
        "role": request.role,
        "status": membership.status,
    }


@router.patch("/{org_id}/members/{user_id}")
async def update_organization_member(
    request: UpdateMemberRequest,
    org_id: str = Path(..., min_length=1),
    user_id: str = Path(..., min_length=1),
    repo: OrganizationsRepo = Depends(get_orgs_repo),
):
    """Update a member's role or status."""
    # This is a simplified version - the full logic would check existing membership
    membership = repo.add_member(
        org_id=org_id,
        user_id=user_id,
        role=_map_platform_role_to_db_role(request.role) if request.role else "member",
        status=request.status or "active",
    )
    
    return {
        "id": membership.id,
        "userId": user_id,
        "organizationId": org_id,
        "updated": True,
    }


@router.delete("/{org_id}/members/{user_id}")
async def remove_organization_member(
    org_id: str = Path(..., min_length=1),
    user_id: str = Path(..., min_length=1),
    repo: OrganizationsRepo = Depends(get_orgs_repo),
):
    """Remove a member from an organization."""
    if not repo.remove_member(org_id, user_id):
        raise HTTPException(status_code=404, detail="Membership not found")
    
    return {"deleted": True, "userId": user_id, "organizationId": org_id}
