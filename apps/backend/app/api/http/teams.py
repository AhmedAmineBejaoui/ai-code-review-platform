"""
Teams API endpoints.

Provides team management and team member operations.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, ConfigDict, Field

from app.api.middleware.auth import AuthenticatedPrincipal, enforce_permission, get_current_principal
from app.data.database import get_engine

router = APIRouter(prefix="/api/v1/teams", tags=["teams"])


class TeamMember(BaseModel):
    """Team member model."""
    user_id: str
    email: str
    display_name: str | None
    role: Literal["owner", "admin", "member", "viewer"]
    joined_at: str
    
    # Activity stats
    reviews_completed: int = 0
    avg_review_time_hours: float | None = None


class TeamResponse(BaseModel):
    """Team response model."""
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    slug: str | None
    description: str | None = None
    clerk_org_id: str | None = None
    github_org_id: str | None = None
    github_org_login: str | None = None
    source: str = "platform"
    sync_status: str = "local_only"
    
    member_count: int
    members: list[TeamMember] = Field(default_factory=list)
    
    # Team metrics
    total_reviews: int = 0
    active_reviews: int = 0
    avg_review_time_hours: float | None = None
    
    created_at: str
    updated_at: str


class TeamListResponse(BaseModel):
    """Response model for team list."""
    items: list[TeamResponse]
    total: int


class CreateTeamRequest(BaseModel):
    """Request to create a team."""
    model_config = ConfigDict(extra="forbid")

    id: str | None = Field(None, min_length=2, max_length=128)
    name: str = Field(min_length=1, max_length=100)
    slug: str | None = Field(None, max_length=50, pattern=r"^[a-z0-9-]+$")
    description: str | None = Field(None, max_length=500)
    clerk_org_id: str | None = Field(None, max_length=128)
    github_org_id: str | None = Field(None, max_length=128)
    github_org_login: str | None = Field(None, max_length=100)
    source: Literal["platform", "github_import", "clerk_sync", "legacy"] = "platform"
    sync_status: Literal["linked", "clerk_only", "github_only", "local_only", "error"] = "local_only"


class UpdateTeamRequest(BaseModel):
    """Request to update a team."""
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(None, min_length=1, max_length=100)
    slug: str | None = Field(None, max_length=50, pattern=r"^[a-z0-9-]+$")
    description: str | None = Field(None, max_length=500)
    clerk_org_id: str | None = Field(None, max_length=128)
    github_org_id: str | None = Field(None, max_length=128)
    github_org_login: str | None = Field(None, max_length=100)
    source: Literal["platform", "github_import", "clerk_sync", "legacy"] | None = None
    sync_status: Literal["linked", "clerk_only", "github_only", "local_only", "error"] | None = None


class AddMemberRequest(BaseModel):
    """Request to add a team member."""
    model_config = ConfigDict(extra="forbid")

    user_id: str
    role: Literal["admin", "member", "viewer"] = "member"


def _slugify(value: str) -> str:
    normalized = "".join(char.lower() if char.isalnum() else "-" for char in value.strip())
    collapsed = "-".join(part for part in normalized.split("-") if part)
    return collapsed[:50] or f"team-{uuid.uuid4().hex[:8]}"


def _serialize_datetime(value: Any) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value or "")


def _resolve_sync_status(
    clerk_org_id: str | None,
    github_org_login: str | None,
    explicit: str | None = None,
) -> str:
    if explicit:
        return explicit
    if clerk_org_id and github_org_login:
        return "linked"
    if clerk_org_id:
        return "clerk_only"
    if github_org_login:
        return "github_only"
    return "local_only"


def _ensure_user_record(engine, principal: AuthenticatedPrincipal) -> None:
    from sqlalchemy import text

    email = principal.email.strip() if isinstance(principal.email, str) and principal.email.strip() else None
    display_name = (
        principal.display_name.strip()
        if isinstance(principal.display_name, str) and principal.display_name.strip()
        else None
    )

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, display_name, is_active, created_at)
                VALUES (:id, :email, :display_name, true, :created_at)
                ON CONFLICT (id) DO UPDATE
                SET email = COALESCE(EXCLUDED.email, users.email),
                    display_name = COALESCE(EXCLUDED.display_name, users.display_name),
                    is_active = true
                """
            ),
            {
                "id": principal.user_id,
                "email": email or f"{principal.user_id}@clerk.local",
                "display_name": display_name,
                "created_at": datetime.now(timezone.utc),
            },
        )


