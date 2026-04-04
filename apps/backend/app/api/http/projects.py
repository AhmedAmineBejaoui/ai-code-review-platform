"""
Projects API endpoints.

Provides comprehensive project management including creation, 
team assignment, and branch configuration.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field

from app.api.middleware.auth import AuthenticatedPrincipal, get_current_principal, enforce_permission
from app.data.database import get_engine
from app.data.repos.project_settings_repo import ProjectSettingsRepo
from app.data.repos.rbac_repo import RBACRepo
from app.data.repos.repo_profiles_repo import RepoProfilesRepo

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


# ── Request/Response Models ─────────────────────────────────────────────────────

class ProjectMember(BaseModel):
    """Project team member."""
    user_id: str
    email: str | None = None
    display_name: str | None = None
    role: str  # developer, reviewer, admin, etc.


class BranchConfig(BaseModel):
    """Branch configuration for project."""
    name: str
    is_default: bool = False
    is_protected: bool = False
    require_reviews: int = 0  # Number of required reviews


class CreateProjectRequest(BaseModel):
    """Request model for creating a project."""
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=255, description="Project display name")
    full_name: str = Field(min_length=1, max_length=255, description="Full repo name (owner/repo)")
    description: str | None = Field(None, max_length=1000)
    
    # Repository settings
    language: str | None = None
    visibility: Literal["public", "private", "internal"] = "private"
    default_branch: str = "main"
    github_id: str | None = None
    
    # Team assignment
    team_id: str | None = Field(None, description="Organization/team ID to assign")
    members: list[ProjectMember] = Field(default_factory=list, description="Initial team members")
    
    # Branch configuration
    branches: list[BranchConfig] = Field(default_factory=list, description="Branch configurations")
    
    # Analysis settings
    auto_analysis_enabled: bool = True


class ProjectResponse(BaseModel):
    """Response model for a project."""
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    full_name: str
    description: str | None = None
    
    # Repository info
    language: str | None = None
    visibility: Literal["public", "private", "internal"] = "private"
    default_branch: str = "main"
    status: Literal["active", "maintenance", "archived"] = "active"
    
    # Team info
    team_id: str | None = None
    team_name: str | None = None
    member_count: int = 0
    members: list[ProjectMember] = []
    
    # Branch info
    branch_count: int = 0
    branches: list[BranchConfig] = []
    
    # Analysis settings
    auto_analysis_enabled: bool = True
    
    # Metrics
    health_score: int = 0
    analysis_count: int = 0
    last_analysis_at: str | None = None
    
    # Timestamps
    created_at: str
    updated_at: str


class ProjectListResponse(BaseModel):
    """Response model for project list."""
    items: list[ProjectResponse]
    total: int
    page: int
    limit: int


class UpdateProjectRequest(BaseModel):
    """Request model for updating a project."""
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=1000)
    visibility: Literal["public", "private", "internal"] | None = None
    default_branch: str | None = None
    status: Literal["active", "maintenance", "archived"] | None = None
    team_id: str | None = None
    auto_analysis_enabled: bool | None = None


# ── Helper Functions ────────────────────────────────────────────────────────────

def _get_project_stats(engine, project_id: str) -> dict[str, Any]:
    """Get statistics for a project from analyses."""
    from sqlalchemy import text
    
    query = text("""
        SELECT 
            COUNT(*) as analysis_count,
            MAX(created_at) as last_analysis_at,
            SUM(findings_count) as total_findings,
            SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_count,
            SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed_count
        FROM analyses
        WHERE repo = :project_id
    """)
    
    with engine.connect() as conn:
        result = conn.execute(query, {"project_id": project_id})
        row = result.mappings().first()
        
        if row and row.get("analysis_count"):
            analysis_count = row["analysis_count"] or 0
            completed = row.get("completed_count") or 0
            total_findings = row.get("total_findings") or 0
            
            # Calculate health score (0-100)
            if analysis_count > 0:
                success_rate = completed / analysis_count
                findings_penalty = min(total_findings / 100, 0.5)  # Max 50% penalty
                health_score = int((success_rate * 100) * (1 - findings_penalty))
            else:
                health_score = 0
            
            return {
                "analysis_count": analysis_count,
                "last_analysis_at": row["last_analysis_at"].isoformat() if row.get("last_analysis_at") else None,
                "health_score": health_score,
            }
    
    return {"analysis_count": 0, "last_analysis_at": None, "health_score": 0}


def _get_project_branches(engine, project_id: str) -> list[BranchConfig]:
    """Get branches for a project."""
    from sqlalchemy import text
    
    query = text("""
        SELECT 
            b.name,
            b.is_default,
            CASE WHEN bpr.id IS NOT NULL THEN TRUE ELSE FALSE END as is_protected,
            COALESCE(bpr.required_approvals, 0) as require_reviews
        FROM branches b
        LEFT JOIN branch_protection_rules bpr ON bpr.branch_id = b.id
        WHERE b.repo_id = :project_id
        ORDER BY b.is_default DESC, b.name
    """)
    
    branches = []
    try:
        with engine.connect() as conn:
            result = conn.execute(query, {"project_id": project_id})
            for row in result.mappings().all():
                branches.append(BranchConfig(
                    name=row["name"],
                    is_default=bool(row["is_default"]),
                    is_protected=bool(row["is_protected"]),
                    require_reviews=row["require_reviews"] or 0,
                ))
    except Exception:
        pass  # Table might not exist yet
    
    return branches


def _get_project_members(engine, project_id: str, rbac_repo: RBACRepo) -> list[ProjectMember]:
    """Get team members for a project."""
    members = []
    try:
        member_records = rbac_repo.get_project_members(project_id)
        for record in member_records:
            members.append(ProjectMember(
                user_id=record["user_id"],
                email=record.get("user_email"),
                display_name=record.get("user_display_name"),
                role=record.get("role_code", "developer"),
            ))
    except Exception:
        pass  # Table might not exist
    
    return members


def _get_team_info(engine, team_id: str | None) -> tuple[str | None, str | None]:
    """Get team name from organization ID."""
    if not team_id:
        return None, None
    
    from sqlalchemy import text
    
    query = text("""
        SELECT id, name FROM organizations WHERE id = :team_id LIMIT 1
    """)
    
    try:
        with engine.connect() as conn:
            result = conn.execute(query, {"team_id": team_id})
            row = result.mappings().first()
            if row:
                return row["id"], row["name"]
    except Exception:
        pass
    
    return team_id, None


def _create_branch(engine, project_id: str, branch_config: BranchConfig, org_id: str | None) -> None:
    """Create a branch record."""
    from sqlalchemy import text
    
    branch_id = f"br_{uuid.uuid4().hex[:16]}"
    now = datetime.now(timezone.utc)
    
    try:
        with engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO branches (id, repo_id, org_id, name, is_default, created_at, updated_at)
                    VALUES (:id, :repo_id, :org_id, :name, :is_default, :created_at, :updated_at)
                    ON CONFLICT (repo_id, name) DO UPDATE SET
                        is_default = EXCLUDED.is_default,
                        updated_at = EXCLUDED.updated_at
                """),
                {
                    "id": branch_id,
                    "repo_id": project_id,
                    "org_id": org_id,
                    "name": branch_config.name,
                    "is_default": branch_config.is_default,
                    "created_at": now,
                    "updated_at": now,
                },
            )
            
            # Add protection rule if needed
            if branch_config.is_protected:
                rule_id = f"bpr_{uuid.uuid4().hex[:16]}"
                conn.execute(
                    text("""
                        INSERT INTO branch_protection_rules (id, branch_id, required_approvals, created_at, updated_at)
                        VALUES (:id, :branch_id, :required_approvals, :created_at, :updated_at)
                        ON CONFLICT (branch_id) DO UPDATE SET
                            required_approvals = EXCLUDED.required_approvals,
                            updated_at = EXCLUDED.updated_at
                    """),
                    {
                        "id": rule_id,
                        "branch_id": branch_id,
                        "required_approvals": branch_config.require_reviews,
                        "created_at": now,
                        "updated_at": now,
                    },
                )
    except Exception:
        pass  # Tables might not exist


