"""
Reviews API routes.
"""

import json
import logging
import re
from datetime import datetime, timezone, date, timedelta
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text

from ..database import get_engine
from ..repositories import ReviewAssignmentsRepo, ReviewCommentsRepo, ChangeRequestsRepo

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/reviews", tags=["reviews"])


# ============ Request/Response Models ============

# Assignment Models
class CreateAssignmentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    analysis_id: str = Field(min_length=1)
    reviewer_id: str = Field(min_length=1)
    assigner_id: str | None = None
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
    assigned_at: str | None
    started_at: str | None
    completed_at: str | None
    due_at: str | None
    declined_reason: str | None
    created_at: str | None
    updated_at: str | None


# Comment Models
class CreateCommentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    analysis_id: str = Field(min_length=1)
    author_id: str = Field(min_length=1)
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
    resolved_by: str | None = None


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
    resolved_at: datetime | None
    is_blocking: bool
    reactions_json: dict[str, Any]
    created_at: datetime | None
    updated_at: datetime | None


# Change Request Models
class CreateChangeRequestRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    analysis_id: str = Field(min_length=1)
    reviewer_id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    category: Literal["security", "performance", "quality", "style", "tests", "documentation"]
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    related_comments: list[str] = Field(default_factory=list)
    related_findings: list[str] = Field(default_factory=list)


class UpdateChangeRequestRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["open", "in_progress", "resolved", "declined"] | None = None
    resolved_by: str | None = None
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
    created_at: str | None
    updated_at: str | None


# Dashboard Models
class ReviewKPIs(BaseModel):
    pending_reviews: int = 0
    in_progress_reviews: int = 0
    completed_today: int = 0
    completed_this_week: int = 0
    avg_review_time_hours: float | None = None
    overdue_reviews: int = 0


class ActiveReview(BaseModel):
    id: str
    analysis_id: str
    repo: str
    pr_number: int | None
    priority: str
    status: str
    assigned_at: str
    due_at: str | None
    files_changed: int = 0
    findings_count: int = 0


class RecentActivity(BaseModel):
    id: str
    type: str
    description: str
    created_at: str
    analysis_id: str | None = None
    repo: str | None = None


class ReviewerDashboardResponse(BaseModel):
    kpis: ReviewKPIs
    active_reviews: list[ActiveReview]
    recent_activity: list[RecentActivity]
    is_lead: bool = False


# Submit Review Models
class SubmitReviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    analysis_id: str = Field(min_length=1)
    reviewer_id: str = Field(min_length=1)
    decision: Literal["approve", "request_changes", "comment"] | None = None
    verdict: Literal["approve", "request_changes", "comment_only"] | None = None
    summary: str | None = Field(None, max_length=2000)
    comments: list[dict[str, Any]] = Field(default_factory=list)


class SubmitReviewResponse(BaseModel):
    success: bool
    assignment_id: str | None = None
    comments_created: int = 0
    decision: str


# ============ Assignment Endpoints ============

