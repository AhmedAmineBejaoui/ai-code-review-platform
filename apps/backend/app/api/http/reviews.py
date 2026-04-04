from __future__ import annotations

from datetime import datetime, timezone, date, timedelta
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field

from app.api.middleware.auth import AuthenticatedPrincipal, enforce_permission, get_current_principal, require_permission
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

router = APIRouter(prefix="/api/v1/reviews", tags=["reviews"])


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
    enforce_permission(principal, "reviews.assign")

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
        enforce_permission(principal, "assignments.view_all")
    else:
        enforce_permission(principal, "assignments.view_own")

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
        enforce_permission(principal, "assignments.view_all")
    else:
        enforce_permission(principal, "assignments.view_own")

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
        enforce_permission(principal, "assignments.modify")
    else:
        enforce_permission(principal, "assignments.view_own")

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
    enforce_permission(principal, "reviews.claim")

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
    enforce_permission(principal, "comments.create")

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
    enforce_permission(principal, "comments.read")

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
    enforce_permission(principal, "comments.read")

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
        enforce_permission(principal, "comments.resolve")
    elif comment["author_id"] == principal.user_id:
        enforce_permission(principal, "comments.create")  # Can edit own
    else:
        enforce_permission(principal, "comments.edit")  # Can edit others

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
    enforce_permission(principal, "reviews.request_changes")

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
    enforce_permission(principal, "comments.read")  # Basic read permission

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
        enforce_permission(principal, "reviews.request_changes")
    else:
        # Developer can resolve CRs (mark as resolved)
        if request.status in ["resolved", "declined"]:
            enforce_permission(principal, "comments.reply")  # Basic permission
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


# Dashboard Models
class ReviewKPIs(BaseModel):
    """KPI metrics for reviewer dashboard."""
    pending_reviews: int = 0
    in_progress_reviews: int = 0
    completed_today: int = 0
    completed_this_week: int = 0
    avg_review_time_hours: float | None = None
    overdue_reviews: int = 0


class ActiveReview(BaseModel):
    """Active review item for dashboard."""
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
    """Recent activity item."""
    id: str
    type: str  # 'comment', 'review_completed', 'change_request'
    description: str
    created_at: str
    analysis_id: str | None = None
    repo: str | None = None


class ReviewerDashboardResponse(BaseModel):
    """Reviewer dashboard response."""
    kpis: ReviewKPIs
    active_reviews: list[ActiveReview]
    recent_activity: list[RecentActivity]
    is_lead: bool = False


@router.get("/dashboard", response_model=ReviewerDashboardResponse)
async def get_reviewer_dashboard(
    principal: AuthenticatedPrincipal = Depends(require_permission("assignments.view_own")),
) -> ReviewerDashboardResponse:
    """
    Get reviewer dashboard data.
    
    Returns KPIs, active reviews, and recent activity for the current user.
    """
    
    engine = get_engine()
    from sqlalchemy import text
    
    user_id = principal.user_id
    
    # Check if user is a lead/admin
    is_lead = "admin" in principal.roles or "lead" in principal.roles or "reviewer" in principal.roles
    
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
            # Table might not exist, return defaults
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
            ra.due_at NULLS LAST,
            ra.assigned_at DESC
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
    
    # Get recent activity
    activity_query = text("""
        (
            SELECT 
                rc.id,
                'comment' as type,
                CONCAT('Commented on ', a.repo) as description,
                rc.created_at,
                rc.analysis_id,
                a.repo
            FROM review_comments rc
            JOIN analyses a ON rc.analysis_id = a.id
            WHERE rc.author_id = :user_id
            ORDER BY rc.created_at DESC
            LIMIT 5
        )
        UNION ALL
        (
            SELECT 
                ra.id,
                'review_completed' as type,
                CONCAT('Completed review for ', a.repo) as description,
                ra.completed_at as created_at,
                ra.analysis_id,
                a.repo
            FROM review_assignments ra
            JOIN analyses a ON ra.analysis_id = a.id
            WHERE ra.reviewer_id = :user_id AND ra.status = 'completed'
            ORDER BY ra.completed_at DESC
            LIMIT 5
        )
        ORDER BY created_at DESC
        LIMIT 10
    """)
    
    recent_activity: list[RecentActivity] = []
    
    with engine.connect() as conn:
        try:
            result = conn.execute(activity_query, {"user_id": user_id})
            for row in result.mappings():
                recent_activity.append(RecentActivity(
                    id=row["id"],
                    type=row["type"],
                    description=row["description"],
                    created_at=row["created_at"].isoformat() if isinstance(row.get("created_at"), datetime) else str(row.get("created_at", "")),
                    analysis_id=row.get("analysis_id"),
                    repo=row.get("repo"),
                ))
        except Exception:
            pass
    
    return ReviewerDashboardResponse(
        kpis=kpis,
        active_reviews=active_reviews,
        recent_activity=recent_activity,
        is_lead=is_lead,
    )


# Personal Metrics Models
class PersonalMetricsPeriod(BaseModel):
    """Period information for metrics."""
    start: str
    end: str
    days: int