# ── API Endpoints ───────────────────────────────────────────────────────────────

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    request: CreateProjectRequest,
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> ProjectResponse:
    """
    Create a new project with team and branch configuration.
    
    This endpoint creates:
    1. A repository profile for tracking
    2. Project settings with auto-analysis config
    3. Team member assignments (if provided)
    4. Branch configurations (if provided)
    """
    enforce_permission(principal, "analyses.create")

    engine = get_engine()
    repo_profiles = RepoProfilesRepo()
    settings_repo = ProjectSettingsRepo()
    rbac_repo = RBACRepo()

    project_id = request.full_name.strip().lower()
    now = datetime.now(timezone.utc)
    
    # 1. Create repository profile
    repo_profiles.upsert_profile(
        repo_id=project_id,
        repo_path=None,
        indexed_commit=None,
        default_branch=request.default_branch,
        profile={
            "name": request.name,
            "description": request.description,
            "primary_language": request.language,
            "github_id": request.github_id,
            "visibility": request.visibility,
        },
    )
    
    # 2. Create project settings
    settings = settings_repo.get_or_create_settings(
        project_id=project_id,
        organization_id=request.team_id,
    )
    
    # Update auto-analysis if different from default
    if not request.auto_analysis_enabled:
        settings_repo.set_auto_analysis_enabled(
            project_id=project_id,
            enabled=False,
            changed_by=principal.user_id,
            reason="Disabled on project creation",
        )
    
    # 3. Assign team members
    assigned_members: list[ProjectMember] = []
    
    # Always add the creator as admin
    try:
        rbac_repo.assign_project_role(
            user_id=principal.user_id,
            project_id=project_id,
            role_code="admin",
            assigned_by=principal.user_id,
            notes="Project creator",
        )
        assigned_members.append(ProjectMember(
            user_id=principal.user_id,
            email=principal.email,
            display_name=principal.display_name,
            role="admin",
        ))
    except Exception:
        pass
    
    # Add additional members
    for member in request.members:
        if member.user_id != principal.user_id:  # Skip if already added
            try:
                rbac_repo.assign_project_role(
                    user_id=member.user_id,
                    project_id=project_id,
                    role_code=member.role,
                    assigned_by=principal.user_id,
                )
                assigned_members.append(member)
            except Exception:
                pass
    
    # 4. Create branches
    created_branches: list[BranchConfig] = []
    
    # Always create default branch
    default_branch_config = BranchConfig(
        name=request.default_branch,
        is_default=True,
        is_protected=True,
        require_reviews=1,
    )
    _create_branch(engine, project_id, default_branch_config, request.team_id)
    created_branches.append(default_branch_config)
    
    # Create additional branches
    for branch in request.branches:
        if branch.name != request.default_branch:
            _create_branch(engine, project_id, branch, request.team_id)
            created_branches.append(branch)
    
    # Get team info
    team_id, team_name = _get_team_info(engine, request.team_id)
    
    return ProjectResponse(
        id=project_id,
        name=request.name,
        full_name=project_id,
        description=request.description,
        language=request.language,
        visibility=request.visibility,
        default_branch=request.default_branch,
        status="active",
        team_id=team_id,
        team_name=team_name,
        member_count=len(assigned_members),
        members=assigned_members,
        branch_count=len(created_branches),
        branches=created_branches,
        auto_analysis_enabled=request.auto_analysis_enabled,
        health_score=0,
        analysis_count=0,
        last_analysis_at=None,
        created_at=now.isoformat(),
        updated_at=now.isoformat(),
    )


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    team_id: str | None = Query(None),
    status: str | None = Query(None),
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> ProjectListResponse:
    """
    List all projects accessible to the current user.
    """
    enforce_permission(principal, "analyses.read")

    engine = get_engine()
    repo_profiles = RepoProfilesRepo()
    rbac_repo = RBACRepo()
    settings_repo = ProjectSettingsRepo()

    from sqlalchemy import text
    
    # Build query conditions
    conditions = []
    params: dict[str, Any] = {"limit": limit, "offset": (page - 1) * limit}
    
    if search:
        conditions.append("repo ILIKE :search")
        params["search"] = f"%{search}%"
    
    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    
    # Get projects from analyses (repositories with analyses)
    query = text(f"""
        WITH project_stats AS (
            SELECT 
                repo as project_id,
                COUNT(*) as analysis_count,
                MAX(created_at) as last_analysis_at,
                MIN(created_at) as first_seen
            FROM analyses
            {where_clause}
            GROUP BY repo
        )
        SELECT * FROM project_stats
        ORDER BY last_analysis_at DESC NULLS LAST
        LIMIT :limit OFFSET :offset
    """)
    
    count_query = text(f"""
        SELECT COUNT(DISTINCT repo) as total
        FROM analyses
        {where_clause}
    """)
    
    items: list[ProjectResponse] = []
    total = 0
    
    with engine.connect() as conn:
        # Get total
        count_result = conn.execute(count_query, params)
        count_row = count_result.mappings().first()
        total = count_row.get("total") or 0 if count_row else 0
        
        # Get projects
        result = conn.execute(query, params)
        
        for row in result.mappings().all():
            project_id = row["project_id"]
            
            # Get profile
            profile = repo_profiles.get_profile(project_id)
            profile_data = profile.profile if profile else {}
            
            # Get settings
            settings = settings_repo.get_settings(project_id)
            
            # Get stats
            stats = _get_project_stats(engine, project_id)
            
            # Get members
            members = _get_project_members(engine, project_id, rbac_repo)
            
            # Get branches
            branches = _get_project_branches(engine, project_id)
            
            # Get team info
            org_id = settings.organization_id if settings else None
            team_id_val, team_name = _get_team_info(engine, org_id)
            
            # Parse name
            parts = project_id.split("/")
            name = profile_data.get("name") or (parts[-1] if parts else project_id)
            
            items.append(ProjectResponse(
                id=project_id,
                name=name,
                full_name=project_id,
                description=profile_data.get("description"),
                language=profile_data.get("primary_language"),
                visibility=profile_data.get("visibility", "private"),
                default_branch=profile.default_branch if profile else "main",
                status="active",
                team_id=team_id_val,
                team_name=team_name,
                member_count=len(members),
                members=members[:5],  # Limit to first 5 for list view
                branch_count=len(branches),
                branches=branches[:5],  # Limit to first 5 for list view
                auto_analysis_enabled=settings.auto_analysis_enabled if settings else True,
                health_score=stats["health_score"],
                analysis_count=stats["analysis_count"],
                last_analysis_at=stats["last_analysis_at"],
                created_at=row["first_seen"].isoformat() if row.get("first_seen") else datetime.now(timezone.utc).isoformat(),
                updated_at=row["last_analysis_at"].isoformat() if row.get("last_analysis_at") else datetime.now(timezone.utc).isoformat(),
            ))
    
    return ProjectListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
    )


