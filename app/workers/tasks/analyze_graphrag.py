"""
New GraphRAG-based analysis pipeline task.

This task replaces the monolithic analyze_pr.py with the new microservices architecture:
- Uses AnalysisOrchestrator for coordinating services
- Uses GraphManager for Neo4j graph operations
- Uses HybridRetriever for knowledge retrieval
- Uses GenerationService for LLM-based analysis
- Uses AnalysisHistoryService for tracking

The old analyze_pr.py task is kept for backward compatibility.
"""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from app.core.analysis.repository_resolution import resolve_repository_scope
from app.core.analysis.orchestrator import AnalysisOrchestrator
from app.core.analysis.graph.manager import GraphManager
from app.core.analysis.history import AnalysisHistoryService, AnalysisStatus, AnalysisMetrics
from app.core.review_engine.diff_engine import parse_unified_diff
from app.core.review_engine.security import redact_unified_diff_added_lines, scan_parsed_diff_for_secrets
from app.data.repos.analyses_repo import AnalysesRepo
from app.integrations.graph_database.neo4j_client import Neo4jClient
from app.settings import settings
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="analysis.run_graphrag_pipeline", bind=True)
def run_graphrag_analysis_pipeline(self, analysis_id: str) -> dict[str, Any]:
    """
    Execute GraphRAG-based analysis pipeline.
    
    Pipeline stages:
    1. Load analysis from DB
    2. Parse diff
    3. Secret scan & redaction
    4. Start analysis run in history
    5. Index repository (if needed)
    6. Run orchestrator (static analysis + GraphRAG)
    7. Complete analysis run
    8. Compare with previous run
    
    Args:
        analysis_id: Analysis UUID string
        
    Returns:
        Dict with status and metrics
    """
    started_at = time.perf_counter()
    
    logger.info(f"Starting GraphRAG analysis pipeline for analysis_id={analysis_id}")
    
    # Run async pipeline
    result = asyncio.run(_run_graphrag_pipeline_async(
        analysis_id=analysis_id,
        task_id=self.request.id,
    ))
    
    elapsed = time.perf_counter() - started_at
    logger.info(
        f"GraphRAG analysis pipeline completed for analysis_id={analysis_id} "
        f"in {elapsed:.2f}s with status={result.get('status')}"
    )
    
    return result


