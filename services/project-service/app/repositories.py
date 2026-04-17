"""
Project Service repositories.
"""

import json
import logging
import uuid
from dataclasses import asdict
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Engine

from .database import get_engine
from .models import (
    ProjectProfile, RepoProfile, ProjectSettings, Branch, 
    BranchProtectionRule, ProjectMember, BranchConfig
)

logger = logging.getLogger(__name__)


class ProjectProfilesRepo:
    """Repository for project profiles."""
    
    def __init__(self, engine: Engine | None = None):
        self.engine = engine or get_engine()
    
    def get_by_id(self, project_id: str) -> ProjectProfile | None:
        """Get project profile by ID."""
        query = text("""
            SELECT id, repo_id, org_id, context_version, main_languages,
                   raw_metadata, business_description, analysis_status,
                   created_at, last_analyzed_at
            FROM project_profiles
            WHERE id = :id
            LIMIT 1
        """)
        
        with self.engine.connect() as conn:
            result = conn.execute(query, {"id": project_id})
            row = result.mappings().first()
            
            if not row:
                return None
            
            return ProjectProfile(
                id=str(row["id"]),
                repo_id=row["repo_id"],
                org_id=row.get("org_id"),
                context_version=row.get("context_version", 1),
                main_languages=row.get("main_languages") or [],
                raw_metadata=row.get("raw_metadata") or {},
                business_description=row.get("business_description"),
                analysis_status=row.get("analysis_status", "pending"),
                created_at=row.get("created_at"),
                last_analyzed_at=row.get("last_analyzed_at"),
            )
    
    def get_by_repo_id(self, repo_id: str) -> ProjectProfile | None:
        """Get project profile by repo_id."""
        normalized = repo_id.strip().lower()
        query = text("""
            SELECT id, repo_id, org_id, context_version, main_languages,
                   raw_metadata, business_description, analysis_status,
                   created_at, last_analyzed_at
            FROM project_profiles
            WHERE repo_id = :repo_id
            LIMIT 1
        """)
        
        with self.engine.connect() as conn:
            result = conn.execute(query, {"repo_id": normalized})
            row = result.mappings().first()
            
            if not row:
                return None
            
            return ProjectProfile(
                id=str(row["id"]),
                repo_id=row["repo_id"],
                org_id=row.get("org_id"),
                context_version=row.get("context_version", 1),
                main_languages=row.get("main_languages") or [],
                raw_metadata=row.get("raw_metadata") or {},
                business_description=row.get("business_description"),
                analysis_status=row.get("analysis_status", "pending"),
                created_at=row.get("created_at"),
                last_analyzed_at=row.get("last_analyzed_at"),
            )
    
    def ensure_project_profile(
        self,
        repo_id: str,
        org_id: str | None = None,
        display_name: str | None = None,
        description: str | None = None,
        primary_language: str | None = None,
        visibility: str | None = None,
    ) -> str:
        """Ensure a project profile exists and return its ID."""
        normalized_repo_id = repo_id.strip().lower()
        if not normalized_repo_id:
            raise ValueError("repo_id is required")
        
        # Try to find existing
        existing = self.get_by_repo_id(normalized_repo_id)
        if existing:
            return existing.id
        
        # Create new
        new_id = str(uuid.uuid4())
        raw_metadata = {
            "display_name": display_name,
            "description": description,
            "primary_language": primary_language,
            "visibility": visibility,
        }
        
        with self.engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO project_profiles (
                        id, repo_id, org_id, context_version,
                        main_languages, raw_metadata,
                        business_description, analysis_status,
                        created_at, last_analyzed_at
                    ) VALUES (
                        :id, :repo_id, :org_id, 1,
                        CAST(:main_languages AS jsonb), CAST(:raw_metadata AS jsonb),
                        :description, 'pending',
                        now(), now()
                    )
                    ON CONFLICT (repo_id) DO UPDATE
                    SET raw_metadata = COALESCE(project_profiles.raw_metadata, EXCLUDED.raw_metadata)
                """),
                {
                    "id": new_id,
                    "repo_id": normalized_repo_id,
                    "org_id": org_id,
                    "main_languages": json.dumps([primary_language] if primary_language else []),
                    "raw_metadata": json.dumps(raw_metadata),
                    "description": description,
                },
            )
            
            # Read the final id
            final_row = conn.execute(
                text("SELECT id FROM project_profiles WHERE repo_id = :repo_id LIMIT 1"),
                {"repo_id": normalized_repo_id},
            ).mappings().first()
        
        if not final_row or not final_row.get("id"):
            raise RuntimeError("Failed to create project profile")
        
        return str(final_row["id"])
    
    def list_paginated(
        self,
        page: int = 1,
        limit: int = 20,
        search: str | None = None,
        team_id: str | None = None,
    ) -> tuple[list[dict[str, Any]], int]:
        """List project profiles with pagination."""
        conditions: list[str] = []
        params: dict[str, Any] = {"limit": limit, "offset": (page - 1) * limit}
        
        if search:
            conditions.append("(pp.repo_id ILIKE :search OR COALESCE(pp.raw_metadata->>'display_name','') ILIKE :search)")
            params["search"] = f"%{search}%"
        
        if team_id:
            conditions.append("pp.org_id = :team_id")
            params["team_id"] = team_id
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        query = text(f"""
            SELECT
                pp.id AS project_id,
                pp.repo_id AS repo_id,
                pp.org_id AS org_id,
                pp.raw_metadata AS raw_metadata,
                pp.business_description AS business_description,
                pp.created_at AS created_at,
                pp.last_analyzed_at AS last_analyzed_at,
                COALESCE(a.analysis_count, 0) AS analysis_count,
                a.last_analysis_at AS last_analysis_at
            FROM project_profiles pp
            LEFT JOIN (
                SELECT project_id, COUNT(*) AS analysis_count, MAX(created_at) AS last_analysis_at
                FROM analyses
                WHERE project_id IS NOT NULL
                GROUP BY project_id
            ) a ON a.project_id = pp.id
            {where_clause}
            ORDER BY COALESCE(a.last_analysis_at, pp.last_analyzed_at, pp.created_at) DESC NULLS LAST
            LIMIT :limit OFFSET :offset
        """)
        
        count_query = text(f"""
            SELECT COUNT(*) AS total FROM project_profiles pp {where_clause}
        """)
        
        items = []
        total = 0
        
        with self.engine.connect() as conn:
            count_row = conn.execute(count_query, params).mappings().first()
            total = (count_row.get("total") if count_row else 0) or 0
            
            result = conn.execute(query, params)
            for row in result.mappings().all():
                items.append(dict(row))
        
        return items, total


class RepoProfilesRepo:
    """Repository for repo profiles."""
    
    def __init__(self, engine: Engine | None = None):
        self.engine = engine or get_engine()
    
    def get_profile(self, repo_id: str) -> RepoProfile | None:
        """Get repo profile by ID."""
        query = text("""
            SELECT repo_id, repo_path, indexed_commit, default_branch, profile,
                   created_at, updated_at
            FROM repo_profiles
            WHERE repo_id = :repo_id
            LIMIT 1
        """)
        
        with self.engine.connect() as conn:
            result = conn.execute(query, {"repo_id": repo_id})
            row = result.mappings().first()
            
            if not row:
                return None
            
            profile_data = row.get("profile")
            if isinstance(profile_data, str):
                try:
                    profile_data = json.loads(profile_data)
                except Exception:
                    profile_data = {}
            
            return RepoProfile(
                repo_id=row["repo_id"],
                repo_path=row.get("repo_path"),
                indexed_commit=row.get("indexed_commit"),
                default_branch=row.get("default_branch", "main"),
                profile=profile_data or {},
                created_at=row.get("created_at"),
                updated_at=row.get("updated_at"),
            )
    
    def upsert_profile(
        self,
        repo_id: str,
        repo_path: str | None = None,
        indexed_commit: str | None = None,
        default_branch: str = "main",
        profile: dict[str, Any] | None = None,
    ) -> RepoProfile:
        """Create or update repo profile."""
        now = datetime.now(timezone.utc)
        profile_json = json.dumps(profile or {})
        
        with self.engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO repo_profiles (repo_id, repo_path, indexed_commit, default_branch, profile, created_at, updated_at)
                    VALUES (:repo_id, :repo_path, :indexed_commit, :default_branch, CAST(:profile AS jsonb), :now, :now)
                    ON CONFLICT (repo_id) DO UPDATE SET
                        repo_path = COALESCE(EXCLUDED.repo_path, repo_profiles.repo_path),
                        indexed_commit = COALESCE(EXCLUDED.indexed_commit, repo_profiles.indexed_commit),
                        default_branch = EXCLUDED.default_branch,
                        profile = EXCLUDED.profile,
                        updated_at = EXCLUDED.updated_at
                """),
                {
                    "repo_id": repo_id,
                    "repo_path": repo_path,
                    "indexed_commit": indexed_commit,
                    "default_branch": default_branch,
                    "profile": profile_json,
                    "now": now,
                },
            )
        
        return RepoProfile(
            repo_id=repo_id,
            repo_path=repo_path,
            indexed_commit=indexed_commit,
            default_branch=default_branch,
            profile=profile or {},
            created_at=now,
            updated_at=now,
        )


