"""
Organizations API endpoints for managing multi-tenant organizations.
"""
from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Path, Body
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.api.middleware.auth import AuthenticatedPrincipal, get_current_principal
from app.data.database import get_engine
from app.settings import settings

import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/organizations", tags=["organizations"])


class CreateOrganizationRequest(BaseModel):
    clerk_organization_id: str = Field(..., min_length=1, max_length=255)
    name: str = Field(..., min_length=1, max_length=255)
    slug: str | None = Field(None, max_length=255)
    github_org_id: int | None = None
    github_org_name: str | None = Field(None, max_length=255)


class UpdateOrganizationRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    slug: str | None = Field(None, max_length=255)
    github_org_id: int | None = None
    github_org_name: str | None = Field(None, max_length=255)


def _to_iso(dt: Any) -> str | None:
    if dt is None:
        return None
    if hasattr(dt, "isoformat"):
        return dt.isoformat()
    return str(dt)


@router.post("")
async def create_organization(
    request: CreateOrganizationRequest,
    # Allow both authenticated users and system calls (webhook)
    # For system calls, X-User-ID header can be used
):
    """Create a new organization in the database."""
    engine = get_engine()
    
    with engine.begin() as conn:
        # Check if organization already exists
        existing = conn.execute(
            text("""
                SELECT id FROM organizations 
                WHERE id = :clerk_id
                LIMIT 1
            """),
            {"clerk_id": request.clerk_organization_id}
        ).first()
        
        if existing:
            logger.info(f"Organization {request.clerk_organization_id} already exists")
            return {"id": request.clerk_organization_id, "exists": True}
        
        # Create organization
        conn.execute(
            text("""
                INSERT INTO organizations (
                    id, name, slug, created_at, updated_at
                )
                VALUES (
                    :id, :name, :slug, NOW(), NOW()
                )
            """),
            {
                "id": request.clerk_organization_id,
                "name": request.name,
                "slug": request.slug or request.name.lower().replace(" ", "-"),
            }
        )
        
        logger.info(f"Organization {request.clerk_organization_id} created successfully")
        
        return {
            "id": request.clerk_organization_id,
            "name": request.name,
            "slug": request.slug,
        }


@router.get("/{org_id}")
async def get_organization(
    org_id: str = Path(..., min_length=1),
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
):
    """Get organization details."""
    engine = get_engine()
    
    with engine.connect() as conn:
        org_row = conn.execute(
            text("""
                SELECT id, name, slug, created_at, updated_at
                FROM organizations
                WHERE id = :org_id
                LIMIT 1
            """),
            {"org_id": org_id}
        ).mappings().first()
        
        if not org_row:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        # Check if user is a member
        membership = conn.execute(
            text("""
                SELECT role, status
                FROM organization_memberships
                WHERE organization_id = :org_id AND user_id = :user_id
                LIMIT 1
            """),
            {"org_id": org_id, "user_id": principal.user_id}
        ).mappings().first()
        
        if not membership and "admin" not in principal.roles:
            raise HTTPException(status_code=403, detail="Not a member of this organization")
        
        return {
            "id": str(org_row["id"]),
            "name": str(org_row["name"]),
            "slug": str(org_row.get("slug") or ""),
            "createdAt": _to_iso(org_row.get("created_at")),
            "updatedAt": _to_iso(org_row.get("updated_at")),
            "role": str(membership["role"]) if membership else None,
        }


@router.patch("/{org_id}")
async def update_organization(
    request: UpdateOrganizationRequest,
    org_id: str = Path(..., min_length=1),
):
    """Update organization details."""
    engine = get_engine()
    
    with engine.begin() as conn:
        # Check if exists
        existing = conn.execute(
            text("SELECT id FROM organizations WHERE id = :org_id LIMIT 1"),
            {"org_id": org_id}
        ).first()
        
        if not existing:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        # Build update query
        updates = []
        params = {"org_id": org_id}
        
        if request.name is not None:
            updates.append("name = :name")
            params["name"] = request.name
        
        if request.slug is not None:
            updates.append("slug = :slug")
            params["slug"] = request.slug
        
        if updates:
            updates.append("updated_at = NOW()")
            conn.execute(
                text(f"UPDATE organizations SET {', '.join(updates)} WHERE id = :org_id"),
                params
            )
        
        logger.info(f"Organization {org_id} updated successfully")
        
        return {"id": org_id, "updated": True}


@router.delete("/{org_id}")
async def delete_organization(
    org_id: str = Path(..., min_length=1),
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
):
    """Delete an organization (soft delete)."""
    if "admin" not in principal.roles:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    engine = get_engine()
    
    with engine.begin() as conn:
        # Check if exists
        existing = conn.execute(
            text("SELECT id FROM organizations WHERE id = :org_id LIMIT 1"),
            {"org_id": org_id}
        ).first()
        
        if not existing:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        # Soft delete - just mark as inactive or delete memberships
        # For now, we'll delete memberships (CASCADE will handle related data)
        conn.execute(
            text("DELETE FROM organization_memberships WHERE organization_id = :org_id"),
            {"org_id": org_id}
        )
        
        # Delete organization
        conn.execute(
            text("DELETE FROM organizations WHERE id = :org_id"),
            {"org_id": org_id}
        )
        
        logger.info(f"Organization {org_id} deleted successfully")
        
        return {"id": org_id, "deleted": True}


@router.get("")
async def list_organizations(
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
):
    """List organizations the user is a member of."""
    engine = get_engine()
    
    with engine.connect() as conn:
        query = """
            SELECT DISTINCT o.id, o.name, o.slug, o.created_at, om.role
            FROM organizations o
            LEFT JOIN organization_memberships om ON om.organization_id = o.id AND om.user_id = :user_id
            WHERE om.user_id = :user_id OR :is_admin = TRUE
            ORDER BY o.name ASC
        """
        
        rows = conn.execute(
            text(query),
            {
                "user_id": principal.user_id,
                "is_admin": "admin" in principal.roles
            }
        ).mappings().all()
        
        return {
            "items": [
                {
                    "id": str(row["id"]),
                    "name": str(row["name"]),
                    "slug": str(row.get("slug") or ""),
                    "createdAt": _to_iso(row.get("created_at")),
                    "role": str(row.get("role") or "member"),
                }
                for row in rows
            ]
        }
