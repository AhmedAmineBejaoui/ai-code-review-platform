"""
Teams API routes.
"""

import logging
from typing import List, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field

from ..database import get_engine
from ..models import TeamPermission, TeamRole
from ..repositories import TeamsRepo

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/teams", tags=["teams"])


# ============ Request/Response Models ============

class TeamMemberResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    id: str
    user_id: str
    email: str | None = None
    display_name: str | None = None
    role: Literal["admin", "reviewer", "developer"]
    permissions: List[str] = Field(default_factory=list)
    created_at: str | None = None
    updated_at: str | None = None


class TeamResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    id: str
    name: str
    project_id: str
    project_name: str | None = None
    description: str | None = None
    is_active: bool = True
    member_count: int = 0
    repo_count: int = 0
    members: List[TeamMemberResponse] = Field(default_factory=list)
    admin_count: int = 0
    reviewer_count: int = 0
    developer_count: int = 0
    active_reviews: int = 0
    total_reviews: int = 0
    avg_review_time_hours: float = 0.0
    created_at: str | None = None
    updated_at: str | None = None


class TeamListResponse(BaseModel):
    items: List[TeamResponse]
    total: int


class CreateTeamRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    name: str = Field(min_length=1, max_length=100)
    project_id: str = Field(min_length=1, max_length=128)
    description: str | None = Field(None, max_length=500)


class UpdateTeamRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = Field(None, max_length=500)
    is_active: bool | None = None


class AddMemberRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    user_id: str
    role: Literal["admin", "reviewer", "developer"] = "developer"
    permissions: List[str] = Field(default_factory=list)


class UpdateMemberRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    role: Literal["admin", "reviewer", "developer"] | None = None
    permissions: List[str] | None = None


class UserProjectAccessResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    user_id: str
    project_id: str
    team_id: str | None = None
    team_name: str | None = None
    role: Literal["admin", "reviewer", "developer"]
    permissions: List[str] = Field(default_factory=list)
    source: Literal["team", "org", "platform", "none"]


# ============ Helper Functions ============

def _serialize_datetime(value) -> str | None:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _team_to_response(team, members=None, stats=None) -> TeamResponse:
    member_responses = []
    if members:
        for m in members:
            member_responses.append(TeamMemberResponse(
                id=m.id,
                user_id=m.user_id,
                email=m.user_email,
                display_name=m.user_display_name,
                role=m.role.value,
                permissions=m.permissions or [],
                created_at=_serialize_datetime(m.created_at),
                updated_at=_serialize_datetime(m.updated_at),
            ))
    
    return TeamResponse(
        id=team.id,
        name=team.name,
        project_id=team.project_id,
        project_name=team.project_name,
        description=team.description,
        is_active=team.is_active,
        member_count=team.member_count if hasattr(team, 'member_count') else len(member_responses),
        repo_count=team.repo_count if hasattr(team, 'repo_count') else 0,
        members=member_responses,
        admin_count=stats.admin_count if stats else 0,
        reviewer_count=stats.reviewer_count if stats else 0,
        developer_count=stats.developer_count if stats else 0,
        active_reviews=stats.active_reviews if stats else 0,
        total_reviews=stats.total_reviews if stats else 0,
        avg_review_time_hours=stats.avg_review_time_hours if stats else 0.0,
        created_at=_serialize_datetime(team.created_at),
        updated_at=_serialize_datetime(team.updated_at),
    )


def get_teams_repo() -> TeamsRepo:
    return TeamsRepo(get_engine())


# ============ Team Endpoints ============

@router.get("", response_model=TeamListResponse)
async def list_teams(
    project_id: str | None = Query(None, description="Filter by project ID"),
    include_members: bool = Query(False, description="Include team members"),
    include_stats: bool = Query(False, description="Include team statistics"),
    repo: TeamsRepo = Depends(get_teams_repo),
):
    """List teams, optionally filtered by project."""
    if project_id:
        teams = repo.get_teams_by_project(project_id)
    else:
        # TODO: Filter by user's teams when auth is enabled
        teams = []
    
    items = []
    for team in teams:
        members = repo.get_team_members(team.id) if include_members else None
        stats = repo.get_team_with_stats(team.id) if include_stats else None
        items.append(_team_to_response(team, members, stats))
    
    return TeamListResponse(items=items, total=len(items))


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: str,
    include_members: bool = Query(True),
    include_stats: bool = Query(True),
    repo: TeamsRepo = Depends(get_teams_repo),
):
    """Get a specific team by ID."""
    team = repo.get_team(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    members = repo.get_team_members(team_id) if include_members else None
    stats = repo.get_team_with_stats(team_id) if include_stats else None
    
    return _team_to_response(team, members, stats)


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    request: CreateTeamRequest,
    repo: TeamsRepo = Depends(get_teams_repo),
):
    """Create a new team under a project."""
    team = repo.create_team(
        name=request.name,
        project_id=request.project_id,
        description=request.description,
    )
    
    return _team_to_response(team)


