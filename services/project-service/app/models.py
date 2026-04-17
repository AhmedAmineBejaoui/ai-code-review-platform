"""
Project Service models.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Literal


@dataclass
class ProjectProfile:
    """Project profile model."""
    id: str
    repo_id: str
    org_id: str | None = None
    context_version: int = 1
    main_languages: list[str] = field(default_factory=list)
    raw_metadata: dict[str, Any] = field(default_factory=dict)
    business_description: str | None = None
    analysis_status: str = "pending"
    created_at: datetime | None = None
    last_analyzed_at: datetime | None = None


@dataclass
class RepoProfile:
    """Repository profile model."""
    repo_id: str
    repo_path: str | None = None
    indexed_commit: str | None = None
    default_branch: str = "main"
    profile: dict[str, Any] = field(default_factory=dict)
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass
class ProjectSettings:
    """Project settings model."""
    id: str
    project_id: str
    organization_id: str | None = None
    auto_analysis_enabled: bool = True
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass
class Branch:
    """Branch model."""
    id: str
    repo_id: str
    org_id: str | None = None
    branch_name: str = ""
    branch_type: str = "custom"
    branch_pattern: str | None = None
    last_commit_sha: str | None = None
    last_commit_author: str | None = None
    last_commit_message: str | None = None
    last_commit_at: datetime | None = None
    created_by: str | None = None
    created_at: datetime | None = None
    base_branch: str | None = None
    merged_into: str | None = None
    merge_status: str | None = None
    merged_at: datetime | None = None
    merged_by: str | None = None
    is_protected: bool = False
    is_default: bool = False
    is_active: bool = True
    ahead_count: int = 0
    behind_count: int = 0
    last_synced_at: datetime | None = None
    description: str | None = None
    metadata_json: dict[str, Any] = field(default_factory=dict)
    updated_at: datetime | None = None


@dataclass
class BranchProtectionRule:
    """Branch protection rule model."""
    id: str
    branch_id: str
    required_approvals: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass
class ProjectMember:
    """Project team member."""
    user_id: str
    email: str | None = None
    display_name: str | None = None
    role: str = "developer"


@dataclass
class BranchConfig:
    """Branch configuration for project."""
    name: str
    is_default: bool = False
    is_protected: bool = False
    require_reviews: int = 0
