"""
Review Service models.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class ReviewAssignment:
    """Review assignment model."""
    id: str
    analysis_id: str
    reviewer_id: str
    assigner_id: str | None = None
    assignment_type: str = "manual"  # auto, manual, self_assigned
    status: str = "pending"  # pending, in_progress, completed, declined
    priority: str = "medium"  # low, medium, high, critical
    assigned_at: datetime | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    due_at: datetime | None = None
    declined_reason: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass
class ReviewComment:
    """Review comment model."""
    id: str
    analysis_id: str
    author_id: str
    file_path: str
    line_start: int
    content: str
    parent_id: str | None = None
    line_end: int | None = None
    code_snippet: str | None = None
    comment_type: str = "comment"  # comment, suggestion, question, praise, change_request
    severity: str | None = None  # info, warn, blocker
    status: str = "open"  # open, resolved, wontfix
    resolved_by: str | None = None
    resolved_at: datetime | None = None
    is_blocking: bool = False
    reactions_json: dict[str, Any] = field(default_factory=dict)
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass
class ChangeRequest:
    """Change request model."""
    id: str
    analysis_id: str
    reviewer_id: str
    title: str
    description: str
    category: str  # security, performance, quality, style, tests, documentation
    priority: str = "medium"  # low, medium, high, critical
    related_comments: list[str] = field(default_factory=list)
    related_findings: list[str] = field(default_factory=list)
    status: str = "open"  # open, in_progress, resolved, declined
    resolved_by: str | None = None
    resolved_at: datetime | None = None
    resolution_comment: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
