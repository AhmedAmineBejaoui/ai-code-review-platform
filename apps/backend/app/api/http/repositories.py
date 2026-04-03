"""
Repository management API endpoints.

Provides CRUD operations for repositories and their metadata.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field

from app.api.middleware.auth import AuthenticatedPrincipal, get_current_principal, require_permission
from app.data.database import get_engine
from app.data.repos.repo_profiles_repo import RepoProfilesRepo

router = APIRouter(prefix="/api/v1/repositories", tags=["repositories"])


class RepositoryResponse(BaseModel):
    """Response model for a repository."""
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    full_name: str
    description: str | None = None
    language: str | None = None
    visibility: Literal["public", "private", "internal"] = "private"
    default_branch: str | None = "main"
    indexed_commit: str | None = None
    
    # CI/CD status
    ci_status: Literal["passing", "failing", "unknown"] = "unknown"
    last_analysis_at: str | None = None
    analysis_count: int = 0
    
    # Quality metrics
    quality_score: float | None = None
    security_score: float | None = None
    total_findings: int = 0
    open_issues: int = 0
    
    # Timestamps
    created_at: str
    updated_at: str


class RepositoryListResponse(BaseModel):
    """Response model for repository list."""
    items: list[RepositoryResponse]
    total: int
    page: int
    limit: int
    pages: int


class CreateRepositoryRequest(BaseModel):
    """Request model for creating a repository."""
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=255)
    full_name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    language: str | None = None
    visibility: Literal["public", "private", "internal"] = "private"
    default_branch: str = "main"
    github_id: str | None = None


class UpdateRepositoryRequest(BaseModel):
    """Request model for updating a repository."""
    model_config = ConfigDict(extra="forbid")

    description: str | None = None
    visibility: Literal["public", "private", "internal"] | None = None
    default_branch: str | None = None


def _get_repository_stats(engine, repo_id: str) -> dict[str, Any]:
    """Get analysis statistics for a repository."""
    from sqlalchemy import text
    
    query = text("""
        SELECT 
            COUNT(*) as analysis_count,
            MAX(created_at) as last_analysis_at,
            SUM(findings_count) as total_findings,
            SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_count,
            SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed_count
        FROM analyses
        WHERE repo = :repo_id
    """)
    
    with engine.connect() as conn:
        result = conn.execute(query, {"repo_id": repo_id})
        row = result.mappings().first()
        
        if row:
            analysis_count = row.get("analysis_count") or 0
            completed = row.get("completed_count") or 0
            failed = row.get("failed_count") or 0
            
            # Determine CI status based on recent analyses
            if analysis_count == 0:
                ci_status = "unknown"
            elif failed > completed:
                ci_status = "failing"
            else:
                ci_status = "passing"
            
            return {
                "analysis_count": analysis_count,
                "last_analysis_at": row.get("last_analysis_at").isoformat() if row.get("last_analysis_at") else None,
                "total_findings": row.get("total_findings") or 0,
                "ci_status": ci_status,
            }
    
    return {
        "analysis_count": 0,
        "last_analysis_at": None,
        "total_findings": 0,
        "ci_status": "unknown",
    }


def _get_security_findings_count(engine, repo_id: str) -> int:
    """Get count of security findings for a repository."""
    from sqlalchemy import text
    
    query = text("""
        SELECT COUNT(*) as count
        FROM findings f
        JOIN analyses a ON f.analysis_id = a.id
        WHERE a.repo = :repo_id AND f.category = 'security'
    """)
    
    with engine.connect() as conn:
        result = conn.execute(query, {"repo_id": repo_id})
        row = result.mappings().first()
        return row.get("count") or 0 if row else 0


@router.get("", response_model=RepositoryListResponse)
async def list_repositories(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    language: str | None = Query(None),
    visibility: str | None = Query(None),
    search: str | None = Query(None),
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> RepositoryListResponse:
    """
    List repositories accessible to the current user.
    
    Supports filtering by language, visibility, and search term.
    Returns paginated results with analysis statistics.
    """
    await require_permission(principal, "analyses.read")
    
    engine = get_engine()
    repo_profiles = RepoProfilesRepo()
    
    # Get distinct repositories from analyses
    from sqlalchemy import text
    
    conditions = []
    params: dict[str, Any] = {"limit": limit, "offset": (page - 1) * limit}
    
    if search:
        conditions.append("repo ILIKE :search")
        params["search"] = f"%{search}%"
    
    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    
    # Get repositories from analyses table
    query = text(f"""
        WITH repo_stats AS (
            SELECT 
                repo,
                COUNT(*) as analysis_count,
                MAX(created_at) as last_analysis_at,
                SUM(findings_count) as total_findings,
                SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_count,
                SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed_count,
                MIN(created_at) as first_seen
            FROM analyses
            {where_clause}
            GROUP BY repo
        )
        SELECT * FROM repo_stats
        ORDER BY last_analysis_at DESC NULLS LAST
        LIMIT :limit OFFSET :offset
    """)
    
    count_query = text(f"""
        SELECT COUNT(DISTINCT repo) as total
        FROM analyses
        {where_clause}
    """)
    
    items = []
    total = 0
    
    with engine.connect() as conn:
        # Get total count
        count_result = conn.execute(count_query, params)
        count_row = count_result.mappings().first()
        total = count_row.get("total") or 0 if count_row else 0
        
        # Get repositories
        result = conn.execute(query, params)
        rows = result.mappings().all()
        
        for row in rows:
            repo_name = row["repo"]
            
            # Try to get profile for additional info
            profile = repo_profiles.get_profile(repo_name)
            
            # Parse repo name
            parts = repo_name.split("/")
            name = parts[-1] if parts else repo_name
            
            # Determine CI status
            analysis_count = row.get("analysis_count") or 0
            completed = row.get("completed_count") or 0
            failed = row.get("failed_count") or 0
            
            if analysis_count == 0:
                ci_status = "unknown"
            elif failed > completed:
                ci_status = "failing"
            else:
                ci_status = "passing"
            
            # Get security findings count
            security_count = _get_security_findings_count(engine, repo_name)
            
            items.append(RepositoryResponse(
                id=repo_name,
                name=name,
                full_name=repo_name,
                description=profile.profile.get("description") if profile else None,
                language=profile.profile.get("primary_language") if profile else None,
                visibility="private",  # Default, could be enhanced with GitHub API
                default_branch=profile.default_branch if profile else "main",
                indexed_commit=profile.indexed_commit if profile else None,
                ci_status=ci_status,
                last_analysis_at=row["last_analysis_at"].isoformat() if row.get("last_analysis_at") else None,
                analysis_count=analysis_count,
                quality_score=None,  # Could compute from findings
                security_score=None,  # Could compute from security findings
                total_findings=row.get("total_findings") or 0,
                open_issues=security_count,
                created_at=row["first_seen"].isoformat() if row.get("first_seen") else datetime.now(timezone.utc).isoformat(),
                updated_at=row["last_analysis_at"].isoformat() if row.get("last_analysis_at") else datetime.now(timezone.utc).isoformat(),
            ))
    
    pages = (total + limit - 1) // limit if total > 0 else 1
    
    return RepositoryListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.get("/{repo_id:path}", response_model=RepositoryResponse)
async def get_repository(
    repo_id: str,
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> RepositoryResponse:
    """
    Get a specific repository by ID (full name like owner/repo).
    """
    await require_permission(principal, "analyses.read")
    
    engine = get_engine()
    repo_profiles = RepoProfilesRepo()
    
    # Get stats
    stats = _get_repository_stats(engine, repo_id)
    
    if stats["analysis_count"] == 0:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    # Get profile
    profile = repo_profiles.get_profile(repo_id)
    
    # Parse repo name
    parts = repo_id.split("/")
    name = parts[-1] if parts else repo_id
    
    # Get security findings
    security_count = _get_security_findings_count(engine, repo_id)
    
    return RepositoryResponse(
        id=repo_id,
        name=name,
        full_name=repo_id,
        description=profile.profile.get("description") if profile else None,
        language=profile.profile.get("primary_language") if profile else None,
        visibility="private",
        default_branch=profile.default_branch if profile else "main",
        indexed_commit=profile.indexed_commit if profile else None,
        ci_status=stats["ci_status"],
        last_analysis_at=stats["last_analysis_at"],
        analysis_count=stats["analysis_count"],
        quality_score=None,
        security_score=None,
        total_findings=stats["total_findings"],
        open_issues=security_count,
        created_at=datetime.now(timezone.utc).isoformat(),  # Could track first analysis
        updated_at=stats["last_analysis_at"] or datetime.now(timezone.utc).isoformat(),
    )


@router.post("", response_model=RepositoryResponse, status_code=status.HTTP_201_CREATED)
async def create_repository(
    request: CreateRepositoryRequest,
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> RepositoryResponse:
    """
    Register a new repository for analysis tracking.
    """
    await require_permission(principal, "analyses.create")
    
    repo_profiles = RepoProfilesRepo()
    
    # Create repo profile
    profile = repo_profiles.upsert_profile(
        repo_id=request.full_name,
        repo_path=None,
        indexed_commit=None,
        default_branch=request.default_branch,
        profile={
            "description": request.description,
            "primary_language": request.language,
            "github_id": request.github_id,
        },
    )
    
    # Parse repo name
    parts = request.full_name.split("/")
    name = parts[-1] if parts else request.full_name
    
    now = datetime.now(timezone.utc).isoformat()
    
    return RepositoryResponse(
        id=request.full_name,
        name=name,
        full_name=request.full_name,
        description=request.description,
        language=request.language,
        visibility=request.visibility,
        default_branch=request.default_branch,
        indexed_commit=None,
        ci_status="unknown",
        last_analysis_at=None,
        analysis_count=0,
        quality_score=None,
        security_score=None,
        total_findings=0,
        open_issues=0,
        created_at=now,
        updated_at=now,
    )
