from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field

from app.api.middleware.auth import AuthenticatedPrincipal, get_current_principal, require_permission
from app.data.database import get_engine
from app.data.repos.review_assignments_repo import (
    CreateReviewAssignmentInput,
    ReviewAssignmentsRepo,
    UpdateReviewAssignmentInput,
)
from app.data.repos.review_comments_repo import (
    CreateReviewCommentInput,
    ReviewCommentsRepo,
    UpdateReviewCommentInput,
)
from app.data.repos.change_requests_repo import (
    ChangeRequestsRepo,
    CreateChangeRequestInput,
    UpdateChangeRequestInput,
)

router = APIRouter(prefix="/v1/reviews", tags=["reviews"])


# Review Assignment Models
class CreateAssignmentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    analysis_id: str = Field(min_length=1)
    reviewer_id: str = Field(min_length=1)
    assignment_type: Literal["auto", "manual", "self_assigned"] = "manual"
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    due_at: str | None = None


class UpdateAssignmentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["pending", "in_progress", "completed", "declined"] | None = None
    started_at: str | None = None
    completed_at: str | None = None
    declined_reason: str | None = None


class AssignmentResponse(BaseModel):
    id: str
    analysis_id: str
    reviewer_id: str
    assigner_id: str | None
    assignment_type: str
    status: str
    priority: str
    assigned_at: str
    started_at: str | None
    completed_at: str | None
    due_at: str | None
    declined_reason: str | None
    created_at: str
    updated_at: str


# Review Comment Models
class CreateCommentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    analysis_id: str = Field(min_length=1)
    file_path: str = Field(min_length=1)
    line_start: int = Field(ge=1)
    content: str = Field(min_length=1)
    comment_type: Literal["comment", "suggestion", "question", "praise", "change_request"] = "comment"
    parent_id: str | None = None
    line_end: int | None = Field(None, ge=1)
    code_snippet: str | None = None
    severity: Literal["info", "warn", "blocker"] | None = None
    is_blocking: bool = False


class UpdateCommentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content: str | None = None
    status: Literal["open", "resolved", "wontfix"] | None = None


class CommentResponse(BaseModel):
    id: str
    analysis_id: str
    author_id: str
    parent_id: str | None
    file_path: str
    line_start: int
    line_end: int | None
    code_snippet: str | None
    content: str
    comment_type: str
    severity: str | None
    status: str
    resolved_by: str | None
    resolved_at: str | None
    is_blocking: bool
    reactions_json: dict[str, Any]
    created_at: str
    updated_at: str


# Change Request Models
class CreateChangeRequestRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    analysis_id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    category: Literal["security", "performance", "quality", "style", "tests", "documentation"]
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    related_comments: list[str] = Field(default_factory=list)
    related_findings: list[str] = Field(default_factory=list)


class UpdateChangeRequestRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["open", "in_progress", "resolved", "declined"] | None = None
    resolved_at: str | None = None
    resolution_comment: str | None = None


class ChangeRequestResponse(BaseModel):
    id: str
    analysis_id: str
    reviewer_id: str
    title: str
    description: str
    category: str
    priority: str
    related_comments: list[str]
    related_findings: list[str]
    status: str
    resolved_by: str | None
    resolved_at: str | None
    resolution_comment: str | None
    created_at: str
    updated_at: str


