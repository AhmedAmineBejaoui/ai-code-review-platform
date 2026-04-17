"""
Branches API routes.
"""

import logging
import uuid
from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, Query, Response, status
from pydantic import BaseModel, ConfigDict, Field

from ..database import get_engine
from ..repositories import BranchesRepo

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/branches", tags=["branches"])


# ============ Request/Response Models ============

class CreateBranchRequest(BaseModel):
    """Request to create a branch."""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    repo_id: str = Field(max_length=255)
    org_id: str | None = None
    branch_name: str = Field(min_length=1, max_length=255)
    branch_type: Literal["main", "develop", "feature", "hotfix", "release", "custom"]
    base_branch: str | None = None
    description: str | None = Field(default=None, max_length=1000)
    is_protected: bool = False
    is_default: bool = False


class UpdateBranchRequest(BaseModel):
    """Request to update a branch."""
    model_config = ConfigDict(extra="forbid")

    description: str | None = None
    is_protected: bool | None = None
    is_active: bool | None = None


class BranchResponse(BaseModel):
    """Response for a branch."""
    id: str
    repo_id: str
    org_id: str | None
    branch_name: str
    branch_type: str
    branch_pattern: str | None
    last_commit_sha: str | None
    last_commit_author: str | None
    last_commit_message: str | None
    last_commit_at: str | None
    created_by: str | None
    created_at: str
    base_branch: str | None
    merged_into: str | None
    merge_status: str | None
    merged_at: str | None
    merged_by: str | None
    is_protected: bool
    is_default: bool
    is_active: bool
    ahead_count: int
    behind_count: int
    last_synced_at: str | None
    description: str | None
    metadata_json: dict[str, Any]
    updated_at: str


class BranchListResponse(BaseModel):
    """Response for list of branches."""
    branches: list[BranchResponse]
    total: int
    page: int
    limit: int


class ValidationErrorDetail(BaseModel):
    """Validation error detail."""
    field: str
    message: str
    violated_policies: list[str] | None = None


class CreateBranchResponse(BaseModel):
    """Response for branch creation."""
    branch: BranchResponse
    validation_warnings: list[ValidationErrorDetail] | None = None


# ============ Helper Functions ============

def _serialize_branch(branch) -> dict[str, Any]:
    """Serialize a branch for API response."""
    return {
        "id": branch.id,
        "repo_id": branch.repo_id,
        "org_id": branch.org_id,
        "branch_name": branch.branch_name,
        "branch_type": branch.branch_type,
        "branch_pattern": branch.branch_pattern,
        "last_commit_sha": branch.last_commit_sha,
        "last_commit_author": branch.last_commit_author,
        "last_commit_message": branch.last_commit_message,
        "last_commit_at": branch.last_commit_at.isoformat() if branch.last_commit_at else None,
        "created_by": branch.created_by,
        "created_at": branch.created_at.isoformat() if isinstance(branch.created_at, datetime) else str(branch.created_at) if branch.created_at else "",
        "base_branch": branch.base_branch,
        "merged_into": branch.merged_into,
        "merge_status": branch.merge_status,
        "merged_at": branch.merged_at.isoformat() if branch.merged_at else None,
        "merged_by": branch.merged_by,
        "is_protected": branch.is_protected,
        "is_default": branch.is_default,
        "is_active": branch.is_active,
        "ahead_count": branch.ahead_count or 0,
        "behind_count": branch.behind_count or 0,
        "last_synced_at": branch.last_synced_at.isoformat() if branch.last_synced_at else None,
        "description": branch.description,
        "metadata_json": branch.metadata_json or {},
        "updated_at": branch.updated_at.isoformat() if isinstance(branch.updated_at, datetime) else str(branch.updated_at) if branch.updated_at else "",
    }


# ============ API Endpoints ============

