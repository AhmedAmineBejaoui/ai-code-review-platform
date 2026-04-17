"""
Projects API routes.
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text

from ..database import get_engine
from ..repositories import ProjectProfilesRepo, RepoProfilesRepo, ProjectSettingsRepo, BranchesRepo

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


# ============ Request/Response Models ============

class ProjectMemberSchema(BaseModel):
    """Project team member."""
    user_id: str
    email: str | None = None
    display_name: str | None = None
    role: str = "developer"


class BranchConfigSchema(BaseModel):
    """Branch configuration for project."""
    name: str
    is_default: bool = False
    is_protected: bool = False
    require_reviews: int = 0


class CreateProjectRequest(BaseModel):
    """Request model for creating a project."""
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=255)
    full_name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(None, max_length=1000)
    language: str | None = None
    visibility: Literal["public", "private", "internal"] = "private"
    default_branch: str = "main"
    github_id: str | None = None
    team_id: str | None = None
    members: list[ProjectMemberSchema] = Field(default_factory=list)
    branches: list[BranchConfigSchema] = Field(default_factory=list)
    auto_analysis_enabled: bool = True


class ProjectResponse(BaseModel):
    """Response model for a project."""
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    full_name: str
    description: str | None = None
    language: str | None = None
    visibility: Literal["public", "private", "internal"] = "private"
    default_branch: str = "main"
    status: Literal["active", "maintenance", "archived"] = "active"
    team_id: str | None = None
    team_name: str | None = None
    member_count: int = 0
    members: list[ProjectMemberSchema] = []
    branch_count: int = 0
    branches: list[BranchConfigSchema] = []
    auto_analysis_enabled: bool = True
    health_score: int = 0
    analysis_count: int = 0
    last_analysis_at: str | None = None
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


# ============ Helper Functions ============

def _get_project_stats(engine, project_id: str) -> dict[str, Any]:
    """Get statistics for a project."""
    # Try to determine if project_id is a UUID
    try:
        uuid.UUID(project_id)
        use_project_id = True
    except ValueError:
        use_project_id = False
    
    if use_project_id:
        query = text("""
            SELECT 
                COUNT(*) as analysis_count,
                MAX(created_at) as last_analysis_at,
                COALESCE((
                    SELECT COUNT(*) 
                    FROM findings f 
                    WHERE f.analysis_id IN (
                        SELECT id FROM analyses a2 WHERE a2.project_id = :project_id
                    )
                ), 0) as total_findings,
                SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_count
            FROM analyses
            WHERE project_id = :project_id
        """)
        params = {"project_id": project_id}
    else:
        query = text("""
            SELECT 
                COUNT(*) as analysis_count,
                MAX(created_at) as last_analysis_at,
                COALESCE((
                    SELECT COUNT(*) 
                    FROM findings f 
                    WHERE f.analysis_id IN (
                        SELECT id FROM analyses a2 WHERE a2.repo = :repo_id
                    )
                ), 0) as total_findings,
                SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_count
            FROM analyses
            WHERE repo = :repo_id
        """)
        params = {"repo_id": project_id}
    
    with engine.connect() as conn:
        result = conn.execute(query, params)
        row = result.mappings().first()
        
        if row and row.get("analysis_count"):
            analysis_count = row["analysis_count"] or 0
            completed = row.get("completed_count") or 0
            total_findings = row.get("total_findings") or 0
            
            if analysis_count > 0:
                success_rate = completed / analysis_count
                findings_penalty = min(total_findings / 100, 0.5)
                health_score = int((success_rate * 100) * (1 - findings_penalty))
            else:
                health_score = 0
            
            return {
                "analysis_count": analysis_count,
                "last_analysis_at": row["last_analysis_at"].isoformat() if row.get("last_analysis_at") else None,
                "health_score": health_score,
            }
    
    return {"analysis_count": 0, "last_analysis_at": None, "health_score": 0}


def _get_project_branches(engine, project_id: str) -> list[BranchConfigSchema]:
    """Get branches for a project."""
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
                branches.append(BranchConfigSchema(
                    name=row["name"],
                    is_default=bool(row["is_default"]),
                    is_protected=bool(row["is_protected"]),
                    require_reviews=row["require_reviews"] or 0,
                ))
    except Exception:
        pass
    
    return branches


def _get_team_info(engine, team_id: str | None) -> tuple[str | None, str | None]:
    """Get team name from organization ID."""
    if not team_id:
        return None, None
    
    query = text("SELECT id, name FROM organizations WHERE id = :team_id LIMIT 1")
    
    try:
        with engine.connect() as conn:
            result = conn.execute(query, {"team_id": team_id})
            row = result.mappings().first()
            if row:
                return row["id"], row["name"]
    except Exception:
        pass
    
    return team_id, None


def _create_branch(engine, project_id: str, branch_config: BranchConfigSchema, org_id: str | None) -> None:
    """Create a branch record."""
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
        pass


# ============ API Endpoints ============

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(request: CreateProjectRequest) -> ProjectResponse:
    """Create a new project with team and branch configuration."""
    engine = get_engine()
    project_profiles = ProjectProfilesRepo(engine)
    repo_profiles = RepoProfilesRepo(engine)
    settings_repo = ProjectSettingsRepo(engine)

    repo_id = request.full_name.strip().lower()
    now = datetime.now(timezone.utc)

    # Create canonical project_profiles row
    project_id = project_profiles.ensure_project_profile(
        repo_id=repo_id,
        org_id=request.team_id,
        display_name=request.name,
        description=request.description,
        primary_language=request.language,
        visibility=request.visibility,
    )

    # Create repository profile
    repo_profiles.upsert_profile(
        repo_id=repo_id,
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
    
    # Create project settings
    settings_repo.get_or_create_settings(
        project_id=repo_id,
        organization_id=request.team_id,
    )

    if not request.auto_analysis_enabled:
        settings_repo.set_auto_analysis_enabled(
            project_id=repo_id,
            enabled=False,
            changed_by="system",
            reason="Disabled on project creation",
        )

    # Create branches
    created_branches: list[BranchConfigSchema] = []

    default_branch_config = BranchConfigSchema(
        name=request.default_branch,
        is_default=True,
        is_protected=True,
        require_reviews=1,
    )
    _create_branch(engine, repo_id, default_branch_config, request.team_id)
    created_branches.append(default_branch_config)

    for branch in request.branches:
        if branch.name != request.default_branch:
            _create_branch(engine, repo_id, branch, request.team_id)
            created_branches.append(branch)

    team_id, team_name = _get_team_info(engine, request.team_id)

    return ProjectResponse(
        id=project_id,
        name=request.name,
        full_name=repo_id,
        description=request.description,
        language=request.language,
        visibility=request.visibility,
        default_branch=request.default_branch,
        status="active",
        team_id=team_id,
        team_name=team_name,
        member_count=len(request.members),
        members=request.members,
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
) -> ProjectListResponse:
    """List all projects with pagination."""
    engine = get_engine()
    project_profiles = ProjectProfilesRepo(engine)
    repo_profiles_repo = RepoProfilesRepo(engine)
    settings_repo = ProjectSettingsRepo(engine)

    # Backfill project_profiles from analyses
    try:
        with engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO project_profiles (id, repo_id, context_version, analysis_status)
                    SELECT gen_random_uuid()::text, lower(a.repo), 1, 'pending'
                    FROM (SELECT DISTINCT repo FROM analyses WHERE repo IS NOT NULL) a
                    WHERE lower(a.repo) NOT IN (SELECT repo_id FROM project_profiles)
                    ON CONFLICT (repo_id) DO NOTHING
                """)
            )
    except Exception:
        pass

    items_raw, total = project_profiles.list_paginated(
        page=page,
        limit=limit,
        search=search,
        team_id=team_id,
    )

    items: list[ProjectResponse] = []
    
    for row in items_raw:
        project_id_uuid = str(row["project_id"])
        repo_id = str(row["repo_id"])

        profile = repo_profiles_repo.get_profile(repo_id)
        profile_data = profile.profile if profile else {}

        raw_meta = row.get("raw_metadata") or {}
        if isinstance(raw_meta, str):
            try:
                raw_meta = json.loads(raw_meta)
            except Exception:
                raw_meta = {}

        settings = settings_repo.get_settings(repo_id)
        branches = _get_project_branches(engine, repo_id)
        stats = _get_project_stats(engine, repo_id)
        
        stats["analysis_count"] = int(row.get("analysis_count") or 0)
        last_analysis_at_val = row.get("last_analysis_at")
        stats["last_analysis_at"] = last_analysis_at_val.isoformat() if last_analysis_at_val else None

        org_id = row.get("org_id") or (settings.organization_id if settings else None)
        team_id_val, team_name = _get_team_info(engine, org_id)

        parts = repo_id.split("/")
        name = raw_meta.get("display_name") or profile_data.get("name") or (parts[-1] if parts else repo_id)
        description = raw_meta.get("description") or row.get("business_description") or profile_data.get("description")
        language = raw_meta.get("primary_language") or profile_data.get("primary_language")
        visibility = raw_meta.get("visibility") or profile_data.get("visibility") or "private"

        created_at_val = row.get("created_at")
        updated_at_val = row.get("last_analyzed_at") or row.get("last_analysis_at") or created_at_val

        items.append(ProjectResponse(
            id=project_id_uuid,
            name=name,
            full_name=repo_id,
            description=description,
            language=language,
            visibility=visibility,
            default_branch=profile.default_branch if profile else "main",
            status="active",
            team_id=team_id_val,
            team_name=team_name,
            member_count=0,
            members=[],
            branch_count=len(branches),
            branches=branches[:5],
            auto_analysis_enabled=settings.auto_analysis_enabled if settings else True,
            health_score=stats["health_score"],
            analysis_count=stats["analysis_count"],
            last_analysis_at=stats["last_analysis_at"],
            created_at=created_at_val.isoformat() if created_at_val else datetime.now(timezone.utc).isoformat(),
            updated_at=updated_at_val.isoformat() if updated_at_val else datetime.now(timezone.utc).isoformat(),
        ))

    return ProjectListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/{project_id:path}/details", response_model=ProjectResponse)