@router.post("/assignments", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assignment(request: CreateAssignmentRequest) -> AssignmentResponse:
    """Create a new review assignment."""
    repo = ReviewAssignmentsRepo()
    
    assignment_id = repo.create_assignment(
        analysis_id=request.analysis_id,
        reviewer_id=request.reviewer_id,
        assigner_id=request.assigner_id,
        assignment_type=request.assignment_type,
        priority=request.priority,
        due_at=request.due_at,
    )
    
    assignment = repo.get_assignment_by_id(assignment_id)
    if not assignment:
        raise HTTPException(status_code=500, detail="Failed to create assignment")
    
    return AssignmentResponse(**assignment)


@router.get("/assignments", response_model=list[AssignmentResponse])
async def list_assignments(
    reviewer_id: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> list[AssignmentResponse]:
    """List review assignments."""
    repo = ReviewAssignmentsRepo()
    
    if not reviewer_id:
        return []
    
    assignments = repo.get_assignments_by_reviewer(reviewer_id, status_filter, limit, offset)
    return [AssignmentResponse(**a) for a in assignments]


@router.get("/assignments/{assignment_id}", response_model=AssignmentResponse)
async def get_assignment(assignment_id: str) -> AssignmentResponse:
    """Get assignment by ID."""
    repo = ReviewAssignmentsRepo()
    assignment = repo.get_assignment_by_id(assignment_id)
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    return AssignmentResponse(**assignment)


@router.patch("/assignments/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment(assignment_id: str, request: UpdateAssignmentRequest) -> AssignmentResponse:
    """Update assignment status."""
    repo = ReviewAssignmentsRepo()
    assignment = repo.get_assignment_by_id(assignment_id)
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    success = repo.update_assignment(
        assignment_id=assignment_id,
        status=request.status,
        started_at=request.started_at,
        completed_at=request.completed_at,
        declined_reason=request.declined_reason,
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update assignment")
    
    updated = repo.get_assignment_by_id(assignment_id)
    return AssignmentResponse(**updated)


@router.post("/assignments/{assignment_id}/claim", response_model=AssignmentResponse)
async def claim_assignment(assignment_id: str, user_id: str = Query(...)) -> AssignmentResponse:
    """Self-assign (claim) a review."""
    repo = ReviewAssignmentsRepo()
    assignment = repo.get_assignment_by_id(assignment_id)
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    if assignment["status"] != "pending":
        raise HTTPException(status_code=400, detail="Assignment is not available for claiming")
    
    now = datetime.now(timezone.utc).isoformat()
    success = repo.update_assignment(
        assignment_id=assignment_id,
        status="in_progress",
        started_at=now,
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to claim assignment")
    
    updated = repo.get_assignment_by_id(assignment_id)
    return AssignmentResponse(**updated)


# ============ Comment Endpoints ============

@router.post("/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(request: CreateCommentRequest) -> CommentResponse:
    """Create a review comment."""
    repo = ReviewCommentsRepo()
    
    comment_id = repo.create_comment(
        analysis_id=request.analysis_id,
        author_id=request.author_id,
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
    
    comment = repo.get_comment_by_id(comment_id)
    if not comment:
        raise HTTPException(status_code=500, detail="Failed to create comment")
    
    return CommentResponse(**comment)


@router.get("/comments", response_model=list[CommentResponse])
async def list_comments(
    analysis_id: str | None = Query(None),
    author_id: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    file_path: str | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> list[CommentResponse]:
    """List review comments."""
    repo = ReviewCommentsRepo()
    
    if analysis_id:
        comments = repo.get_comments_by_analysis(analysis_id, status_filter, file_path)
    elif author_id:
        comments = repo.get_comments_by_author(author_id, limit, offset)
    else:
        raise HTTPException(status_code=400, detail="Must specify analysis_id or author_id")
    
    return [CommentResponse(**c) for c in comments]


@router.get("/comments/{comment_id}/thread", response_model=list[CommentResponse])
async def get_comment_thread(comment_id: str) -> list[CommentResponse]:
    """Get comment thread (replies)."""
    repo = ReviewCommentsRepo()
    thread_comments = repo.get_comment_thread(comment_id)
    return [CommentResponse(**c) for c in thread_comments]


@router.patch("/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(comment_id: str, request: UpdateCommentRequest) -> CommentResponse:
    """Update a comment."""
    repo = ReviewCommentsRepo()
    comment = repo.get_comment_by_id(comment_id)
    
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    resolved_at = None
    if request.status == "resolved":
        resolved_at = datetime.now(timezone.utc).isoformat()
    
    success = repo.update_comment(
        comment_id=comment_id,
        content=request.content,
        status=request.status,
        resolved_by=request.resolved_by,
        resolved_at=resolved_at,
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update comment")
    
    updated = repo.get_comment_by_id(comment_id)
    return CommentResponse(**updated)


# ============ Change Request Endpoints ============

@router.post("/change-requests", response_model=ChangeRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_change_request(request: CreateChangeRequestRequest) -> ChangeRequestResponse:
    """Create a change request."""
    repo = ChangeRequestsRepo()
    
    cr_id = repo.create_change_request(
        analysis_id=request.analysis_id,
        reviewer_id=request.reviewer_id,
        title=request.title,
        description=request.description,
        category=request.category,
        priority=request.priority,
        related_comments=request.related_comments,
        related_findings=request.related_findings,
    )
    
    cr = repo.get_change_request_by_id(cr_id)
    if not cr:
        raise HTTPException(status_code=500, detail="Failed to create change request")
    
    return ChangeRequestResponse(**cr)


@router.get("/change-requests", response_model=list[ChangeRequestResponse])
async def list_change_requests(
    analysis_id: str | None = Query(None),
    reviewer_id: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
) -> list[ChangeRequestResponse]:
    """List change requests."""
    repo = ChangeRequestsRepo()
    
    if analysis_id:
        crs = repo.get_change_requests_by_analysis(analysis_id, status_filter)
    elif reviewer_id:
        crs = repo.get_change_requests_by_reviewer(reviewer_id, status_filter)
    else:
        crs = repo.get_open_change_requests()
    
    return [ChangeRequestResponse(**cr) for cr in crs]


@router.patch("/change-requests/{cr_id}", response_model=ChangeRequestResponse)
async def update_change_request(cr_id: str, request: UpdateChangeRequestRequest) -> ChangeRequestResponse:
    """Update a change request."""
    repo = ChangeRequestsRepo()
    cr = repo.get_change_request_by_id(cr_id)
    
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")
    
    resolved_at = request.resolved_at
    if request.status in ["resolved", "declined"] and not resolved_at:
        resolved_at = datetime.now(timezone.utc).isoformat()
    
    success = repo.update_change_request(
        cr_id=cr_id,
        status=request.status,
        resolved_by=request.resolved_by,
        resolved_at=resolved_at,
        resolution_comment=request.resolution_comment,
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update change request")
    
    updated = repo.get_change_request_by_id(cr_id)
    return ChangeRequestResponse(**updated)


# ============ Dashboard Endpoint ============

@router.get("/dashboard", response_model=ReviewerDashboardResponse)
async def get_reviewer_dashboard(user_id: str = Query(...)) -> ReviewerDashboardResponse:
    """Get reviewer dashboard data."""
    engine = get_engine()
    
    # Get KPIs
    kpi_query = text("""
        SELECT 
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN status = 'completed' AND DATE(completed_at) = CURRENT_DATE THEN 1 ELSE 0 END) as completed_today,
            SUM(CASE WHEN status = 'completed' AND completed_at > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) as completed_week,
            AVG(EXTRACT(EPOCH FROM (completed_at - assigned_at)) / 3600) FILTER (WHERE status = 'completed') as avg_time_hours,
            SUM(CASE WHEN status IN ('pending', 'in_progress') AND due_at < NOW() THEN 1 ELSE 0 END) as overdue
        FROM review_assignments
        WHERE reviewer_id = :user_id
    """)
    
    kpis = ReviewKPIs()
    
    with engine.connect() as conn:
        try:
            result = conn.execute(kpi_query, {"user_id": user_id})
            row = result.mappings().first()
            
            if row:
                kpis = ReviewKPIs(
                    pending_reviews=row.get("pending") or 0,
                    in_progress_reviews=row.get("in_progress") or 0,
                    completed_today=row.get("completed_today") or 0,
                    completed_this_week=row.get("completed_week") or 0,
                    avg_review_time_hours=float(row["avg_time_hours"]) if row.get("avg_time_hours") else None,
                    overdue_reviews=row.get("overdue") or 0,
                )
        except Exception:
            pass
    
    # Get active reviews
    active_query = text("""
        SELECT 
            ra.id,
            ra.analysis_id,
            ra.priority,
            ra.status,
            ra.assigned_at,
            ra.due_at,
            a.repo,
            a.pr_number,
            a.nb_files_changed,
            a.findings_count
        FROM review_assignments ra
        JOIN analyses a ON ra.analysis_id = a.id
        WHERE ra.reviewer_id = :user_id
        AND ra.status IN ('pending', 'in_progress')
        ORDER BY 
            CASE ra.priority 
                WHEN 'critical' THEN 1 
                WHEN 'high' THEN 2 
                WHEN 'medium' THEN 3 
                ELSE 4 
            END,
            ra.due_at NULLS LAST
        LIMIT 10
    """)
    
    active_reviews: list[ActiveReview] = []
    
    with engine.connect() as conn:
        try:
            result = conn.execute(active_query, {"user_id": user_id})
            for row in result.mappings():
                active_reviews.append(ActiveReview(
                    id=row["id"],
                    analysis_id=row["analysis_id"],
                    repo=row["repo"],
                    pr_number=row.get("pr_number"),
                    priority=row["priority"],
                    status=row["status"],
                    assigned_at=row["assigned_at"].isoformat() if isinstance(row.get("assigned_at"), datetime) else str(row.get("assigned_at", "")),
                    due_at=row["due_at"].isoformat() if isinstance(row.get("due_at"), datetime) else None,
                    files_changed=row.get("nb_files_changed") or 0,
                    findings_count=row.get("findings_count") or 0,
                ))
        except Exception:
            pass
    
    return ReviewerDashboardResponse(
        kpis=kpis,
        active_reviews=active_reviews,
        recent_activity=[],
        is_lead=False,
    )


# ============ Submit Review Endpoint ============

@router.post("/submit", response_model=SubmitReviewResponse)
async def submit_review(request: SubmitReviewRequest) -> SubmitReviewResponse:
    """Submit a review decision."""
    decision = request.decision
    if request.verdict is not None:
        verdict_decision = "comment" if request.verdict == "comment_only" else request.verdict
        if decision is None:
            decision = verdict_decision
        elif decision != verdict_decision:
            raise HTTPException(status_code=400, detail="decision and verdict must match")
    
    if decision is None:
        raise HTTPException(status_code=400, detail="decision is required")
    
    assignments_repo = ReviewAssignmentsRepo()
    comments_repo = ReviewCommentsRepo()
    
    # Find user's assignment
    assignments = assignments_repo.get_assignments_by_reviewer(
        request.reviewer_id, 
        status_filter=None, 
        limit=100, 
        offset=0
    )
    
    assignment = None
    for a in assignments:
        if a["analysis_id"] == request.analysis_id and a["status"] in ["pending", "in_progress"]:
            assignment = a
            break
    
    if not assignment:
        raise HTTPException(status_code=404, detail="No active assignment found for this analysis")
    
    # Create comments
    comments_created = 0
    for comment_data in request.comments:
        try:
            comments_repo.create_comment(
                analysis_id=request.analysis_id,
                author_id=request.reviewer_id,
                file_path=comment_data.get("file_path", ""),
                line_start=comment_data.get("line_start", 1),
                content=comment_data.get("content", ""),
                comment_type=comment_data.get("comment_type", "comment"),
                parent_id=comment_data.get("parent_id"),
                line_end=comment_data.get("line_end"),
                code_snippet=comment_data.get("code_snippet"),
                severity=comment_data.get("severity"),
                is_blocking=comment_data.get("is_blocking", False),
            )
            comments_created += 1
        except Exception:
            pass
    
    # Update assignment
    now = datetime.now(timezone.utc).isoformat()
    assignments_repo.update_assignment(
        assignment_id=assignment["id"],
        status="completed",
        completed_at=now,
    )
    
    return SubmitReviewResponse(
        success=True,
        assignment_id=assignment["id"],
        comments_created=comments_created,
        decision=decision,
    )