class ProjectSettingsRepo:
    """Repository for project settings."""
    
    def __init__(self, engine: Engine | None = None):
        self.engine = engine or get_engine()
    
    def get_settings(self, project_id: str) -> ProjectSettings | None:
        """Get project settings."""
        query = text("""
            SELECT id, project_id, organization_id, auto_analysis_enabled, created_at, updated_at
            FROM project_settings
            WHERE project_id = :project_id
            LIMIT 1
        """)
        
        with self.engine.connect() as conn:
            result = conn.execute(query, {"project_id": project_id})
            row = result.mappings().first()
            
            if not row:
                return None
            
            return ProjectSettings(
                id=str(row["id"]),
                project_id=row["project_id"],
                organization_id=row.get("organization_id"),
                auto_analysis_enabled=row.get("auto_analysis_enabled", True),
                created_at=row.get("created_at"),
                updated_at=row.get("updated_at"),
            )
    
    def get_or_create_settings(self, project_id: str, organization_id: str | None = None) -> ProjectSettings:
        """Get or create project settings."""
        existing = self.get_settings(project_id)
        if existing:
            return existing
        
        now = datetime.now(timezone.utc)
        new_id = str(uuid.uuid4())
        
        with self.engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO project_settings (id, project_id, organization_id, auto_analysis_enabled, created_at, updated_at)
                    VALUES (:id, :project_id, :organization_id, TRUE, :now, :now)
                    ON CONFLICT (project_id) DO NOTHING
                """),
                {
                    "id": new_id,
                    "project_id": project_id,
                    "organization_id": organization_id,
                    "now": now,
                },
            )
        
        return self.get_settings(project_id) or ProjectSettings(
            id=new_id,
            project_id=project_id,
            organization_id=organization_id,
            auto_analysis_enabled=True,
            created_at=now,
            updated_at=now,
        )
    
    def set_auto_analysis_enabled(
        self,
        project_id: str,
        enabled: bool,
        changed_by: str | None = None,
        reason: str | None = None,
    ) -> None:
        """Set auto analysis enabled flag."""
        with self.engine.begin() as conn:
            conn.execute(
                text("""
                    UPDATE project_settings
                    SET auto_analysis_enabled = :enabled, updated_at = :now
                    WHERE project_id = :project_id
                """),
                {
                    "project_id": project_id,
                    "enabled": enabled,
                    "now": datetime.now(timezone.utc),
                },
            )


class BranchesRepo:
    """Repository for branches."""
    
    def __init__(self, engine: Engine | None = None):
        self.engine = engine or get_engine()
    
    def get_by_id(self, branch_id: str) -> Branch | None:
        """Get branch by ID."""
        query = text("""
            SELECT id, repo_id, org_id, name as branch_name, branch_type, branch_pattern,
                   last_commit_sha, last_commit_author, last_commit_message, last_commit_at,
                   created_by, created_at, base_branch, merged_into, merge_status,
                   merged_at, merged_by, is_protected, is_default, is_active,
                   ahead_count, behind_count, last_synced_at, description, metadata_json, updated_at
            FROM branches
            WHERE id = :id
            LIMIT 1
        """)
        
        with self.engine.connect() as conn:
            result = conn.execute(query, {"id": branch_id})
            row = result.mappings().first()
            
            if not row:
                return None
            
            return self._row_to_branch(row)
    
    def get_by_repo_and_name(self, repo_id: str, branch_name: str) -> Branch | None:
        """Get branch by repo and name."""
        query = text("""
            SELECT id, repo_id, org_id, name as branch_name, branch_type, branch_pattern,
                   last_commit_sha, last_commit_author, last_commit_message, last_commit_at,
                   created_by, created_at, base_branch, merged_into, merge_status,
                   merged_at, merged_by, is_protected, is_default, is_active,
                   ahead_count, behind_count, last_synced_at, description, metadata_json, updated_at
            FROM branches
            WHERE repo_id = :repo_id AND name = :branch_name
            LIMIT 1
        """)
        
        with self.engine.connect() as conn:
            result = conn.execute(query, {"repo_id": repo_id, "branch_name": branch_name})
            row = result.mappings().first()
            
            if not row:
                return None
            
            return self._row_to_branch(row)
    
    def list_by_repo(
        self,
        repo_id: str,
        is_protected: bool | None = None,
        is_active: bool | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Branch], int]:
        """List branches by repo."""
        conditions = ["repo_id = :repo_id"]
        params: dict[str, Any] = {"repo_id": repo_id, "limit": limit, "offset": offset}
        
        if is_protected is not None:
            conditions.append("is_protected = :is_protected")
            params["is_protected"] = is_protected
        
        if is_active is not None:
            conditions.append("is_active = :is_active")
            params["is_active"] = is_active
        
        where_clause = " AND ".join(conditions)
        
        query = text(f"""
            SELECT id, repo_id, org_id, name as branch_name, branch_type, branch_pattern,
                   last_commit_sha, last_commit_author, last_commit_message, last_commit_at,
                   created_by, created_at, base_branch, merged_into, merge_status,
                   merged_at, merged_by, is_protected, is_default, is_active,
                   ahead_count, behind_count, last_synced_at, description, metadata_json, updated_at
            FROM branches
            WHERE {where_clause}
            ORDER BY is_default DESC, name
            LIMIT :limit OFFSET :offset
        """)
        
        count_query = text(f"""
            SELECT COUNT(*) as total FROM branches WHERE {where_clause}
        """)
        
        with self.engine.connect() as conn:
            count_row = conn.execute(count_query, params).mappings().first()
            total = (count_row.get("total") if count_row else 0) or 0
            
            result = conn.execute(query, params)
            branches = [self._row_to_branch(row) for row in result.mappings().all()]
        
        return branches, total
    
    def create(
        self,
        branch_id: str,
        repo_id: str,
        branch_name: str,
        branch_type: str = "custom",
        org_id: str | None = None,
        is_default: bool = False,
        is_protected: bool = False,
        created_by: str | None = None,
        base_branch: str | None = None,
        description: str | None = None,
    ) -> Branch:
        """Create a branch."""
        now = datetime.now(timezone.utc)
        
        with self.engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO branches (id, repo_id, org_id, name, branch_type, is_default, is_protected, 
                                         created_by, base_branch, description, created_at, updated_at, is_active)
                    VALUES (:id, :repo_id, :org_id, :name, :branch_type, :is_default, :is_protected,
                           :created_by, :base_branch, :description, :now, :now, TRUE)
                    ON CONFLICT (repo_id, name) DO UPDATE SET
                        is_default = EXCLUDED.is_default,
                        updated_at = EXCLUDED.updated_at
                """),
                {
                    "id": branch_id,
                    "repo_id": repo_id,
                    "org_id": org_id,
                    "name": branch_name,
                    "branch_type": branch_type,
                    "is_default": is_default,
                    "is_protected": is_protected,
                    "created_by": created_by,
                    "base_branch": base_branch,
                    "description": description,
                    "now": now,
                },
            )
        
        return Branch(
            id=branch_id,
            repo_id=repo_id,
            org_id=org_id,
            branch_name=branch_name,
            branch_type=branch_type,
            is_default=is_default,
            is_protected=is_protected,
            created_by=created_by,
            base_branch=base_branch,
            description=description,
            created_at=now,
            updated_at=now,
            is_active=True,
        )
    
    def update(
        self,
        branch_id: str,
        is_protected: bool | None = None,
        is_active: bool | None = None,
        description: str | None = None,
    ) -> Branch | None:
        """Update a branch."""
        updates = []
        params: dict[str, Any] = {"id": branch_id, "now": datetime.now(timezone.utc)}
        
        if is_protected is not None:
            updates.append("is_protected = :is_protected")
            params["is_protected"] = is_protected
        
        if is_active is not None:
            updates.append("is_active = :is_active")
            params["is_active"] = is_active
        
        if description is not None:
            updates.append("description = :description")
            params["description"] = description
        
        if not updates:
            return self.get_by_id(branch_id)
        
        updates.append("updated_at = :now")
        
        with self.engine.begin() as conn:
            conn.execute(
                text(f"UPDATE branches SET {', '.join(updates)} WHERE id = :id"),
                params,
            )
        
        return self.get_by_id(branch_id)
    
    def delete(self, branch_id: str) -> bool:
        """Delete a branch."""
        with self.engine.begin() as conn:
            result = conn.execute(
                text("DELETE FROM branches WHERE id = :id"),
                {"id": branch_id},
            )
            return result.rowcount > 0
    
    def set_default_branch(self, repo_id: str, branch_id: str) -> None:
        """Set a branch as default."""
        with self.engine.begin() as conn:
            # Clear existing default
            conn.execute(
                text("UPDATE branches SET is_default = FALSE WHERE repo_id = :repo_id"),
                {"repo_id": repo_id},
            )
            # Set new default
            conn.execute(
                text("UPDATE branches SET is_default = TRUE WHERE id = :id"),
                {"id": branch_id},
            )
    
    def _row_to_branch(self, row) -> Branch:
        """Convert a database row to a Branch model."""
        metadata = row.get("metadata_json")
        if isinstance(metadata, str):
            try:
                metadata = json.loads(metadata)
            except Exception:
                metadata = {}
        
        return Branch(
            id=row["id"],
            repo_id=row["repo_id"],
            org_id=row.get("org_id"),
            branch_name=row.get("branch_name", ""),
            branch_type=row.get("branch_type", "custom"),
            branch_pattern=row.get("branch_pattern"),
            last_commit_sha=row.get("last_commit_sha"),
            last_commit_author=row.get("last_commit_author"),
            last_commit_message=row.get("last_commit_message"),
            last_commit_at=row.get("last_commit_at"),
            created_by=row.get("created_by"),
            created_at=row.get("created_at"),
            base_branch=row.get("base_branch"),
            merged_into=row.get("merged_into"),
            merge_status=row.get("merge_status"),
            merged_at=row.get("merged_at"),
            merged_by=row.get("merged_by"),
            is_protected=row.get("is_protected", False),
            is_default=row.get("is_default", False),
            is_active=row.get("is_active", True),
            ahead_count=row.get("ahead_count", 0),
            behind_count=row.get("behind_count", 0),
            last_synced_at=row.get("last_synced_at"),
            description=row.get("description"),
            metadata_json=metadata or {},
            updated_at=row.get("updated_at"),
        )
