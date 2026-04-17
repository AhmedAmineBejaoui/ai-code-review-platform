"""
Repository layer for Analysis Service database operations.
"""

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any, List, Optional

from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError

from .models import Analysis, Finding, ToolRun, AnalysisFile, PageResult


class DuplicateAnalysisError(Exception):
    """Raised when trying to create a duplicate analysis."""
    def __init__(self, existing_id: Optional[str] = None):
        self.existing_id = existing_id
        super().__init__("Duplicate analysis")


class AnalysesRepo:
    """Repository for analysis operations."""
    
    def __init__(self, engine: Engine):
        self.engine = engine
    
    def create(
        self,
        repo: str,
        diff_text: str,
        source: str = "manual",
        project_id: Optional[str] = None,
        pr_number: Optional[int] = None,
        commit_sha: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> Analysis:
        """Create a new analysis."""
        analysis_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        diff_hash = hashlib.sha256(diff_text.encode()).hexdigest()[:16]
        
        # Check project exists
        if project_id:
            with self.engine.connect() as conn:
                project = conn.execute(
                    text("SELECT id FROM project_profiles WHERE id = :id"),
                    {"id": project_id}
                ).first()
                if not project:
                    raise ValueError(f"Project {project_id} not found")
        
        with self.engine.begin() as conn:
            try:
                conn.execute(
                    text("""
                        INSERT INTO analyses (
                            id, project_id, repo, provider, pr_number, commit_sha, source, status,
                            stage, progress, created_at, updated_at, diff_hash, diff_raw, diff_text,
                            metadata_json
                        )
                        VALUES (
                            :id, :project_id, :repo, 'github', :pr_number, :commit_sha, :source, 'RECEIVED',
                            'RECEIVED', 0, :now, :now, :diff_hash, :diff_raw, :diff_text,
                            CAST(:metadata AS jsonb)
                        )
                    """),
                    {
                        "id": analysis_id,
                        "project_id": project_id,
                        "repo": repo,
                        "pr_number": pr_number,
                        "commit_sha": commit_sha,
                        "source": source,
                        "now": now,
                        "diff_hash": diff_hash,
                        "diff_raw": diff_text,
                        "diff_text": diff_text,
                        "metadata": json.dumps(metadata or {}),
                    }
                )
            except IntegrityError as e:
                # Check for duplicate
                existing = self.find_duplicate(repo, diff_hash)
                if existing:
                    raise DuplicateAnalysisError(existing) from e
                raise
        
        return self.get_by_id(analysis_id)
    
    def get_by_id(self, analysis_id: str) -> Optional[Analysis]:
        """Get analysis by ID."""
        with self.engine.connect() as conn:
            row = conn.execute(
                text("SELECT * FROM analyses WHERE id = :id"),
                {"id": analysis_id}
            ).mappings().first()
            
            if not row:
                return None
            
            return self._row_to_model(row)
    
    def find_duplicate(self, repo: str, diff_hash: str) -> Optional[str]:
        """Find existing analysis with same repo and diff hash."""
        with self.engine.connect() as conn:
            row = conn.execute(
                text("SELECT id FROM analyses WHERE repo = :repo AND diff_hash = :diff_hash LIMIT 1"),
                {"repo": repo, "diff_hash": diff_hash}
            ).first()
            
            return row[0] if row else None
    
    def update_status(
        self,
        analysis_id: str,
        status: str,
        stage: Optional[str] = None,
        progress: Optional[int] = None,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
        metadata_updates: Optional[dict] = None,
    ) -> Optional[Analysis]:
        """Update analysis status."""
        now = datetime.now(timezone.utc).isoformat()
        
        updates = ["status = :status", "updated_at = :now"]
        params = {"id": analysis_id, "status": status, "now": now}
        
        if stage is not None:
            updates.append("stage = :stage")
            params["stage"] = stage
        if progress is not None:
            updates.append("progress = :progress")
            params["progress"] = progress
        if error_code is not None:
            updates.append("error_code = :error_code")
            params["error_code"] = error_code
        if error_message is not None:
            updates.append("error_message = :error_message")
            params["error_message"] = error_message
        if metadata_updates:
            updates.append("metadata_json = metadata_json || CAST(:metadata AS jsonb)")
            params["metadata"] = json.dumps(metadata_updates)
        
        with self.engine.begin() as conn:
            conn.execute(
                text(f"UPDATE analyses SET {', '.join(updates)} WHERE id = :id"),
                params
            )
        
        return self.get_by_id(analysis_id)
    
    def delete(self, analysis_id: str) -> bool:
        """Delete an analysis."""
        with self.engine.begin() as conn:
            # Delete related records first
            conn.execute(text("DELETE FROM findings WHERE analysis_id = :id"), {"id": analysis_id})
            conn.execute(text("DELETE FROM tool_runs WHERE analysis_id = :id"), {"id": analysis_id})
            conn.execute(text("DELETE FROM analysis_files WHERE analysis_id = :id"), {"id": analysis_id})
            
            result = conn.execute(
                text("DELETE FROM analyses WHERE id = :id"),
                {"id": analysis_id}
            )
            return result.rowcount > 0
    
    def list_paginated(
        self,
        page: int = 1,
        size: int = 20,
        repo: Optional[str] = None,
        status: Optional[str] = None,
        project_id: Optional[str] = None,
    ) -> PageResult:
        """List analyses with pagination."""
        offset = (page - 1) * size
        
        where_clauses = []
        params = {"limit": size, "offset": offset}
        
        if repo:
            where_clauses.append("repo = :repo")
            params["repo"] = repo
        if status:
            where_clauses.append("status = :status")
            params["status"] = status
        if project_id:
            where_clauses.append("project_id = :project_id")
            params["project_id"] = project_id
        
        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
        
        with self.engine.connect() as conn:
            # Get total count
            count_row = conn.execute(
                text(f"SELECT COUNT(*) FROM analyses WHERE {where_sql}"),
                params
            ).scalar()
            total = count_row or 0
            
            # Get items
            rows = conn.execute(
                text(f"""
                    SELECT * FROM analyses
                    WHERE {where_sql}
                    ORDER BY created_at DESC
                    LIMIT :limit OFFSET :offset
                """),
                params
            ).mappings().all()
            
            items = [self._row_to_model(row) for row in rows]
            pages = (total + size - 1) // size if size > 0 else 0
            
            return PageResult(
                items=items,
                page=page,
                size=size,
                total=total,
                pages=pages,
            )
    
    def _row_to_model(self, row) -> Analysis:
        """Convert database row to Analysis model."""
        metadata = row.get("metadata_json") or {}
        if isinstance(metadata, str):
            metadata = json.loads(metadata)
        
        return Analysis(
            id=row["id"],
            repo=row["repo"],
            provider=row.get("provider", "github"),
            project_id=row.get("project_id"),
            pr_number=row.get("pr_number"),
            commit_sha=row.get("commit_sha"),
            source=row.get("source", "manual"),
            status=row.get("status", "RECEIVED"),
            stage=row.get("stage"),
            progress=row.get("progress"),
            nb_files_changed=row.get("nb_files_changed"),
            additions_total=row.get("additions_total"),
            deletions_total=row.get("deletions_total"),
            created_at=str(row.get("created_at", "")),
            updated_at=str(row.get("updated_at", "")),
            diff_hash=row.get("diff_hash", ""),
            diff_raw=row.get("diff_raw", ""),
            summary=row.get("summary"),
            diff_redacted=row.get("diff_redacted"),
            has_secrets=row.get("has_secrets", False),
            redaction_stats=row.get("redaction_stats") or {},
            static_stats=row.get("static_stats") or {},
            change_type=row.get("change_type"),
            change_type_confidence=row.get("change_type_confidence"),
            change_type_source=row.get("change_type_source"),
            change_type_signals=row.get("change_type_signals") or {},
            error_code=row.get("error_code"),
            error_message=row.get("error_message"),
            metadata=metadata,
            findings_count=row.get("findings_count", 0),
            blocker_count=row.get("blocker_count", 0),
            warn_count=row.get("warn_count", 0),
            info_count=row.get("info_count", 0),
        )


class FindingsRepo:
    """Repository for findings operations."""
    
    def __init__(self, engine: Engine):
        self.engine = engine
    
    def create(
        self,
        analysis_id: str,
        source: str,
        message: str,
        category: str = "quality",
        severity: str = "WARN",
        file_path: Optional[str] = None,
        line_start: Optional[int] = None,
        line_end: Optional[int] = None,
        suggestion: Optional[str] = None,
        confidence: Optional[float] = None,
        issue_type: Optional[str] = None,
        rule_id: Optional[str] = None,
        evidence: Optional[dict] = None,
    ) -> Finding:
        """Create a new finding."""
        finding_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        # Generate fingerprint
        fingerprint_data = f"{analysis_id}:{file_path}:{line_start}:{message}"
        fingerprint = hashlib.sha256(fingerprint_data.encode()).hexdigest()[:16]
        
        with self.engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO findings (
                        id, analysis_id, source, file_path, line_start, line_end,
                        severity, category, message, suggestion, confidence,
                        issue_type, rule_id, evidence, fingerprint, created_at
                    )
                    VALUES (
                        :id, :analysis_id, :source, :file_path, :line_start, :line_end,
                        :severity, :category, :message, :suggestion, :confidence,
                        :issue_type, :rule_id, CAST(:evidence AS jsonb), :fingerprint, :now
                    )
                """),
                {
                    "id": finding_id,
                    "analysis_id": analysis_id,
                    "source": source,
                    "file_path": file_path,
                    "line_start": line_start,
                    "line_end": line_end,
                    "severity": severity,
                    "category": category,
                    "message": message,
                    "suggestion": suggestion,
                    "confidence": confidence,
                    "issue_type": issue_type,
                    "rule_id": rule_id,
                    "evidence": json.dumps(evidence or {}),
                    "fingerprint": fingerprint,
                    "now": now,
                }
            )
        
        return Finding(
            id=finding_id,
            analysis_id=analysis_id,
            source=source,
            file_path=file_path,
            line_start=line_start,
            line_end=line_end,
            severity=severity,
            category=category,
            message=message,
            suggestion=suggestion,
            confidence=confidence,
            issue_type=issue_type,
            rule_id=rule_id,
            evidence=evidence or {},
            fingerprint=fingerprint,
            created_at=now,
        )
    
    def list_by_analysis(self, analysis_id: str) -> List[Finding]:
        """List all findings for an analysis."""
        with self.engine.connect() as conn:
            rows = conn.execute(
                text("SELECT * FROM findings WHERE analysis_id = :id ORDER BY created_at"),
                {"id": analysis_id}
            ).mappings().all()
            
            return [
                Finding(
                    id=row["id"],
                    analysis_id=row["analysis_id"],
                    source=row["source"],
                    file_path=row.get("file_path"),
                    line_start=row.get("line_start"),
                    line_end=row.get("line_end"),
                    severity=row.get("severity", "WARN"),
                    category=row.get("category", "quality"),
                    message=row.get("message", ""),
                    suggestion=row.get("suggestion"),
                    confidence=row.get("confidence"),
                    issue_type=row.get("issue_type"),
                    rule_id=row.get("rule_id"),
                    evidence=row.get("evidence") or {},
                    fingerprint=row.get("fingerprint", ""),
                    created_at=str(row.get("created_at", "")),
                )
                for row in rows
            ]


class ToolRunsRepo:
    """Repository for tool run operations."""
    
    def __init__(self, engine: Engine):
        self.engine = engine
    
    def list_by_analysis(self, analysis_id: str) -> List[ToolRun]:
        """List all tool runs for an analysis."""
        with self.engine.connect() as conn:
            rows = conn.execute(
                text("SELECT * FROM tool_runs WHERE analysis_id = :id ORDER BY started_at"),
                {"id": analysis_id}
            ).mappings().all()
            
            return [
                ToolRun(
                    id=row["id"],
                    analysis_id=row["analysis_id"],
                    tool_name=row["tool_name"],
                    status=row.get("status", "SUCCESS"),
                    started_at=str(row.get("started_at", "")),
                    finished_at=str(row.get("finished_at")) if row.get("finished_at") else None,
                    duration_ms=row.get("duration_ms", 0),
                    exit_code=row.get("exit_code"),
                    findings_count=row.get("findings_count", 0),
                    scanned_files=row.get("scanned_files", 0),
                    version=row.get("version"),
                    warning=row.get("warning"),
                    command=row.get("command"),
                    workspace_path=row.get("workspace_path"),
                    stdout_snippet=row.get("stdout_snippet"),
                    stderr_snippet=row.get("stderr_snippet"),
                    created_at=str(row.get("created_at", "")),
                )
                for row in rows
            ]
