"""
Repositories API routes.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text

from ..database import get_engine
from ..repositories import RepoProfilesRepo, ProjectProfilesRepo, ProjectSettingsRepo, BranchesRepo

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/repositories", tags=["repositories"])


# ============ Request/Response Models ============

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
    ci_status: Literal["passing", "failing", "unknown"] = "unknown"
    last_analysis_at: str | None = None
    analysis_count: int = 0
    quality_score: float | None = None
    security_score: float | None = None
    total_findings: int = 0
    open_issues: int = 0
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
    model_config = ConfigDict(extra="ignore")

    name: str | None = Field(None, max_length=255)
    full_name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    language: str | None = None
    visibility: Literal["public", "private", "internal"] = "private"
    default_branch: str = "main"
    github_id: str | None = None
    source: str | None = None


class UpdateRepositoryRequest(BaseModel):
    """Request model for updating a repository."""
    model_config = ConfigDict(extra="forbid")

    description: str | None = None
    visibility: Literal["public", "private", "internal"] | None = None
    default_branch: str | None = None


class GitHubImportMember(BaseModel):
    """A GitHub collaborator/org member to import."""
    model_config = ConfigDict(extra="ignore")
    github_login: str
    email: str | None = None
    display_name: str | None = None
    role: str = "developer"


class GitHubImportBranch(BaseModel):
    """A branch to import from GitHub."""
    model_config = ConfigDict(extra="ignore")
    name: str
    is_default: bool = False
    last_commit_sha: str | None = None
    last_commit_message: str | None = None
    last_commit_author: str | None = None
    last_commit_at: str | None = None


class GitHubImportCommit(BaseModel):
    """A commit to import from GitHub."""
    model_config = ConfigDict(extra="ignore")
    sha: str
    branch_name: str
    message: str | None = None
    author_name: str | None = None
    author_email: str | None = None
    authored_at: str | None = None
    committer_name: str | None = None
    committer_email: str | None = None
    committed_at: str | None = None
    parent_shas: list[str] = []


class GitHubImportRequest(BaseModel):
    """Full import payload sent by the BFF."""
    model_config = ConfigDict(extra="ignore")
    full_name: str
    project_name: str | None = None
    description: str | None = None
    visibility: Literal["public", "private", "internal"] = "private"
    default_branch: str = "main"
    github_id: str | None = None
    language: str | None = None
    org_github_login: str | None = None
    org_name: str | None = None
    branches: list[GitHubImportBranch] = []
    commits: list[GitHubImportCommit] = []
    members: list[GitHubImportMember] = []


class MemberToInvite(BaseModel):
    email: str | None = None
    github_login: str | None = None
    role: str
    project_id: str


class GitHubImportResponse(BaseModel):
    repository: RepositoryResponse
    branches_imported: int
    commits_imported: int
    members_to_invite: list[MemberToInvite]
    project_id: str


# ============ Helper Functions ============

def _get_repository_stats(engine, repo_id: str) -> dict[str, Any]:
    """Get analysis statistics for a repository."""
    query = text("""
        SELECT
            COUNT(*) as analysis_count,
            MAX(a.created_at) as last_analysis_at,
            COALESCE(SUM(fc.cnt), 0) as total_findings,
            SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_count,
            SUM(CASE WHEN a.status = 'FAILED' THEN 1 ELSE 0 END) as failed_count
        FROM analyses a
        LEFT JOIN (SELECT analysis_id, COUNT(*) as cnt FROM findings GROUP BY analysis_id) fc
            ON fc.analysis_id = a.id
        WHERE a.repo = :repo_id
    """)
    
    with engine.connect() as conn:
        result = conn.execute(query, {"repo_id": repo_id})
        row = result.mappings().first()
        
        if row:
            analysis_count = row.get("analysis_count") or 0
            completed = row.get("completed_count") or 0
            failed = row.get("failed_count") or 0
            
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


def _parse_dt(raw: str | None) -> datetime | None:
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except Exception:
        return None


# ============ API Endpoints ============

@router.get("", response_model=RepositoryListResponse)
async def list_repositories(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    language: str | None = Query(None),
    visibility: str | None = Query(None),
    search: str | None = Query(None),
) -> RepositoryListResponse:
    """List repositories with pagination."""
    engine = get_engine()
    repo_profiles = RepoProfilesRepo(engine)

    conditions = []
    params: dict[str, Any] = {"limit": limit, "offset": (page - 1) * limit}
    
    if search:
        conditions.append("a.repo ILIKE :search")
        params["search"] = f"%{search}%"

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    
    query = text(f"""
        WITH repo_stats AS (
            SELECT
                a.repo,
                COUNT(*) as analysis_count,
                MAX(a.created_at) as last_analysis_at,
                COALESCE(SUM(fc.cnt), 0) as total_findings,
                SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_count,
                SUM(CASE WHEN a.status = 'FAILED' THEN 1 ELSE 0 END) as failed_count,
                MIN(a.created_at) as first_seen
            FROM analyses a
            LEFT JOIN (SELECT analysis_id, COUNT(*) as cnt FROM findings GROUP BY analysis_id) fc
                ON fc.analysis_id = a.id
            {where_clause}
            GROUP BY a.repo
        )
        SELECT * FROM repo_stats
        ORDER BY last_analysis_at DESC NULLS LAST
        LIMIT :limit OFFSET :offset
    """)
    
    count_query = text(f"""
        SELECT COUNT(DISTINCT a.repo) as total
        FROM analyses a
        {where_clause}
    """)
    
    items = []
    total = 0
    
    with engine.connect() as conn:
        count_result = conn.execute(count_query, params)
        count_row = count_result.mappings().first()
        total = count_row.get("total") or 0 if count_row else 0
        
        result = conn.execute(query, params)
        rows = result.mappings().all()
        
        for row in rows:
            repo_name = row["repo"]
            profile = repo_profiles.get_profile(repo_name)
            
            parts = repo_name.split("/")
            name = parts[-1] if parts else repo_name
            
            analysis_count = row.get("analysis_count") or 0
            completed = row.get("completed_count") or 0
            failed = row.get("failed_count") or 0
            
            if analysis_count == 0:
                ci_status = "unknown"
            elif failed > completed:
                ci_status = "failing"
            else:
                ci_status = "passing"
            
            security_count = _get_security_findings_count(engine, repo_name)
            
            items.append(RepositoryResponse(
                id=repo_name,
                name=name,
                full_name=repo_name,
                description=profile.profile.get("description") if profile else None,
                language=profile.profile.get("primary_language") if profile else None,
                visibility="private",
                default_branch=profile.default_branch if profile else "main",
                indexed_commit=profile.indexed_commit if profile else None,
                ci_status=ci_status,
                last_analysis_at=row["last_analysis_at"].isoformat() if row.get("last_analysis_at") else None,
                analysis_count=analysis_count,
                quality_score=None,
                security_score=None,
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
async def get_repository(repo_id: str) -> RepositoryResponse:
    """Get a specific repository by ID."""
    engine = get_engine()
    repo_profiles = RepoProfilesRepo(engine)

    stats = _get_repository_stats(engine, repo_id)
    
    if stats["analysis_count"] == 0:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    profile = repo_profiles.get_profile(repo_id)
    
    parts = repo_id.split("/")
    name = parts[-1] if parts else repo_id
    
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
        created_at=datetime.now(timezone.utc).isoformat(),
        updated_at=stats["last_analysis_at"] or datetime.now(timezone.utc).isoformat(),
    )


@router.post("", response_model=RepositoryResponse, status_code=status.HTTP_201_CREATED)
async def create_repository(request: CreateRepositoryRequest) -> RepositoryResponse:
    """Register a new repository for analysis tracking."""
    repo_profiles = RepoProfilesRepo()

    parts = request.full_name.split("/")
    name = request.name or (parts[-1] if parts else request.full_name)

    repo_profiles.upsert_profile(
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


@router.post("/import-full", response_model=GitHubImportResponse, status_code=status.HTTP_201_CREATED)
async def import_repository_full(request: GitHubImportRequest) -> GitHubImportResponse:
    """Full GitHub repository import in one step."""
    engine = get_engine()
    repo_profiles = RepoProfilesRepo(engine)
    project_profiles = ProjectProfilesRepo(engine)
    settings_repo = ProjectSettingsRepo(engine)
    branches_repo = BranchesRepo(engine)

    repo_id = request.full_name.strip().lower()
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    parts = repo_id.split("/")
    repo_name = parts[-1] if parts else repo_id
    project_name = request.project_name or repo_name

    # Resolve organization
    org_id: str | None = None
    if request.org_github_login:
        try:
            with engine.begin() as conn:
                existing_org = conn.execute(
                    text("""
                        SELECT id FROM organizations
                        WHERE github_org_login = :github_login
                           OR slug = :github_login
                           OR id = :github_login
                        LIMIT 1
                    """),
                    {"github_login": request.org_github_login},
                ).mappings().first()

                if existing_org:
                    org_id = str(existing_org["id"])
                else:
                    org_id = request.org_github_login
                    conn.execute(
                        text("""
                            INSERT INTO organizations (id, slug, name, description, github_org_login, source, sync_status, is_active, created_at, updated_at)
                            VALUES (:id, :slug, :name, :description, :github_org_login, 'legacy', 'github_only', TRUE, :created_at, :updated_at)
                            ON CONFLICT (id) DO UPDATE SET
                                name = COALESCE(EXCLUDED.name, organizations.name),
                                is_active = TRUE,
                                updated_at = EXCLUDED.updated_at
                        """),
                        {
                            "id": org_id,
                            "slug": request.org_github_login,
                            "name": request.org_name or request.org_github_login,
                            "description": request.description,
                            "github_org_login": request.org_github_login,
                            "created_at": now,
                            "updated_at": now,
                        },
                    )
        except Exception:
            org_id = request.org_github_login

    # Create project profile
    project_id = project_profiles.ensure_project_profile(
        repo_id=repo_id,
        org_id=org_id,
        display_name=project_name,
        description=request.description,
        primary_language=request.language,
        visibility=request.visibility,
    )

    # Create repo profile
    repo_profiles.upsert_profile(
        repo_id=repo_id,
        repo_path=None,
        indexed_commit=None,
        default_branch=request.default_branch,
        profile={
            "name": project_name,
            "description": request.description,
            "primary_language": request.language,
            "github_id": request.github_id,
            "visibility": request.visibility,
            "org_github_login": request.org_github_login,
            "org_name": request.org_name,
        },
    )

    # Store branches
    branches_imported = 0
    branch_id_map: dict[str, str] = {}
    for b in request.branches:
        bid = f"br_{uuid.uuid4().hex[:16]}"
        branch_type = "main" if b.is_default else "custom"
        try:
            branches_repo.create(
                branch_id=bid,
                repo_id=project_id,
                branch_name=b.name,
                branch_type=branch_type,
                org_id=org_id,
                is_default=b.is_default,
                is_protected=b.is_default,
            )
            branch_id_map[b.name] = bid
            branches_imported += 1
        except Exception:
            pass

    # Bulk insert commits
    commits_imported = 0
    if request.commits:
        import json as _json
        commit_rows = []
        seen_shas: set[str] = set()
        for c in request.commits:
            if c.sha in seen_shas:
                continue
            seen_shas.add(c.sha)
            commit_rows.append({
                "id": f"cm_{uuid.uuid4().hex[:20]}",
                "repo_id": project_id,
                "branch_id": branch_id_map.get(c.branch_name),
                "branch_name": c.branch_name,
                "sha": c.sha,
                "message": c.message,
                "author_name": c.author_name,
                "author_email": c.author_email,
                "authored_at": _parse_dt(c.authored_at),
                "committer_name": c.committer_name,
                "committer_email": c.committer_email,
                "committed_at": _parse_dt(c.committed_at),
                "parent_shas": _json.dumps(c.parent_shas),
            })
        if commit_rows:
            try:
                with engine.begin() as conn:
                    conn.execute(
                        text("""
                            INSERT INTO repo_commits (
                                id, repo_id, branch_id, branch_name, sha, message,
                                author_name, author_email, authored_at,
                                committer_name, committer_email, committed_at, parent_shas
                            ) VALUES (
                                :id, :repo_id, :branch_id, :branch_name, :sha, :message,
                                :author_name, :author_email, :authored_at,
                                :committer_name, :committer_email, :committed_at,
                                CAST(:parent_shas AS jsonb)
                            )
                            ON CONFLICT DO NOTHING
                        """),
                        commit_rows,
                    )
                    commits_imported = len(commit_rows)
            except Exception:
                pass

    # Create project settings
    settings_repo.get_or_create_settings(project_id=repo_id, organization_id=org_id)

    # Create pending invitations for members
    members_to_invite: list[MemberToInvite] = []
    if request.members:
        for member in request.members:
            if not member.github_login:
                continue
            try:
                with engine.begin() as conn:
                    conn.execute(
                        text("""
                            INSERT INTO pending_project_invitations
                                (id, project_id, email, github_login, role_code, invited_by, status)
                            VALUES (:id, :project_id, :email, :github_login, :role_code, :invited_by, 'pending')
                            ON CONFLICT DO NOTHING
                        """),
                        {
                            "id": f"inv_{uuid.uuid4().hex[:20]}",
                            "project_id": project_id,
                            "email": member.email.lower().strip() if member.email else None,
                            "github_login": member.github_login,
                            "role_code": member.role,
                            "invited_by": None,
                        },
                    )
                members_to_invite.append(MemberToInvite(
                    email=member.email.lower().strip() if member.email else None,
                    github_login=member.github_login,
                    role=member.role,
                    project_id=project_id,
                ))
            except Exception:
                pass

    return GitHubImportResponse(
        repository=RepositoryResponse(
            id=project_id,
            name=repo_name,
            full_name=repo_id,
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
            created_at=now_iso,
            updated_at=now_iso,
        ),
        project_id=project_id,
        branches_imported=branches_imported,
        commits_imported=commits_imported,
        members_to_invite=members_to_invite,
    )