@router.post("", response_model=CreateBranchResponse, status_code=status.HTTP_201_CREATED)
async def create_branch(data: CreateBranchRequest) -> CreateBranchResponse:
    """Create a new branch."""
    branch_repo = BranchesRepo()

    # Check if branch exists
    existing = branch_repo.get_by_repo_and_name(data.repo_id, data.branch_name)
    if existing:
        raise HTTPException(
            status_code=409,
            detail={"error": "branch_exists", "message": f"Branch '{data.branch_name}' already exists"},
        )

    branch_id = f"branch_{uuid.uuid4().hex}"

    # Determine branch pattern
    branch_pattern = None
    if data.branch_type in ["feature", "hotfix", "release"]:
        branch_pattern = f"{data.branch_type}/*"

    branch = branch_repo.create(
        branch_id=branch_id,
        repo_id=data.repo_id,
        branch_name=data.branch_name,
        branch_type=data.branch_type,
        org_id=data.org_id,
        is_default=data.is_default,
        is_protected=data.is_protected,
        base_branch=data.base_branch,
        description=data.description,
    )

    return CreateBranchResponse(
        branch=BranchResponse(**_serialize_branch(branch)),
        validation_warnings=None,
    )


@router.get("", response_model=BranchListResponse)
async def list_branches(
    repo_id: str | None = Query(None),
    org_id: str | None = Query(None),
    branch_type: str | None = Query(None),
    is_protected: bool | None = Query(None),
    is_active: bool | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
) -> BranchListResponse:
    """List branches with filters and pagination."""
    branch_repo = BranchesRepo()

    if not repo_id:
        return BranchListResponse(branches=[], total=0, page=page, limit=limit)

    offset = (page - 1) * limit
    branches, total = branch_repo.list_by_repo(
        repo_id=repo_id,
        is_protected=is_protected,
        is_active=is_active,
        limit=limit,
        offset=offset,
    )

    return BranchListResponse(
        branches=[BranchResponse(**_serialize_branch(b)) for b in branches],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/{branch_id}", response_model=BranchResponse)
async def get_branch(branch_id: str) -> BranchResponse:
    """Get branch details."""
    branch_repo = BranchesRepo()

    branch = branch_repo.get_by_id(branch_id)
    if not branch:
        raise HTTPException(
            status_code=404, 
            detail={"error": "branch_not_found", "message": "Branch not found"}
        )

    return BranchResponse(**_serialize_branch(branch))


@router.patch("/{branch_id}", response_model=BranchResponse)
async def update_branch(branch_id: str, data: UpdateBranchRequest) -> BranchResponse:
    """Update a branch."""
    branch_repo = BranchesRepo()

    branch = branch_repo.get_by_id(branch_id)
    if not branch:
        raise HTTPException(
            status_code=404, 
            detail={"error": "branch_not_found", "message": "Branch not found"}
        )

    updated_branch = branch_repo.update(
        branch_id=branch_id,
        description=data.description,
        is_protected=data.is_protected,
        is_active=data.is_active,
    )

    if not updated_branch:
        raise HTTPException(status_code=500, detail="Failed to update branch")

    return BranchResponse(**_serialize_branch(updated_branch))


@router.delete("/{branch_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_branch(
    branch_id: str,
    force: bool = Query(False, description="Force delete even if protected"),
) -> Response:
    """Delete a branch."""
    branch_repo = BranchesRepo()

    branch = branch_repo.get_by_id(branch_id)
    if not branch:
        raise HTTPException(
            status_code=404, 
            detail={"error": "branch_not_found", "message": "Branch not found"}
        )

    if branch.is_protected and not force:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "branch_protected",
                "message": "Cannot delete protected branch without force=true",
            },
        )

    branch_repo.delete(branch_id)
    return Response(status_code=204)


@router.post("/{branch_id}/set-default", response_model=BranchResponse)
async def set_default_branch(branch_id: str) -> BranchResponse:
    """Set a branch as default."""
    branch_repo = BranchesRepo()

    branch = branch_repo.get_by_id(branch_id)
    if not branch:
        raise HTTPException(
            status_code=404, 
            detail={"error": "branch_not_found", "message": "Branch not found"}
        )

    branch_repo.set_default_branch(branch.repo_id, branch_id)

    updated_branch = branch_repo.get_by_id(branch_id)
    if not updated_branch:
        raise HTTPException(status_code=500, detail="Failed to get updated branch")

    return BranchResponse(**_serialize_branch(updated_branch))


@router.get("/{branch_id}/compare/{target_branch_id}")
async def compare_branches(branch_id: str, target_branch_id: str) -> dict[str, Any]:
    """Compare two branches (placeholder)."""
    raise HTTPException(
        status_code=501,
        detail={"error": "not_implemented", "message": "Branch comparison not yet implemented"},
    )
