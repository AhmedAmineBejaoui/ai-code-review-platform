"""
Data models for Auth Service.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Optional


class TeamRole(str, Enum):
    """Team member roles."""
    ADMIN = "admin"
    REVIEWER = "reviewer"
    DEVELOPER = "developer"


class TeamPermission(str, Enum):
    """Granular permissions for team members."""
    CAN_MERGE = "can_merge"
    CAN_DEPLOY = "can_deploy"
    CAN_APPROVE = "can_approve"
    CAN_REJECT = "can_reject"
    CAN_ASSIGN_REVIEWERS = "can_assign_reviewers"
    CAN_MANAGE_TEAM = "can_manage_team"
    CAN_MANAGE_REPOS = "can_manage_repos"
    CAN_VIEW_ANALYTICS = "can_view_analytics"
    CAN_EXPORT_REPORTS = "can_export_reports"
    CAN_CONFIGURE_RULES = "can_configure_rules"


@dataclass
class User:
    """User model."""
    id: str
    email: str
    display_name: Optional[str] = None
    role: str = "developer"
    is_active: bool = True
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    roles: List[str] = field(default_factory=lambda: ["developer"])
    permissions: List[str] = field(default_factory=list)
    organization_memberships: List["OrganizationMembership"] = field(default_factory=list)


@dataclass
class Organization:
    """Organization model."""
    id: str
    name: str
    slug: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class OrganizationMembership:
    """Organization membership model."""
    id: str
    organization_id: str
    user_id: str
    role: str = "member"
    status: str = "active"
    organization_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class Team:
    """Team model."""
    id: str
    name: str
    project_id: str
    description: Optional[str] = None
    is_active: bool = True
    project_name: Optional[str] = None
    member_count: int = 0
    repo_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class TeamMember:
    """Team member model."""
    id: str
    team_id: str
    user_id: str
    role: TeamRole
    permissions: List[str] = field(default_factory=list)
    user_email: Optional[str] = None
    user_display_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class TeamWithStats:
    """Team with statistics."""
    team: Team
    total_members: int = 0
    admin_count: int = 0
    reviewer_count: int = 0
    developer_count: int = 0
    active_reviews: int = 0
    total_reviews: int = 0
    avg_review_time_hours: float = 0.0


@dataclass
class UserTeamAccess:
    """Resolved access for a user in a project."""
    user_id: str
    project_id: str
    team_id: Optional[str] = None
    team_name: Optional[str] = None
    role: TeamRole = TeamRole.DEVELOPER
    permissions: List[str] = field(default_factory=list)
    source: str = "team"  # "team", "org", "platform", "none"


@dataclass
class AuthenticatedPrincipal:
    """Authenticated user principal."""
    user_id: str
    email: str
    display_name: Optional[str] = None
    roles: List[str] = field(default_factory=lambda: ["developer"])
    permissions: List[str] = field(default_factory=list)
    org_id: Optional[str] = None
    org_slug: Optional[str] = None
    org_name: Optional[str] = None
    org_role: Optional[str] = None