def _team_response_from_data(
    team_data: dict[str, Any],
    members: list[TeamMember],
    metrics: dict[str, Any],
) -> TeamResponse:
    return TeamResponse(
        id=team_data["id"],
        name=team_data["name"],
        slug=team_data.get("slug"),
        description=team_data.get("description"),
        clerk_org_id=team_data.get("clerk_org_id"),
        github_org_id=team_data.get("github_org_id"),
        github_org_login=team_data.get("github_org_login"),
        source=team_data.get("source") or "platform",
        sync_status=team_data.get("sync_status") or "local_only",
        member_count=team_data.get("member_count", len(members)),
        members=members,
        total_reviews=metrics["total_reviews"],
        active_reviews=metrics["active_reviews"],
        avg_review_time_hours=metrics["avg_review_time_hours"],
        created_at=team_data["created_at"],
        updated_at=team_data["updated_at"],
    )


def _get_organization_teams(engine, org_id: str | None) -> list[dict[str, Any]]:
    """Get teams (organizations) from database."""
    from sqlalchemy import text
    
    # If org_id is provided, get that specific org
    if org_id:
        query = text("""
            SELECT 
                o.id,
                o.name,
                o.slug,
                o.description,
                o.clerk_org_id,
                o.github_org_id,
                o.github_org_login,
                o.source,
                o.sync_status,
                o.created_at,
                o.updated_at,
                COUNT(DISTINCT om.user_id) as member_count
            FROM organizations o
            LEFT JOIN organization_memberships om ON o.id = om.organization_id
            WHERE o.id = :org_id AND o.is_active = true
            GROUP BY 
                o.id,
                o.name,
                o.slug,
                o.description,
                o.clerk_org_id,
                o.github_org_id,
                o.github_org_login,
                o.source,
                o.sync_status,
                o.created_at,
                o.updated_at
        """)
        params = {"org_id": org_id}
    else:
        # Get all organizations
        query = text("""
            SELECT 
                o.id,
                o.name,
                o.slug,
                o.description,
                o.clerk_org_id,
                o.github_org_id,
                o.github_org_login,
                o.source,
                o.sync_status,
                o.created_at,
                o.updated_at,
                COUNT(DISTINCT om.user_id) as member_count
            FROM organizations o
            LEFT JOIN organization_memberships om ON o.id = om.organization_id
            WHERE o.is_active = true
            GROUP BY
                o.id,
                o.name,
                o.slug,
                o.description,
                o.clerk_org_id,
                o.github_org_id,
                o.github_org_login,
                o.source,
                o.sync_status,
                o.created_at,
                o.updated_at
            ORDER BY o.name
        """)
        params = {}
    
    teams = []
    with engine.connect() as conn:
        result = conn.execute(query, params)
        for row in result.mappings():
            teams.append({
                "id": row["id"],
                "name": row["name"],
                "slug": row.get("slug"),
                "description": row.get("description"),
                "clerk_org_id": row.get("clerk_org_id"),
                "github_org_id": row.get("github_org_id"),
                "github_org_login": row.get("github_org_login"),
                "source": row.get("source") or "platform",
                "sync_status": row.get("sync_status") or "local_only",
                "created_at": _serialize_datetime(row.get("created_at")),
                "updated_at": _serialize_datetime(row.get("updated_at")),
                "member_count": row.get("member_count") or 0,
            })
    
    return teams