# Assignment Endpoints
@router.post("/assignments", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    request: CreateAssignmentRequest,
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> AssignmentResponse:
    """Create a new review assignment"""
    # Check permissions
    await require_permission(principal, "reviews.assign")

    repo = ReviewAssignmentsRepo()
    input_data = CreateReviewAssignmentInput(
        analysis_id=request.analysis_id,
        reviewer_id=request.reviewer_id,
        assigner_id=principal.user_id,
        assignment_type=request.assignment_type,
        priority=request.priority,
        due_at=request.due_at,
    )

    assignment_id = repo.create_assignment(input_data)
    assignment = repo.get_assignment_by_id(assignment_id)

    if not assignment:
        raise HTTPException(status_code=500, detail="Failed to create assignment")

    return AssignmentResponse(**dict(assignment))


@router.get("/assignments", response_model=list[AssignmentResponse])
async def list_assignments(
    reviewer_id: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> list[AssignmentResponse]:
    """List review assignments"""
    # Check permissions - users can view their own assignments, leads can view all
    if reviewer_id and reviewer_id != principal.user_id:
        await require_permission(principal, "assignments.view_all")
    else:
        await require_permission(principal, "assignments.view_own")

    repo = ReviewAssignmentsRepo()

    if reviewer_id:
        assignments = repo.get_assignments_by_reviewer(reviewer_id, status_filter, limit, offset)
    else:
        # If no reviewer_id specified, show current user's assignments
        assignments = repo.get_assignments_by_reviewer(principal.user_id, status_filter, limit, offset)

    return [AssignmentResponse(**dict(assignment)) for assignment in assignments]


@router.get("/assignments/{assignment_id}", response_model=AssignmentResponse)
async def get_assignment(
    assignment_id: str,
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> AssignmentResponse:
    """Get assignment by ID"""
    repo = ReviewAssignmentsRepo()
    assignment = repo.get_assignment_by_id(assignment_id)

    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Check permissions - can view own assignments or all if has permission
    if assignment["reviewer_id"] != principal.user_id:
        await require_permission(principal, "assignments.view_all")
    else:
        await require_permission(principal, "assignments.view_own")

    return AssignmentResponse(**dict(assignment))


@router.patch("/assignments/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment(
    assignment_id: str,
    request: UpdateAssignmentRequest,
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> AssignmentResponse:
    """Update assignment status"""
    repo = ReviewAssignmentsRepo()
    assignment = repo.get_assignment_by_id(assignment_id)

    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Check permissions - can modify own assignments or all if has permission
    if assignment["reviewer_id"] != principal.user_id:
        await require_permission(principal, "assignments.modify")
    else:
        await require_permission(principal, "assignments.view_own")

    update_data = UpdateReviewAssignmentInput(
        status=request.status,
        started_at=request.started_at,
        completed_at=request.completed_at,
        declined_reason=request.declined_reason,
    )

    success = repo.update_assignment(assignment_id, update_data)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update assignment")

    updated_assignment = repo.get_assignment_by_id(assignment_id)
    return AssignmentResponse(**dict(updated_assignment))


@router.post("/assignments/{assignment_id}/claim", response_model=AssignmentResponse)
async def claim_assignment(
    assignment_id: str,
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> AssignmentResponse:
    """Self-assign (claim) a review"""
    await require_permission(principal, "reviews.claim")

    repo = ReviewAssignmentsRepo()
    assignment = repo.get_assignment_by_id(assignment_id)

    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if assignment["status"] != "pending":
        raise HTTPException(status_code=400, detail="Assignment is not available for claiming")

    # Update assignment to claim it
    now = datetime.now(timezone.utc).isoformat()
    update_data = UpdateReviewAssignmentInput(
        status="in_progress",
        started_at=now,
    )

    # Update reviewer_id to current user and assignment_type to self_assigned
    # Note: This would need additional repo method to change reviewer_id
    success = repo.update_assignment(assignment_id, update_data)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to claim assignment")

    updated_assignment = repo.get_assignment_by_id(assignment_id)
    return AssignmentResponse(**dict(updated_assignment))


# Comment Endpoints
@router.post("/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    request: CreateCommentRequest,
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> CommentResponse:
    """Create a review comment"""
    await require_permission(principal, "comments.create")

    repo = ReviewCommentsRepo()
    input_data = CreateReviewCommentInput(
        analysis_id=request.analysis_id,
        author_id=principal.user_id,
        file_path=request.file_path,
        line_start=request.line_start,
        content=request.content,
        comment_type=request.comment_type,
        parent_id=request.parent_id,
        line_end=request.line_end,
        code_snippet=request.code_snippet,
        severity=request.severity,
        is_blocking=request.is_blocking,
    )

    comment_id = repo.create_comment(input_data)
    comment = repo.get_comment_by_id(comment_id)

    if not comment:
        raise HTTPException(status_code=500, detail="Failed to create comment")

    return CommentResponse(**dict(comment))


@router.get("/comments", response_model=list[CommentResponse])
async def list_comments(
    analysis_id: str | None = Query(None),
    author_id: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    file_path: str | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> list[CommentResponse]:
    """List review comments"""
    await require_permission(principal, "comments.read")

    repo = ReviewCommentsRepo()

    if analysis_id:
        comments = repo.get_comments_by_analysis(analysis_id, status_filter, file_path)
    elif author_id:
        comments = repo.get_comments_by_author(author_id, limit, offset)
    else:
        raise HTTPException(status_code=400, detail="Must specify analysis_id or author_id")

    return [CommentResponse(**dict(comment)) for comment in comments]


@router.get("/comments/{comment_id}/thread", response_model=list[CommentResponse])
async def get_comment_thread(
    comment_id: str,
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> list[CommentResponse]:
    """Get comment thread (replies)"""
    await require_permission(principal, "comments.read")

    repo = ReviewCommentsRepo()
    thread_comments = repo.get_comment_thread(comment_id)

    return [CommentResponse(**dict(comment)) for comment in thread_comments]


@router.patch("/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: str,
    request: UpdateCommentRequest,
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> CommentResponse:
    """Update a comment"""
    repo = ReviewCommentsRepo()
    comment = repo.get_comment_by_id(comment_id)

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Check permissions - can edit own comments or resolve if has permission
    if request.status and request.status == "resolved":
        await require_permission(principal, "comments.resolve")
    elif comment["author_id"] == principal.user_id:
        await require_permission(principal, "comments.create")  # Can edit own
    else:
        await require_permission(principal, "comments.edit")  # Can edit others

    update_data = UpdateReviewCommentInput(
        content=request.content,
        status=request.status,
        resolved_by=principal.user_id if request.status == "resolved" else None,
        resolved_at=datetime.now(timezone.utc).isoformat() if request.status == "resolved" else None,
    )

    success = repo.update_comment(comment_id, update_data)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update comment")

    updated_comment = repo.get_comment_by_id(comment_id)
    return CommentResponse(**dict(updated_comment))


# Change Request Endpoints
@router.post("/change-requests", response_model=ChangeRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_change_request(
    request: CreateChangeRequestRequest,
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> ChangeRequestResponse:
    """Create a change request"""
    await require_permission(principal, "reviews.request_changes")

    repo = ChangeRequestsRepo()
    input_data = CreateChangeRequestInput(
        analysis_id=request.analysis_id,
        reviewer_id=principal.user_id,
        title=request.title,
        description=request.description,
        category=request.category,
        priority=request.priority,
        related_comments=request.related_comments,
        related_findings=request.related_findings,
    )

    cr_id = repo.create_change_request(input_data)
    change_request = repo.get_change_request_by_id(cr_id)

    if not change_request:
        raise HTTPException(status_code=500, detail="Failed to create change request")

    return ChangeRequestResponse(**dict(change_request))


@router.get("/change-requests", response_model=list[ChangeRequestResponse])
async def list_change_requests(
    analysis_id: str | None = Query(None),
    reviewer_id: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> list[ChangeRequestResponse]:
    """List change requests"""
    await require_permission(principal, "comments.read")  # Basic read permission

    repo = ChangeRequestsRepo()

    if analysis_id:
        change_requests = repo.get_change_requests_by_analysis(analysis_id, status_filter)
    elif reviewer_id:
        change_requests = repo.get_change_requests_by_reviewer(reviewer_id, status_filter)
    else:
        change_requests = repo.get_open_change_requests()

    return [ChangeRequestResponse(**dict(cr)) for cr in change_requests]


@router.patch("/change-requests/{cr_id}", response_model=ChangeRequestResponse)
async def update_change_request(
    cr_id: str,
    request: UpdateChangeRequestRequest,
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> ChangeRequestResponse:
    """Update a change request"""
    repo = ChangeRequestsRepo()
    change_request = repo.get_change_request_by_id(cr_id)

    if not change_request:
        raise HTTPException(status_code=404, detail="Change request not found")

    # Check permissions
    if change_request["reviewer_id"] == principal.user_id:
        # Reviewer can update their own CRs
        await require_permission(principal, "reviews.request_changes")
    else:
        # Developer can resolve CRs (mark as resolved)
        if request.status in ["resolved", "declined"]:
            await require_permission(principal, "comments.reply")  # Basic permission
        else:
            raise HTTPException(status_code=403, detail="Cannot modify others' change requests")

    update_data = UpdateChangeRequestInput(
        status=request.status,
        resolved_at=request.resolved_at,
        resolution_comment=request.resolution_comment,
    )

    if request.status in ["resolved", "declined"]:
        update_data.resolved_by = principal.user_id
        if not request.resolved_at:
            update_data.resolved_at = datetime.now(timezone.utc).isoformat()

    success = repo.update_change_request(cr_id, update_data)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update change request")

    updated_cr = repo.get_change_request_by_id(cr_id)
    return ChangeRequestResponse(**dict(updated_cr))