# ── Temporary Fallback Endpoint ───────────────────────────────────────────────

# Legacy endpoint removed - now handled by main /api/v1/projects endpoint


@router.get("/{project_id:path}/details", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> ProjectResponse:
    """
    Get detailed project information.
    """
    enforce_permission(principal, "analyses.read")

    engine = get_engine()
    repo_profiles = RepoProfilesRepo()
    rbac_repo = RBACRepo()
    settings_repo = ProjectSettingsRepo()

    # Get profile
    profile = repo_profiles.get_profile(project_id)
    
    # Get stats
    stats = _get_project_stats(engine, project_id)
    
    if not profile and stats["analysis_count"] == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    profile_data = profile.profile if profile else {}
    
    # Get settings
    settings = settings_repo.get_settings(project_id)
    
    # Get members
    members = _get_project_members(engine, project_id, rbac_repo)
    
    # Get branches  
    branches = _get_project_branches(engine, project_id)
    
    # Get team info
    org_id = settings.organization_id if settings else None
    team_id, team_name = _get_team_info(engine, org_id)
    
    # Parse name
    parts = project_id.split("/")
    name = profile_data.get("name") or (parts[-1] if parts else project_id)
    
    now = datetime.now(timezone.utc).isoformat()
    
    return ProjectResponse(
        id=project_id,
        name=name,
        full_name=project_id,
        description=profile_data.get("description"),
        language=profile_data.get("primary_language"),
        visibility=profile_data.get("visibility", "private"),
        default_branch=profile.default_branch if profile else "main",
        status="active",
        team_id=team_id,
        team_name=team_name,
        member_count=len(members),
        members=members,
        branch_count=len(branches),
        branches=branches,
        auto_analysis_enabled=settings.auto_analysis_enabled if settings else True,
        health_score=stats["health_score"],
        analysis_count=stats["analysis_count"],
        last_analysis_at=stats["last_analysis_at"],
        created_at=now,
        updated_at=now,
    )


@router.patch("/{project_id:path}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    request: UpdateProjectRequest,
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> ProjectResponse:
    """
    Update project settings.
    """
    enforce_permission(principal, "analyses.create")

    repo_profiles = RepoProfilesRepo()
    settings_repo = ProjectSettingsRepo()
    
    # Get existing profile
    profile = repo_profiles.get_profile(project_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Update profile
    profile_data = profile.profile or {}
    
    if request.name is not None:
        profile_data["name"] = request.name
    if request.description is not None:
        profile_data["description"] = request.description
    if request.visibility is not None:
        profile_data["visibility"] = request.visibility
    
    default_branch = request.default_branch or profile.default_branch
    
    repo_profiles.upsert_profile(
        repo_id=project_id,
        repo_path=profile.repo_path,
        indexed_commit=profile.indexed_commit,
        default_branch=default_branch,
        profile=profile_data,
    )
    
    # Update settings if needed
    if request.auto_analysis_enabled is not None:
        settings_repo.set_auto_analysis_enabled(
            project_id=project_id,
            enabled=request.auto_analysis_enabled,
            changed_by=principal.user_id,
            reason="Updated via API",
        )
    
    if request.team_id is not None:
        # Update organization_id in settings
        settings = settings_repo.get_or_create_settings(project_id, request.team_id)
    
    # Return updated project
    return await get_project(project_id, principal)