class PersonalMetricsCurrent(BaseModel):
    """Current period metrics."""
    reviews_completed: int = 0
    avg_review_time_minutes: int = 0
    avg_comments_per_review: float = 0.0
    sla_compliance_rate: float = 0.0
    approvals: int = 0
    warnings: int = 0
    blocks: int = 0
    findings_identified: int = 0


class PersonalMetricsTrends(BaseModel):
    """Trends data for metrics."""
    dates: list[str] = []
    reviews_completed: list[int] = []
    avg_review_time: list[int] = []
    sla_compliance: list[float] = []
    avg_comments: list[float] = []


class PersonalMetricsRankings(BaseModel):
    """Ranking information."""
    reviews_count: int = 0
    quality_score: int = 0
    response_time: int = 0


class PersonalMetricsResponse(BaseModel):
    """Personal metrics response."""
    reviewer_id: str
    period: PersonalMetricsPeriod
    current_period: PersonalMetricsCurrent
    trends: PersonalMetricsTrends
    rankings: PersonalMetricsRankings


@router.get("/metrics/personal", response_model=PersonalMetricsResponse)
async def get_personal_metrics(
    period_days: int = Query(30, description="Period in days"),
    principal: AuthenticatedPrincipal = Depends(require_permission("assignments.view_own")),
) -> PersonalMetricsResponse:
    """
    Get personal metrics for the current reviewer.
    
    Returns aggregated metrics, trends, and rankings for the specified period.
    """
    from app.services.reviewer_metrics_calculator import ReviewerMetricsCalculator
    
    user_id = principal.user_id
    calculator = ReviewerMetricsCalculator()
    
    # Calculate period
    end_date = date.today()
    start_date = end_date - timedelta(days=period_days)
    
    # Get current period metrics
    try:
        current_metrics = await calculator.calculate_reviewer_metrics(
            reviewer_id=user_id,
            period_start=start_date,
            period_end=end_date
        )
    except Exception:
        # Return default metrics if calculation fails
        current_metrics = {
            "reviews_completed": 0,
            "avg_review_time_minutes": 0,
            "avg_comments_per_review": 0.0,
            "sla_compliance_rate": 0.0,
            "approvals": 0,
            "warnings": 0,
            "blocks": 0,
            "findings_identified": 0,
        }
    
    # Get trends (last 30 days in 7-day chunks)
    try:
        trends_data = await calculator.get_reviewer_trends(user_id, periods=4)
    except Exception:
        trends_data = {
            "dates": [],
            "reviews_completed": [],
            "avg_review_time": [],
            "sla_compliance": [],
            "avg_comments": [],
        }
    
    # Calculate rankings (simplified - just return 0 for now)
    rankings = {
        "reviews_count": 0,
        "quality_score": 0,
        "response_time": 0,
    }
    
    return PersonalMetricsResponse(
        reviewer_id=user_id,
        period=PersonalMetricsPeriod(
            start=start_date.isoformat(),
            end=end_date.isoformat(),
            days=period_days
        ),
        current_period=PersonalMetricsCurrent(**current_metrics),
        trends=PersonalMetricsTrends(**trends_data),
        rankings=PersonalMetricsRankings(**rankings)
    )
class SubmitReviewRequest(BaseModel):
    """Request to submit a review decision."""
    model_config = ConfigDict(extra="forbid")

    analysis_id: str = Field(min_length=1)
    decision: Literal["approve", "request_changes", "comment"]
    summary: str | None = Field(None, max_length=2000)
    comments: list[dict[str, Any]] = Field(default_factory=list)


class SubmitReviewResponse(BaseModel):
    """Response after submitting a review."""
    success: bool
    assignment_id: str | None = None
    comments_created: int = 0
    decision: str


@router.post("/submit", response_model=SubmitReviewResponse)
async def submit_review(
    request: SubmitReviewRequest,
    principal: AuthenticatedPrincipal = Depends(require_permission("reviews.submit")),
) -> SubmitReviewResponse:
    """
    Submit a review decision.
    
    Marks the assignment as completed and records the decision.
    """
    
    assignments_repo = ReviewAssignmentsRepo()
    comments_repo = ReviewCommentsRepo()
    
    # Find the user's assignment for this analysis
    assignments = assignments_repo.get_assignments_by_reviewer(
        principal.user_id, 
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
    
    # Create comments if provided
    comments_created = 0
    for comment_data in request.comments:
        try:
            comment_input = CreateReviewCommentInput(
                analysis_id=request.analysis_id,
                author_id=principal.user_id,
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
            comments_repo.create_comment(comment_input)
            comments_created += 1
        except Exception:
            pass  # Skip invalid comments
    
    # Update assignment status
    now = datetime.now(timezone.utc).isoformat()
    update_data = UpdateReviewAssignmentInput(
        status="completed",
        completed_at=now,
    )
    
    assignments_repo.update_assignment(assignment["id"], update_data)
    
    return SubmitReviewResponse(
        success=True,
        assignment_id=assignment["id"],
        comments_created=comments_created,
        decision=request.decision,
    )