def _get_team_members(engine, team_id: str) -> list[TeamMember]:
    """Get members of a team."""
    from sqlalchemy import text
    
    query = text("""
        SELECT 
            u.id as user_id,
            u.email,
            u.display_name,
            om.role,
            om.created_at as joined_at
        FROM organization_memberships om
        JOIN users u ON om.user_id = u.id
        WHERE om.organization_id = :team_id
        AND om.status = 'active'
        ORDER BY om.role, u.display_name
    """)
    
    members = []
    with engine.connect() as conn:
        result = conn.execute(query, {"team_id": team_id})
        for row in result.mappings():
            members.append(TeamMember(
                user_id=row["user_id"],
                email=row["email"],
                display_name=row.get("display_name"),
                role=row.get("role", "member"),
                joined_at=row["joined_at"].isoformat() if isinstance(row.get("joined_at"), datetime) else str(row.get("joined_at", "")),
                reviews_completed=0,  # Could be enhanced with actual stats
                avg_review_time_hours=None,
            ))
    
    return members


def _get_team_metrics(engine, team_id: str) -> dict[str, Any]:
    """Get team review metrics."""
    from sqlalchemy import text
    
    query = text("""
        SELECT 
            COUNT(*) as total_reviews,
            SUM(CASE WHEN ra.status = 'pending' OR ra.status = 'in_progress' THEN 1 ELSE 0 END) as active_reviews,
            AVG(EXTRACT(EPOCH FROM (COALESCE(ra.completed_at, NOW()) - ra.assigned_at)) / 3600) as avg_time_hours
        FROM review_assignments ra
        JOIN organization_memberships om ON ra.reviewer_id = om.user_id
        WHERE om.organization_id = :team_id
    """)
    
    try:
        with engine.connect() as conn:
            result = conn.execute(query, {"team_id": team_id})
            row = result.mappings().first()
            
            if row:
                return {
                    "total_reviews": row.get("total_reviews") or 0,
                    "active_reviews": row.get("active_reviews") or 0,
                    "avg_review_time_hours": float(row["avg_time_hours"]) if row.get("avg_time_hours") else None,
                }
    except Exception:
        # Table might not exist
        pass
    
    return {
        "total_reviews": 0,
        "active_reviews": 0,
        "avg_review_time_hours": None,
    }