async def _run_graphrag_pipeline_async(
    analysis_id: str,
    task_id: str,
) -> dict[str, Any]:
    """Async implementation of the GraphRAG pipeline."""
    
    analyses_repo = AnalysesRepo()
    
    # 1. Load analysis
    analysis = analyses_repo.get_by_id(analysis_id)
    if analysis is None:
        return {
            "analysis_id": analysis_id,
            "status": "FAILED",
            "error_code": "ANALYSIS_NOT_FOUND",
        }
    
    # Idempotence guard
    current_status = analysis.status
    current_task_id = (analysis.metadata or {}).get("pipeline", {}).get("task_id")
    
    if current_status == "COMPLETED":
        return {
            "analysis_id": analysis_id,
            "status": "ALREADY_COMPLETED",
            "message": "Analysis already completed, skipping re-run",
        }
    
    if current_status == "RUNNING" and current_task_id and current_task_id != task_id:
        return {
            "analysis_id": analysis_id,
            "status": "ALREADY_RUNNING",
            "message": f"Analysis already running by task {current_task_id}",
            "running_task_id": current_task_id,
        }
    
    try:
        # Update status to RUNNING
        analyses_repo.update_status(
            analysis_id=analysis_id,
            status="RUNNING",
            stage="RUNNING",
            progress=10,
            metadata_updates={
                "pipeline": {
                    "task_id": task_id,
                    "started": True,
                    "orchestrator": "graphrag",
                }
            },
        )
        
        # 2. Parse diff
        logger.info(f"Parsing diff for analysis {analysis_id}")
        parsed_diff = parse_unified_diff(analysis.diff_raw)
        files_count, additions_total, deletions_total = analyses_repo.replace_parsed_diff(
            analysis_id, parsed_diff
        )
        
        analyses_repo.update_status(
            analysis_id=analysis_id,
            stage="DIFF_PARSED",
            progress=20,
        )
        
        # 3. Secret scan & redaction
        logger.info(f"Running secret scan for analysis {analysis_id}")
        scan_result = None
        diff_redacted = analysis.diff_raw
        has_secrets = False
        
        if settings.SECRET_SCAN_ENABLED:
            try:
                scan_result = scan_parsed_diff_for_secrets(
                    parsed_diff,
                    min_token_len=settings.SECRET_SCAN_MIN_TOKEN_LEN,
                    entropy_threshold=settings.SECRET_SCAN_ENTROPY_THRESHOLD,
                    max_findings=settings.SECRET_SCAN_MAX_FINDINGS,
                )
                redaction_result = redact_unified_diff_added_lines(
                    analysis.diff_raw,
                    min_token_len=settings.SECRET_SCAN_MIN_TOKEN_LEN,
                    entropy_threshold=settings.SECRET_SCAN_ENTROPY_THRESHOLD,
                )
                
                diff_redacted = redaction_result.diff_redacted
                has_secrets = scan_result.has_secrets or redaction_result.has_secrets
                
                # Store secret findings
                for detection in scan_result.detections:
                    analyses_repo.create_finding({
                        "analysis_id": analysis_id,
                        "source": "secret_scan",
                        "file_path": detection.file_path,
                        "line_start": detection.line_no,
                        "line_end": detection.line_no,
                        "severity": detection.match.severity,
                        "category": "security",
                        "message": detection.match.description,
                        "confidence": detection.match.confidence,
                    })
            except Exception as e:
                logger.error(f"Secret scan failed for analysis {analysis_id}: {e}")
        
        analyses_repo.update_status(
            analysis_id=analysis_id,
            stage="SECRET_SCAN_COMPLETE",
            progress=30,
        )
        
        # 4. Initialize services
        logger.info(f"Initializing GraphRAG services for analysis {analysis_id}")
        
        neo4j_client = Neo4jClient(
            uri=settings.NEO4J_URI,
            user=settings.NEO4J_USER,
            password=settings.NEO4J_PASSWORD,
            database=settings.NEO4J_DATABASE,
        )
        
        graph_manager = GraphManager(neo4j_client)
        history_service = AnalysisHistoryService(graph_manager)
        
        if not analysis.project_id:
            raise ValueError(f"Analysis {analysis_id} is missing project_id; GraphRAG requires a canonical project")

        resolved_scope = await asyncio.to_thread(
            resolve_repository_scope,
            str(analysis.project_id),
            metadata=analysis.metadata,
        )
        if resolved_scope is None:
            raise ValueError(f"Unable to resolve project profile for analysis {analysis_id}")
        if not resolved_scope.organization_id:
            raise ValueError(
                f"Unable to resolve organization_id for project {resolved_scope.project_id} ({resolved_scope.repo_id})"
            )
        if not resolved_scope.repo_path:
            raise ValueError(
                f"Unable to resolve repo_path for project {resolved_scope.project_id} ({resolved_scope.repo_id})"
            )

        repository_id = UUID(resolved_scope.repository_id)
        project_id = UUID(resolved_scope.project_id)
        organization_id = UUID(resolved_scope.organization_id)
        
        # 5. Start analysis run in history
        logger.info(f"Starting analysis run in history for analysis {analysis_id}")
        
        run_id = await history_service.start_analysis_run(
            repository_id=repository_id,
            project_id=project_id,
            organization_id=organization_id,
            git_commit_sha=analysis.metadata.get("commit_sha") if analysis.metadata else None,
            git_branch=analysis.metadata.get("branch") if analysis.metadata else None,
        )
        
        analyses_repo.update_status(
            analysis_id=analysis_id,
            stage="HISTORY_STARTED",
            progress=40,
            metadata_updates={"run_id": str(run_id)},
        )
        
        # 6. Run orchestrator
        logger.info(f"Running analysis orchestrator for analysis {analysis_id}")
        
        orchestrator = AnalysisOrchestrator(
            graph_manager=graph_manager,
            # Other dependencies will be injected in orchestrator.run()
        )
        
        orchestration_result = await orchestrator.run(
            repository_path=resolved_scope.repo_path,
            repository_id=str(repository_id),
            organization_id=str(organization_id),
            project_id=str(project_id),
            diff_content=diff_redacted,
            analysis_id=analysis_id,
            incremental=settings.INCREMENTAL_INDEXING_ENABLED,
        )
        
        analyses_repo.update_status(
            analysis_id=analysis_id,
            stage="ORCHESTRATION_COMPLETE",
            progress=90,
        )
        
        # 7. Calculate metrics
        metrics = AnalysisMetrics(
            total_findings=orchestration_result.get("total_findings", 0),
            critical_findings=orchestration_result.get("critical_findings", 0),
            high_findings=orchestration_result.get("high_findings", 0),
            medium_findings=orchestration_result.get("medium_findings", 0),
            low_findings=orchestration_result.get("low_findings", 0),
            files_analyzed=files_count,
            lines_of_code=additions_total + deletions_total,
        )
        
        # 8. Complete analysis run
        await history_service.complete_analysis_run(
            run_id=run_id,
            metrics=metrics,
            status=AnalysisStatus.COMPLETED,
        )
        
        # 9. Compare with previous run
        logger.info(f"Comparing with previous run for analysis {analysis_id}")
        comparison = await history_service.compare_with_previous(run_id)
        
        metrics.new_findings = comparison.total_new
        metrics.fixed_findings = comparison.total_fixed
        metrics.persistent_findings = comparison.total_persistent
        
        # 10. Update analysis to COMPLETED
        analyses_repo.update_status(
            analysis_id=analysis_id,
            status="COMPLETED",
            stage="COMPLETED",
            progress=100,
            metadata_updates={
                "pipeline": {
                    "task_id": task_id,
                    "completed": True,
                    "orchestrator": "graphrag",
                },
                "run_id": str(run_id),
                "comparison": {
                    "new_findings": comparison.total_new,
                    "fixed_findings": comparison.total_fixed,
                    "persistent_findings": comparison.total_persistent,
                },
            },
        )
        
        await neo4j_client.close()
        
        return {
            "analysis_id": analysis_id,
            "status": "COMPLETED",
            "run_id": str(run_id),
            "metrics": {
                "total_findings": metrics.total_findings,
                "critical_findings": metrics.critical_findings,
                "high_findings": metrics.high_findings,
                "medium_findings": metrics.medium_findings,
                "low_findings": metrics.low_findings,
                "new_findings": metrics.new_findings,
                "fixed_findings": metrics.fixed_findings,
                "persistent_findings": metrics.persistent_findings,
                "files_analyzed": metrics.files_analyzed,
                "lines_of_code": metrics.lines_of_code,
            },
        }
    
    except Exception as e:
        logger.error(f"GraphRAG analysis pipeline failed for analysis {analysis_id}: {e}", exc_info=True)
        
        # Update to FAILED
        analyses_repo.update_status(
            analysis_id=analysis_id,
            status="FAILED",
            stage="FAILED",
            metadata_updates={
                "pipeline": {
                    "task_id": task_id,
                    "failed": True,
                    "error": str(e),
                    "orchestrator": "graphrag",
                }
            },
        )
        
        return {
            "analysis_id": analysis_id,
            "status": "FAILED",
            "error": str(e),
        }
