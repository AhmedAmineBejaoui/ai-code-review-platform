"""
Review Service repositories.
"""

import hashlib
import json
import logging
import uuid
from dataclasses import asdict
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Engine

from .database import get_engine
from .models import ReviewAssignment, ReviewComment, ChangeRequest

logger = logging.getLogger(__name__)


class ReviewAssignmentsRepo:
    """Repository for review assignments."""
    
    def __init__(self, engine: Engine | None = None):
        self.engine = engine or get_engine()
    
    def create_assignment(
        self,
        analysis_id: str,
        reviewer_id: str,
        assigner_id: str | None = None,
        assignment_type: str = "manual",
        priority: str = "medium",
        due_at: str | None = None,
    ) -> str:
        """Create a new review assignment."""
        assignment_id = f"ra_{uuid.uuid4().hex[:20]}"
        now = datetime.now(timezone.utc)
        
        due_at_dt = None
        if due_at:
            try:
                due_at_dt = datetime.fromisoformat(due_at.replace("Z", "+00:00"))
            except Exception:
                pass
        
        with self.engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO review_assignments (
                        id, analysis_id, reviewer_id, assigner_id, assignment_type,
                        status, priority, assigned_at, due_at, created_at, updated_at
                    ) VALUES (
                        :id, :analysis_id, :reviewer_id, :assigner_id, :assignment_type,
                        'pending', :priority, :assigned_at, :due_at, :created_at, :updated_at
                    )
                """),
                {
                    "id": assignment_id,
                    "analysis_id": analysis_id,
                    "reviewer_id": reviewer_id,
                    "assigner_id": assigner_id,
                    "assignment_type": assignment_type,
                    "priority": priority,
                    "assigned_at": now,
                    "due_at": due_at_dt,
                    "created_at": now,
                    "updated_at": now,
                },
            )
        
        return assignment_id
    
    def get_assignment_by_id(self, assignment_id: str) -> dict[str, Any] | None:
        """Get assignment by ID."""
        query = text("""
            SELECT id, analysis_id, reviewer_id, assigner_id, assignment_type,
                   status, priority, assigned_at, started_at, completed_at,
                   due_at, declined_reason, created_at, updated_at
            FROM review_assignments
            WHERE id = :id
            LIMIT 1
        """)
        
        with self.engine.connect() as conn:
            result = conn.execute(query, {"id": assignment_id})
            row = result.mappings().first()
            
            if not row:
                return None
            
            return self._row_to_dict(row)
    
    def get_assignments_by_reviewer(
        self,
        reviewer_id: str,
        status_filter: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        """Get assignments for a reviewer."""
        conditions = ["reviewer_id = :reviewer_id"]
        params: dict[str, Any] = {"reviewer_id": reviewer_id, "limit": limit, "offset": offset}
        
        if status_filter:
            conditions.append("status = :status")
            params["status"] = status_filter
        
        where_clause = " AND ".join(conditions)
        
        query = text(f"""
            SELECT id, analysis_id, reviewer_id, assigner_id, assignment_type,
                   status, priority, assigned_at, started_at, completed_at,
                   due_at, declined_reason, created_at, updated_at
            FROM review_assignments
            WHERE {where_clause}
            ORDER BY 
                CASE priority 
                    WHEN 'critical' THEN 1 
                    WHEN 'high' THEN 2 
                    WHEN 'medium' THEN 3 
                    ELSE 4 
                END,
                due_at NULLS LAST,
                assigned_at DESC
            LIMIT :limit OFFSET :offset
        """)
        
        with self.engine.connect() as conn:
            result = conn.execute(query, params)
            return [self._row_to_dict(row) for row in result.mappings().all()]
    
    def update_assignment(
        self,
        assignment_id: str,
        status: str | None = None,
        started_at: str | None = None,
        completed_at: str | None = None,
        declined_reason: str | None = None,
    ) -> bool:
        """Update assignment."""
        updates = []
        params: dict[str, Any] = {"id": assignment_id, "now": datetime.now(timezone.utc)}
        
        if status is not None:
            updates.append("status = :status")
            params["status"] = status
        
        if started_at is not None:
            updates.append("started_at = :started_at")
            try:
                params["started_at"] = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
            except Exception:
                params["started_at"] = datetime.now(timezone.utc)
        
        if completed_at is not None:
            updates.append("completed_at = :completed_at")
            try:
                params["completed_at"] = datetime.fromisoformat(completed_at.replace("Z", "+00:00"))
            except Exception:
                params["completed_at"] = datetime.now(timezone.utc)
        
        if declined_reason is not None:
            updates.append("declined_reason = :declined_reason")
            params["declined_reason"] = declined_reason
        
        if not updates:
            return True
        
        updates.append("updated_at = :now")
        
        with self.engine.begin() as conn:
            result = conn.execute(
                text(f"UPDATE review_assignments SET {', '.join(updates)} WHERE id = :id"),
                params,
            )
            return result.rowcount > 0
    
    def _row_to_dict(self, row) -> dict[str, Any]:
        """Convert row to dictionary with ISO formatted dates."""
        return {
            "id": row["id"],
            "analysis_id": row["analysis_id"],
            "reviewer_id": row["reviewer_id"],
            "assigner_id": row.get("assigner_id"),
            "assignment_type": row.get("assignment_type", "manual"),
            "status": row.get("status", "pending"),
            "priority": row.get("priority", "medium"),
            "assigned_at": row["assigned_at"].isoformat() if row.get("assigned_at") else None,
            "started_at": row["started_at"].isoformat() if row.get("started_at") else None,
            "completed_at": row["completed_at"].isoformat() if row.get("completed_at") else None,
            "due_at": row["due_at"].isoformat() if row.get("due_at") else None,
            "declined_reason": row.get("declined_reason"),
            "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
            "updated_at": row["updated_at"].isoformat() if row.get("updated_at") else None,
        }


class ReviewCommentsRepo:
    """Repository for review comments."""
    
    def __init__(self, engine: Engine | None = None):
        self.engine = engine or get_engine()
    
    def create_comment(
        self,
        analysis_id: str,
        author_id: str,
        file_path: str,
        line_start: int,
        content: str,
        comment_type: str = "comment",
        parent_id: str | None = None,
        line_end: int | None = None,
        code_snippet: str | None = None,
        severity: str | None = None,
        is_blocking: bool = False,
    ) -> str:
        """Create a new review comment."""
        comment_id = f"rc_{uuid.uuid4().hex[:20]}"
        now = datetime.now(timezone.utc)
        
        with self.engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO review_comments (
                        id, analysis_id, author_id, parent_id, file_path,
                        line_start, line_end, code_snippet, content, comment_type,
                        severity, status, is_blocking, reactions_json, created_at, updated_at
                    ) VALUES (
                        :id, :analysis_id, :author_id, :parent_id, :file_path,
                        :line_start, :line_end, :code_snippet, :content, :comment_type,
                        :severity, 'open', :is_blocking, '{}', :created_at, :updated_at
                    )
                """),
                {
                    "id": comment_id,
                    "analysis_id": analysis_id,
                    "author_id": author_id,
                    "parent_id": parent_id,
                    "file_path": file_path,
                    "line_start": line_start,
                    "line_end": line_end,
                    "code_snippet": code_snippet,
                    "content": content,
                    "comment_type": comment_type,
                    "severity": severity,
                    "is_blocking": is_blocking,
                    "created_at": now,
                    "updated_at": now,
                },
            )
        
        return comment_id
    
    def get_comment_by_id(self, comment_id: str) -> dict[str, Any] | None:
        """Get comment by ID."""
        query = text("""
            SELECT id, analysis_id, author_id, parent_id, file_path,
                   line_start, line_end, code_snippet, content, comment_type,
                   severity, status, resolved_by, resolved_at, is_blocking,
                   reactions_json, created_at, updated_at
            FROM review_comments
            WHERE id = :id
            LIMIT 1
        """)
        
        with self.engine.connect() as conn:
            result = conn.execute(query, {"id": comment_id})
            row = result.mappings().first()
            
            if not row:
                return None
            
            return self._row_to_dict(row)
    
    def get_comments_by_analysis(
        self,
        analysis_id: str,
        status_filter: str | None = None,
        file_path: str | None = None,
    ) -> list[dict[str, Any]]:
        """Get comments for an analysis."""
        conditions = ["analysis_id = :analysis_id"]
        params: dict[str, Any] = {"analysis_id": analysis_id}
        
        if status_filter:
            conditions.append("status = :status")
            params["status"] = status_filter
        
        if file_path:
            conditions.append("file_path = :file_path")
            params["file_path"] = file_path
        
        where_clause = " AND ".join(conditions)
        
        query = text(f"""
            SELECT id, analysis_id, author_id, parent_id, file_path,
                   line_start, line_end, code_snippet, content, comment_type,
                   severity, status, resolved_by, resolved_at, is_blocking,
                   reactions_json, created_at, updated_at
            FROM review_comments
            WHERE {where_clause}
            ORDER BY file_path, line_start, created_at
        """)
        
        with self.engine.connect() as conn:
            result = conn.execute(query, params)
            return [self._row_to_dict(row) for row in result.mappings().all()]
    
    def get_comments_by_author(
        self,
        author_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        """Get comments by author."""
        query = text("""
            SELECT id, analysis_id, author_id, parent_id, file_path,
                   line_start, line_end, code_snippet, content, comment_type,
                   severity, status, resolved_by, resolved_at, is_blocking,
                   reactions_json, created_at, updated_at
            FROM review_comments
            WHERE author_id = :author_id
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        """)
        
        with self.engine.connect() as conn:
            result = conn.execute(query, {"author_id": author_id, "limit": limit, "offset": offset})
            return [self._row_to_dict(row) for row in result.mappings().all()]
    
    def get_comment_thread(self, comment_id: str) -> list[dict[str, Any]]:
        """Get comment thread (parent and all replies)."""
        # First get the root comment
        root_query = text("""
            WITH RECURSIVE thread AS (
                SELECT id, parent_id, 0 as depth
                FROM review_comments
                WHERE id = :id
                
                UNION ALL
                
                SELECT rc.id, rc.parent_id, t.depth - 1
                FROM review_comments rc
                JOIN thread t ON rc.id = t.parent_id
                WHERE rc.parent_id IS NOT NULL
            )
            SELECT id FROM thread ORDER BY depth LIMIT 1
        """)
        
        with self.engine.connect() as conn:
            root_row = conn.execute(root_query, {"id": comment_id}).fetchone()
            root_id = root_row[0] if root_row else comment_id
        
        # Then get all descendants
        query = text("""
            WITH RECURSIVE thread AS (
                SELECT id, analysis_id, author_id, parent_id, file_path,
                       line_start, line_end, code_snippet, content, comment_type,
                       severity, status, resolved_by, resolved_at, is_blocking,
                       reactions_json, created_at, updated_at, 0 as depth
                FROM review_comments
                WHERE id = :root_id
                
                UNION ALL
                
                SELECT rc.id, rc.analysis_id, rc.author_id, rc.parent_id, rc.file_path,
                       rc.line_start, rc.line_end, rc.code_snippet, rc.content, rc.comment_type,
                       rc.severity, rc.status, rc.resolved_by, rc.resolved_at, rc.is_blocking,
                       rc.reactions_json, rc.created_at, rc.updated_at, t.depth + 1
                FROM review_comments rc
                JOIN thread t ON rc.parent_id = t.id
            )
            SELECT * FROM thread ORDER BY depth, created_at
        """)
        
        with self.engine.connect() as conn:
            result = conn.execute(query, {"root_id": root_id})
            return [self._row_to_dict(row) for row in result.mappings().all()]
    
    def update_comment(
        self,
        comment_id: str,
        content: str | None = None,
        status: str | None = None,
        resolved_by: str | None = None,
        resolved_at: str | None = None,
    ) -> bool:
        """Update comment."""
        updates = []
        params: dict[str, Any] = {"id": comment_id, "now": datetime.now(timezone.utc)}
        
        if content is not None:
            updates.append("content = :content")
            params["content"] = content
        
        if status is not None:
            updates.append("status = :status")
            params["status"] = status
        
        if resolved_by is not None:
            updates.append("resolved_by = :resolved_by")
            params["resolved_by"] = resolved_by
        
        if resolved_at is not None:
            updates.append("resolved_at = :resolved_at")
            try:
                params["resolved_at"] = datetime.fromisoformat(resolved_at.replace("Z", "+00:00"))
            except Exception:
                params["resolved_at"] = datetime.now(timezone.utc)
        
        if not updates:
            return True
        
        updates.append("updated_at = :now")
        
        with self.engine.begin() as conn:
            result = conn.execute(
                text(f"UPDATE review_comments SET {', '.join(updates)} WHERE id = :id"),
                params,
            )
            return result.rowcount > 0
    
    def _row_to_dict(self, row) -> dict[str, Any]:
        """Convert row to dictionary."""
        reactions = row.get("reactions_json")
        if isinstance(reactions, str):
            try:
                reactions = json.loads(reactions)
            except Exception:
                reactions = {}
        
        return {
            "id": row["id"],
            "analysis_id": row["analysis_id"],
            "author_id": row["author_id"],
            "parent_id": row.get("parent_id"),
            "file_path": row["file_path"],
            "line_start": row["line_start"],
            "line_end": row.get("line_end"),
            "code_snippet": row.get("code_snippet"),
            "content": row["content"],
            "comment_type": row.get("comment_type", "comment"),
            "severity": row.get("severity"),
            "status": row.get("status", "open"),
            "resolved_by": row.get("resolved_by"),
            "resolved_at": row["resolved_at"] if row.get("resolved_at") else None,
            "is_blocking": row.get("is_blocking", False),
            "reactions_json": reactions or {},
            "created_at": row["created_at"] if row.get("created_at") else None,
            "updated_at": row["updated_at"] if row.get("updated_at") else None,
        }


class ChangeRequestsRepo:
    """Repository for change requests."""
    
    def __init__(self, engine: Engine | None = None):
        self.engine = engine or get_engine()
    
    def create_change_request(
        self,
        analysis_id: str,
        reviewer_id: str,
        title: str,
        description: str,
        category: str,
        priority: str = "medium",
        related_comments: list[str] | None = None,
        related_findings: list[str] | None = None,
    ) -> str:
        """Create a new change request."""
        cr_id = f"cr_{uuid.uuid4().hex[:20]}"
        now = datetime.now(timezone.utc)
        
        with self.engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO change_requests (
                        id, analysis_id, reviewer_id, title, description, category,
                        priority, related_comments, related_findings, status, created_at, updated_at
                    ) VALUES (
                        :id, :analysis_id, :reviewer_id, :title, :description, :category,
                        :priority, CAST(:related_comments AS jsonb), CAST(:related_findings AS jsonb),
                        'open', :created_at, :updated_at
                    )
                """),
                {
                    "id": cr_id,
                    "analysis_id": analysis_id,
                    "reviewer_id": reviewer_id,
                    "title": title,
                    "description": description,
                    "category": category,
                    "priority": priority,
                    "related_comments": json.dumps(related_comments or []),
                    "related_findings": json.dumps(related_findings or []),
                    "created_at": now,
                    "updated_at": now,
                },
            )
        
        return cr_id
    
    def get_change_request_by_id(self, cr_id: str) -> dict[str, Any] | None:
        """Get change request by ID."""
        query = text("""
            SELECT id, analysis_id, reviewer_id, title, description, category,
                   priority, related_comments, related_findings, status,
                   resolved_by, resolved_at, resolution_comment, created_at, updated_at
            FROM change_requests
            WHERE id = :id
            LIMIT 1
        """)
        
        with self.engine.connect() as conn:
            result = conn.execute(query, {"id": cr_id})
            row = result.mappings().first()
            
            if not row:
                return None
            
            return self._row_to_dict(row)
    
    def get_change_requests_by_analysis(
        self,
        analysis_id: str,
        status_filter: str | None = None,
    ) -> list[dict[str, Any]]:
        """Get change requests for an analysis."""
        conditions = ["analysis_id = :analysis_id"]
        params: dict[str, Any] = {"analysis_id": analysis_id}
        
        if status_filter:
            conditions.append("status = :status")
            params["status"] = status_filter
        
        where_clause = " AND ".join(conditions)
        
        query = text(f"""
            SELECT id, analysis_id, reviewer_id, title, description, category,
                   priority, related_comments, related_findings, status,
                   resolved_by, resolved_at, resolution_comment, created_at, updated_at
            FROM change_requests
            WHERE {where_clause}
            ORDER BY 
                CASE priority 
                    WHEN 'critical' THEN 1 
                    WHEN 'high' THEN 2 
                    WHEN 'medium' THEN 3 
                    ELSE 4 
                END,
                created_at DESC
        """)
        
        with self.engine.connect() as conn:
            result = conn.execute(query, params)
            return [self._row_to_dict(row) for row in result.mappings().all()]
    
    def get_change_requests_by_reviewer(
        self,
        reviewer_id: str,
        status_filter: str | None = None,
    ) -> list[dict[str, Any]]:
        """Get change requests by reviewer."""
        conditions = ["reviewer_id = :reviewer_id"]
        params: dict[str, Any] = {"reviewer_id": reviewer_id}
        
        if status_filter:
            conditions.append("status = :status")
            params["status"] = status_filter
        
        where_clause = " AND ".join(conditions)
        
        query = text(f"""
            SELECT id, analysis_id, reviewer_id, title, description, category,
                   priority, related_comments, related_findings, status,
                   resolved_by, resolved_at, resolution_comment, created_at, updated_at
            FROM change_requests
            WHERE {where_clause}
            ORDER BY created_at DESC
        """)
        
        with self.engine.connect() as conn:
            result = conn.execute(query, params)
            return [self._row_to_dict(row) for row in result.mappings().all()]
    
    def get_open_change_requests(self, limit: int = 50) -> list[dict[str, Any]]:
        """Get open change requests."""
        query = text("""
            SELECT id, analysis_id, reviewer_id, title, description, category,
                   priority, related_comments, related_findings, status,
                   resolved_by, resolved_at, resolution_comment, created_at, updated_at
            FROM change_requests
            WHERE status = 'open'
            ORDER BY 
                CASE priority 
                    WHEN 'critical' THEN 1 
                    WHEN 'high' THEN 2 
                    WHEN 'medium' THEN 3 
                    ELSE 4 
                END,
                created_at DESC
            LIMIT :limit
        """)
        
        with self.engine.connect() as conn:
            result = conn.execute(query, {"limit": limit})
            return [self._row_to_dict(row) for row in result.mappings().all()]
    
    def update_change_request(
        self,
        cr_id: str,
        status: str | None = None,
        resolved_by: str | None = None,
        resolved_at: str | None = None,
        resolution_comment: str | None = None,
    ) -> bool:
        """Update change request."""
        updates = []
        params: dict[str, Any] = {"id": cr_id, "now": datetime.now(timezone.utc)}
        
        if status is not None:
            updates.append("status = :status")
            params["status"] = status
        
        if resolved_by is not None:
            updates.append("resolved_by = :resolved_by")
            params["resolved_by"] = resolved_by
        
        if resolved_at is not None:
            updates.append("resolved_at = :resolved_at")
            try:
                params["resolved_at"] = datetime.fromisoformat(resolved_at.replace("Z", "+00:00"))
            except Exception:
                params["resolved_at"] = datetime.now(timezone.utc)
        
        if resolution_comment is not None:
            updates.append("resolution_comment = :resolution_comment")
            params["resolution_comment"] = resolution_comment
        
        if not updates:
            return True
        
        updates.append("updated_at = :now")
        
        with self.engine.begin() as conn:
            result = conn.execute(
                text(f"UPDATE change_requests SET {', '.join(updates)} WHERE id = :id"),
                params,
            )
            return result.rowcount > 0
    
    def _row_to_dict(self, row) -> dict[str, Any]:
        """Convert row to dictionary."""
        related_comments = row.get("related_comments")
        if isinstance(related_comments, str):
            try:
                related_comments = json.loads(related_comments)
            except Exception:
                related_comments = []
        
        related_findings = row.get("related_findings")
        if isinstance(related_findings, str):
            try:
                related_findings = json.loads(related_findings)
            except Exception:
                related_findings = []
        
        return {
            "id": row["id"],
            "analysis_id": row["analysis_id"],
            "reviewer_id": row["reviewer_id"],
            "title": row["title"],
            "description": row["description"],
            "category": row["category"],
            "priority": row.get("priority", "medium"),
            "related_comments": related_comments or [],
            "related_findings": related_findings or [],
            "status": row.get("status", "open"),
            "resolved_by": row.get("resolved_by"),
            "resolved_at": row["resolved_at"].isoformat() if row.get("resolved_at") else None,
            "resolution_comment": row.get("resolution_comment"),
            "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
            "updated_at": row["updated_at"].isoformat() if row.get("updated_at") else None,
        }