@router.get("", response_model=TeamListResponse)
async def list_teams(
    team_id: str | None = Query(None, description="Filter by specific team ID"),
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> TeamListResponse:
    """
    List teams (organizations) accessible to the current user.
    
    Returns teams with member counts and basic metrics.
    """
    enforce_permission(principal, "analyses.read")
    
    engine = get_engine()
    
    # Get teams
    teams_data = _get_organization_teams(engine, team_id)
    
    items = []
    for team_data in teams_data:
        members = _get_team_members(engine, team_data["id"])
        metrics = _get_team_metrics(engine, team_data["id"])
        items.append(_team_response_from_data(team_data, members, metrics))
    
    return TeamListResponse(
        items=items,
        total=len(items),
    )


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: str,
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> TeamResponse:
    """
    Get a specific team by ID.
    """
    enforce_permission(principal, "analyses.read")
    
    engine = get_engine()
    
    teams_data = _get_organization_teams(engine, team_id)
    
    if not teams_data:
        raise HTTPException(status_code=404, detail="Team not found")
    
    team_data = teams_data[0]
    members = _get_team_members(engine, team_id)
    metrics = _get_team_metrics(engine, team_id)
    
    return _team_response_from_data(team_data, members, metrics)


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    request: CreateTeamRequest,
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> TeamResponse:
    """
    Create a new team (organization).
    """
    enforce_permission(principal, "admin.write")
    
    engine = get_engine()
    from sqlalchemy import text
    
    _ensure_user_record(engine, principal)

    team_id = request.id or request.clerk_org_id or str(uuid.uuid4())
    slug = request.slug or _slugify(request.name)
    clerk_org_id = request.clerk_org_id or (team_id if team_id.startswith("org_") else None)
    github_org_id = request.github_org_id.strip() if isinstance(request.github_org_id, str) and request.github_org_id.strip() else None
    github_org_login = (
        request.github_org_login.strip()
        if isinstance(request.github_org_login, str) and request.github_org_login.strip()
        else None
    )
    sync_status = _resolve_sync_status(clerk_org_id, github_org_login, request.sync_status)
    now = datetime.now(timezone.utc)
    
    # Create organization
    insert_query = text("""
        INSERT INTO organizations (
            id,
            name,
            slug,
            description,
            clerk_org_id,
            github_org_id,
            github_org_login,
            source,
            sync_status,
            is_active,
            created_at,
            updated_at
        )
        VALUES (
            :id,
            :name,
            :slug,
            :description,
            :clerk_org_id,
            :github_org_id,
            :github_org_login,
            :source,
            :sync_status,
            true,
            :created_at,
            :updated_at
        )
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            slug = EXCLUDED.slug,
            description = EXCLUDED.description,
            clerk_org_id = EXCLUDED.clerk_org_id,
            github_org_id = EXCLUDED.github_org_id,
            github_org_login = EXCLUDED.github_org_login,
            source = EXCLUDED.source,
            sync_status = EXCLUDED.sync_status,
            is_active = true,
            updated_at = EXCLUDED.updated_at
        RETURNING *
    """)
    
    with engine.begin() as conn:
        result = conn.execute(insert_query, {
            "id": team_id,
            "name": request.name,
            "slug": slug,
            "description": request.description,
            "clerk_org_id": clerk_org_id,
            "github_org_id": github_org_id,
            "github_org_login": github_org_login,
            "source": request.source,
            "sync_status": sync_status,
            "created_at": now,
            "updated_at": now,
        })
        row = result.mappings().first()
        
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create team")
        
        # Add creator as owner
        membership_id = str(uuid.uuid4())
        membership_query = text("""
            INSERT INTO organization_memberships (id, organization_id, user_id, role, status, created_at, updated_at)
            VALUES (:id, :org_id, :user_id, 'owner', 'active', :created_at, :updated_at)
            ON CONFLICT (organization_id, user_id) DO UPDATE
            SET role = 'owner', status = 'active', updated_at = EXCLUDED.updated_at
        """)
        
        conn.execute(membership_query, {
            "id": membership_id,
            "org_id": team_id,
            "user_id": principal.user_id,
            "created_at": now,
            "updated_at": now,
        })
    
    return TeamResponse(
        id=team_id,
        name=request.name,
        slug=slug,
        description=request.description,
        clerk_org_id=clerk_org_id,
        github_org_id=github_org_id,
        github_org_login=github_org_login,
        source=request.source,
        sync_status=sync_status,
        member_count=1,
        members=[],
        total_reviews=0,
        active_reviews=0,
        avg_review_time_hours=None,
        created_at=now.isoformat(),
        updated_at=now.isoformat(),
    )


@router.patch("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: str,
    request: UpdateTeamRequest,
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> TeamResponse:
    """
    Update a team.
    """
    enforce_permission(principal, "admin.write")
    
    engine = get_engine()
    from sqlalchemy import text
    
    # Check team exists
    teams_data = _get_organization_teams(engine, team_id)
    if not teams_data:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Build update
    updates = []
    params: dict[str, Any] = {"team_id": team_id, "updated_at": datetime.now(timezone.utc)}
    
    if request.name is not None:
        updates.append("name = :name")
        params["name"] = request.name

    if request.slug is not None:
        updates.append("slug = :slug")
        params["slug"] = request.slug or None

    if request.description is not None:
        updates.append("description = :description")
        params["description"] = request.description

    if request.clerk_org_id is not None:
        updates.append("clerk_org_id = :clerk_org_id")
        params["clerk_org_id"] = request.clerk_org_id or None

    if request.github_org_id is not None:
        updates.append("github_org_id = :github_org_id")
        params["github_org_id"] = request.github_org_id or None

    if request.github_org_login is not None:
        updates.append("github_org_login = :github_org_login")
        params["github_org_login"] = request.github_org_login or None

    if request.source is not None:
        updates.append("source = :source")
        params["source"] = request.source

    if request.sync_status is not None:
        updates.append("sync_status = :sync_status")
        params["sync_status"] = request.sync_status
    elif (
        request.clerk_org_id is not None
        or request.github_org_login is not None
        or request.github_org_id is not None
    ):
        resolved_clerk_org_id = (
            request.clerk_org_id
            if request.clerk_org_id is not None
            else teams_data[0].get("clerk_org_id")
        )
        resolved_github_org_login = (
            request.github_org_login
            if request.github_org_login is not None
            else teams_data[0].get("github_org_login")
        )
        updates.append("sync_status = :sync_status")
        params["sync_status"] = _resolve_sync_status(
            resolved_clerk_org_id,
            resolved_github_org_login,
        )
    
    if not updates:
        # Nothing to update, return current team
        return await get_team(team_id, principal)
    
    updates.append("updated_at = :updated_at")
    
    query = text(f"""
        UPDATE organizations
        SET {", ".join(updates)}
        WHERE id = :team_id
        RETURNING *
    """)
    
    with engine.begin() as conn:
        result = conn.execute(query, params)
        row = result.mappings().first()
        
        if not row:
            raise HTTPException(status_code=500, detail="Failed to update team")
    
    return await get_team(team_id, principal)


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(
    team_id: str,
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> Response:
    """
    Archive a team by marking the backing organization inactive.
    """
    enforce_permission(principal, "admin.write")

    engine = get_engine()
    from sqlalchemy import text

    teams_data = _get_organization_teams(engine, team_id)
    if not teams_data:
        raise HTTPException(status_code=404, detail="Team not found")

    now = datetime.now(timezone.utc)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                UPDATE organizations
                SET is_active = false, updated_at = :updated_at
                WHERE id = :team_id
                """
            ),
            {"team_id": team_id, "updated_at": now},
        )
        conn.execute(
            text(
                """
                UPDATE organization_memberships
                SET status = 'revoked', updated_at = :updated_at
                WHERE organization_id = :team_id
                """
            ),
            {"team_id": team_id, "updated_at": now},
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{team_id}/members", response_model=TeamMember, status_code=status.HTTP_201_CREATED)
async def add_team_member(
    team_id: str,
    request: AddMemberRequest,
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> TeamMember:
    """
    Add a member to a team.
    """
    enforce_permission(principal, "admin.write")
    
    engine = get_engine()
    from sqlalchemy import text
    
    # Check team exists
    teams_data = _get_organization_teams(engine, team_id)
    if not teams_data:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check user exists
    user_query = text("SELECT id, email, display_name FROM users WHERE id = :user_id")
    with engine.connect() as conn:
        result = conn.execute(user_query, {"user_id": request.user_id})
        user_row = result.mappings().first()
        
        if not user_row:
            raise HTTPException(status_code=404, detail="User not found")
    
    # Add membership
    now = datetime.now(timezone.utc)
    membership_id = str(uuid.uuid4())
    
    insert_query = text("""
        INSERT INTO organization_memberships (id, organization_id, user_id, role, status, created_at, updated_at)
        VALUES (:id, :org_id, :user_id, :role, 'active', :created_at, :updated_at)
        ON CONFLICT (organization_id, user_id) DO UPDATE
        SET role = EXCLUDED.role, status = 'active', updated_at = EXCLUDED.updated_at
        RETURNING *
    """)
    
    with engine.begin() as conn:
        result = conn.execute(insert_query, {
            "id": membership_id,
            "org_id": team_id,
            "user_id": request.user_id,
            "role": request.role,
            "created_at": now,
            "updated_at": now,
        })
        row = result.mappings().first()
        
        if not row:
            raise HTTPException(status_code=500, detail="Failed to add member")
    
    return TeamMember(
        user_id=request.user_id,
        email=user_row["email"],
        display_name=user_row.get("display_name"),
        role=request.role,
        joined_at=now.isoformat(),
        reviews_completed=0,
        avg_review_time_hours=None,
    )


@router.delete("/{team_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_team_member(
    team_id: str,
    user_id: str,
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
):
    """
    Remove a member from a team.
    """
    enforce_permission(principal, "admin.write")
    
    engine = get_engine()
    from sqlalchemy import text
    
    # Check team exists
    teams_data = _get_organization_teams(engine, team_id)
    if not teams_data:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Remove membership (or set status to revoked)
    query = text("""
        UPDATE organization_memberships
        SET status = 'revoked', updated_at = :updated_at
        WHERE organization_id = :team_id AND user_id = :user_id
    """)
    
    with engine.begin() as conn:
        conn.execute(query, {
            "team_id": team_id,
            "user_id": user_id,
            "updated_at": datetime.now(timezone.utc),
        })


class OrganizationResponse(BaseModel):
    """Organization (GitHub) response model."""
    model_config = ConfigDict(extra="forbid")
    
    id: str
    name: str
    slug: str | None
    description: str | None = None
    
    repos_count: int = 0
    members_count: int = 0
    teams_count: int = 0
    
    created_at: str
    updated_at: str


@router.get("/organization", response_model=OrganizationResponse)
async def get_organization(
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> OrganizationResponse:
    """
    Get the primary organization for the current user.
    
    Returns the user's primary organization with repos, members, and team counts.
    """
    enforce_permission(principal, "analyses.read")
    
    engine = get_engine()
    from sqlalchemy import text
    
    # Get user's primary organization (first one they're a member of)
    org_query = text("""
        SELECT 
            o.id,
            o.name,
            o.slug,
            o.created_at,
            o.updated_at,
            COUNT(DISTINCT om.user_id) as members_count,
            COUNT(DISTINCT r.id) as repos_count
        FROM organizations o
        LEFT JOIN organization_memberships om ON o.id = om.organization_id AND om.status = 'active'
        LEFT JOIN repositories r ON o.id = r.organization_id
        WHERE o.is_active = true
        AND (
            o.id IN (SELECT organization_id FROM organization_memberships WHERE user_id = :user_id AND status = 'active')
            OR EXISTS (SELECT 1 FROM organization_memberships WHERE organization_id = o.id LIMIT 1)
        )
        GROUP BY o.id, o.name, o.slug, o.created_at, o.updated_at
        ORDER BY o.created_at DESC
        LIMIT 1
    """)
    
    try:
        with engine.connect() as conn:
            result = conn.execute(org_query, {"user_id": principal.user_id})
            row = result.mappings().first()
            
            if row:
                return OrganizationResponse(
                    id=row["id"],
                    name=row["name"],
                    slug=row.get("slug"),
                    description=None,
                    repos_count=row.get("repos_count") or 0,
                    members_count=row.get("members_count") or 0,
                    teams_count=1,  # Default to 1
                    created_at=row["created_at"].isoformat() if isinstance(row.get("created_at"), datetime) else str(row.get("created_at", "")),
                    updated_at=row["updated_at"].isoformat() if isinstance(row.get("updated_at"), datetime) else str(row.get("updated_at", "")),
                )
    except Exception:
        pass
    
    # Return empty org if none found
    now = datetime.now(timezone.utc)
    return OrganizationResponse(
        id="default",
        name="Default Organization",
        slug="default",
        description=None,
        repos_count=0,
        members_count=0,
        teams_count=0,
        created_at=now.isoformat(),
        updated_at=now.isoformat(),
    )