@router.patch("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: str,
    request: UpdateTeamRequest,
    repo: TeamsRepo = Depends(get_teams_repo),
):
    """Update a team's details."""
    team = repo.update_team(
        team_id=team_id,
        name=request.name,
        description=request.description,
        is_active=request.is_active,
    )
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    members = repo.get_team_members(team_id)
    stats = repo.get_team_with_stats(team_id)
    
    return _team_to_response(team, members, stats)


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(
    team_id: str,
    repo: TeamsRepo = Depends(get_teams_repo),
):
    """Delete a team."""
    if not repo.delete_team(team_id):
        raise HTTPException(status_code=404, detail="Team not found")


# ============ Team Members Endpoints ============

@router.get("/{team_id}/members", response_model=List[TeamMemberResponse])
async def list_team_members(
    team_id: str,
    repo: TeamsRepo = Depends(get_teams_repo),
):
    """Get all members of a team."""
    team = repo.get_team(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    members = repo.get_team_members(team_id)
    
    return [
        TeamMemberResponse(
            id=m.id,
            user_id=m.user_id,
            email=m.user_email,
            display_name=m.user_display_name,
            role=m.role.value,
            permissions=m.permissions or [],
            created_at=_serialize_datetime(m.created_at),
            updated_at=_serialize_datetime(m.updated_at),
        )
        for m in members
    ]


@router.post("/{team_id}/members", response_model=TeamMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_team_member(
    team_id: str,
    request: AddMemberRequest,
    repo: TeamsRepo = Depends(get_teams_repo),
):
    """Add a member to a team."""
    team = repo.get_team(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    member = repo.add_member(
        team_id=team_id,
        user_id=request.user_id,
        role=TeamRole(request.role),
        permissions=request.permissions,
    )
    
    # Refresh to get user details
    member = repo.get_member(team_id, request.user_id)
    
    return TeamMemberResponse(
        id=member.id,
        user_id=member.user_id,
        email=member.user_email,
        display_name=member.user_display_name,
        role=member.role.value,
        permissions=member.permissions or [],
        created_at=_serialize_datetime(member.created_at),
        updated_at=_serialize_datetime(member.updated_at),
    )


@router.patch("/{team_id}/members/{user_id}", response_model=TeamMemberResponse)
async def update_team_member(
    team_id: str,
    user_id: str,
    request: UpdateMemberRequest,
    repo: TeamsRepo = Depends(get_teams_repo),
):
    """Update a team member's role or permissions."""
    role = TeamRole(request.role) if request.role else None
    member = repo.update_member(
        team_id=team_id,
        user_id=user_id,
        role=role,
        permissions=request.permissions,
    )
    
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    return TeamMemberResponse(
        id=member.id,
        user_id=member.user_id,
        email=member.user_email,
        display_name=member.user_display_name,
        role=member.role.value,
        permissions=member.permissions or [],
        created_at=_serialize_datetime(member.created_at),
        updated_at=_serialize_datetime(member.updated_at),
    )


@router.delete("/{team_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_team_member(
    team_id: str,
    user_id: str,
    repo: TeamsRepo = Depends(get_teams_repo),
):
    """Remove a member from a team."""
    if not repo.remove_member(team_id, user_id):
        raise HTTPException(status_code=404, detail="Team member not found")


# ============ Project Teams Endpoint ============

@router.get("/project/{project_id}", response_model=TeamListResponse)
async def get_project_teams(
    project_id: str,
    include_members: bool = Query(True),
    include_stats: bool = Query(False),
    repo: TeamsRepo = Depends(get_teams_repo),
):
    """Get all teams for a project."""
    teams = repo.get_teams_by_project(project_id)
    
    items = []
    for team in teams:
        members = repo.get_team_members(team.id) if include_members else None
        stats = repo.get_team_with_stats(team.id) if include_stats else None
        items.append(_team_to_response(team, members, stats))
    
    return TeamListResponse(items=items, total=len(items))


# ============ User Access Endpoints ============

@router.get("/access/project/{project_id}", response_model=UserProjectAccessResponse)
async def get_user_project_access(
    project_id: str,
    user_id: str = Query(..., description="User ID to check access for"),
    repo: TeamsRepo = Depends(get_teams_repo),
):
    """Get a user's resolved access for a project."""
    access = repo.get_user_project_access(user_id, project_id)
    
    return UserProjectAccessResponse(
        user_id=access.user_id,
        project_id=access.project_id,
        team_id=access.team_id,
        team_name=access.team_name,
        role=access.role.value,
        permissions=access.permissions,
        source=access.source,
    )


@router.get("/my-teams", response_model=TeamListResponse)
async def get_my_teams(
    user_id: str = Query(..., description="User ID"),
    include_stats: bool = Query(False),
    repo: TeamsRepo = Depends(get_teams_repo),
):
    """Get all teams a user is a member of."""
    user_teams = repo.get_user_teams(user_id)
    
    items = []
    for team, member in user_teams:
        stats = repo.get_team_with_stats(team.id) if include_stats else None
        response = _team_to_response(team, [member], stats)
        items.append(response)
    
    return TeamListResponse(items=items, total=len(items))


# ============ Available Permissions Endpoint ============

@router.get("/permissions/available", response_model=List[dict])
async def get_available_permissions():
    """Get list of available granular permissions for teams."""
    return [
        {"value": p.value, "label": p.value.replace("_", " ").title()}
        for p in TeamPermission
    ]