async def get_project(project_id: str) -> ProjectResponse:
    """Get detailed project information."""
    engine = get_engine()
    project_profiles = ProjectProfilesRepo(engine)
    repo_profiles = RepoProfilesRepo(engine)
    settings_repo = ProjectSettingsRepo(engine)

    # Determine if project_id is a UUID or repo_id
    try:
        uuid.UUID(project_id)
        is_uuid = True
    except ValueError:
        is_uuid = False

    if is_uuid:
        profile_obj = project_profiles.get_by_id(project_id)
        if not profile_obj:
            raise HTTPException(status_code=404, detail="Project not found")
        repo_id = profile_obj.repo_id
    else:
        repo_id = project_id

    profile = repo_profiles.get_profile(repo_id)
    stats = _get_project_stats(engine, project_id)
    
    if not profile and stats["analysis_count"] == 0:
        raise HTTPException(status_code=404, detail="Project not found")

    profile_data = profile.profile if profile else {}
    settings = settings_repo.get_settings(repo_id)
    branches = _get_project_branches(engine, repo_id)

    org_id = settings.organization_id if settings else None
    team_id, team_name = _get_team_info(engine, org_id)

    parts = repo_id.split("/")
    name = profile_data.get("name") or (parts[-1] if parts else repo_id)

    now = datetime.now(timezone.utc).isoformat()

    return ProjectResponse(
        id=project_id if is_uuid else repo_id,
        name=name,
        full_name=repo_id,
        description=profile_data.get("description"),
        language=profile_data.get("primary_language"),
        visibility=profile_data.get("visibility", "private"),
        default_branch=profile.default_branch if profile else "main",
        status="active",
        team_id=team_id,
        team_name=team_name,
        member_count=0,
        members=[],
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
async def update_project(project_id: str, request: UpdateProjectRequest) -> ProjectResponse:
    """Update project settings."""
    engine = get_engine()
    repo_profiles = RepoProfilesRepo(engine)
    settings_repo = ProjectSettingsRepo(engine)
    
    profile = repo_profiles.get_profile(project_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Project not found")
    
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
    
    if request.auto_analysis_enabled is not None:
        settings_repo.set_auto_analysis_enabled(
            project_id=project_id,
            enabled=request.auto_analysis_enabled,
            changed_by="system",
            reason="Updated via API",
        )
    
    if request.team_id is not None:
        settings_repo.get_or_create_settings(project_id, request.team_id)
    
    return await get_project(project_id)
