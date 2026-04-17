"""
RAG Query routes for AI Service.

Handles:
- RAG queries across agents
- Code-focused queries
- Documentation queries
- Diff analysis
"""

from __future__ import annotations

import logging
import time
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..config import get_settings

router = APIRouter(prefix="/api/v1/rag", tags=["rag"])
logger = logging.getLogger(__name__)


# ─── Request Models ───────────────────────────────────────────────────────────

class RAGQueryRequest(BaseModel):
    query: str = Field(..., description="The query to process")
    repo_id: str = Field(..., description="Repository identifier")
    org_id: str | None = Field(None, description="Organization ID")
    agents: list[str] | None = Field(
        None,
        description="Specific agents to use (code_context, documentation, policy_rules)",
    )
    max_chunks: int = Field(10, ge=1, le=50, description="Maximum chunks per agent")
    min_relevance: float = Field(0.5, ge=0.0, le=1.0, description="Minimum relevance score")
    include_citations: bool = Field(True, description="Include source citations")


class DiffAnalysisRequest(BaseModel):
    repo_id: str = Field(..., description="Repository identifier")
    diff_text: str = Field(..., description="Unified diff text")
    changed_files: list[str] = Field(..., description="List of changed file paths")
    org_id: str | None = Field(None, description="Organization ID")
    analysis_id: str | None = Field(None, description="Analysis ID for tracking")
    commit_sha: str | None = Field(None, description="Commit SHA")
    pr_number: int | None = Field(None, description="PR number")


# ─── Response Models ──────────────────────────────────────────────────────────

class AgentResultResponse(BaseModel):
    agent_type: str
    status: str
    content: str | None
    findings: list[dict[str, Any]]
    citations: list[dict[str, Any]]
    duration_ms: int
    chunks_retrieved: int
    chunks_used: int
    confidence: float
    relevance_score: float


class RAGQueryResponse(BaseModel):
    success: bool
    synthesis: AgentResultResponse | None
    agents: dict[str, AgentResultResponse]
    total_duration_ms: int
    agents_executed: int
    agents_skipped: int
    error: str | None = None


class AgentStatusResponse(BaseModel):
    enabled: bool
    agents: dict[str, dict[str, Any]]


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/query", response_model=RAGQueryResponse)
async def execute_rag_query(request: RAGQueryRequest) -> RAGQueryResponse:
    """
    Execute a RAG query across agents.

    Uses the specified agents (or all if none specified) to retrieve
    context and generate a response.
    """
    start_time = time.perf_counter()
    settings = get_settings()
    
    logger.info(f"RAG query for {request.repo_id}: {request.query[:100]}...")
    
    if not settings.RAG_AGENTS_ENABLED:
        return RAGQueryResponse(
            success=False,
            synthesis=None,
            agents={},
            total_duration_ms=0,
            agents_executed=0,
            agents_skipped=0,
            error="RAG agents are not enabled",
        )
    
    # Determine which agents to use
    agents_to_use = request.agents or ["code_context", "documentation", "policy_rules"]
    agents_results: dict[str, AgentResultResponse] = {}
    agents_executed = 0
    agents_skipped = 0
    
    for agent_type in agents_to_use:
        # Check if agent is enabled
        agent_enabled = {
            "code_context": settings.RAG_AGENT_CODE_CONTEXT_ENABLED,
            "documentation": settings.RAG_AGENT_DOCUMENTATION_ENABLED,
            "policy_rules": settings.RAG_AGENT_POLICY_RULES_ENABLED,
        }.get(agent_type, False)
        
        if not agent_enabled:
            agents_skipped += 1
            continue
        
        agent_start = time.perf_counter()
        
        # In full implementation, this would execute the actual agent
        # For now, return a mock response
        agents_results[agent_type] = AgentResultResponse(
            agent_type=agent_type,
            status="success",
            content=None,
            findings=[],
            citations=[],
            duration_ms=int((time.perf_counter() - agent_start) * 1000),
            chunks_retrieved=0,
            chunks_used=0,
            confidence=0.0,
            relevance_score=0.0,
        )
        agents_executed += 1
    
    # Synthesis
    synthesis = None
    if settings.RAG_AGENT_SYNTHESIS_ENABLED and agents_executed > 0:
        synthesis = AgentResultResponse(
            agent_type="synthesis",
            status="success",
            content="Synthesis would aggregate results from all agents.",
            findings=[],
            citations=[],
            duration_ms=0,
            chunks_retrieved=0,
            chunks_used=0,
            confidence=0.0,
            relevance_score=0.0,
        )
    
    total_duration_ms = int((time.perf_counter() - start_time) * 1000)
    
    return RAGQueryResponse(
        success=True,
        synthesis=synthesis,
        agents=agents_results,
        total_duration_ms=total_duration_ms,
        agents_executed=agents_executed,
        agents_skipped=agents_skipped,
        error=None,
    )


@router.post("/query/code", response_model=RAGQueryResponse)
async def execute_code_query(request: RAGQueryRequest) -> RAGQueryResponse:
    """
    Execute a code-focused RAG query.

    Uses only the code context agent for code-specific queries.
    """
    # Force only code agent
    request.agents = ["code_context"]
    return await execute_rag_query(request)


@router.post("/query/documentation", response_model=RAGQueryResponse)
async def execute_documentation_query(request: RAGQueryRequest) -> RAGQueryResponse:
    """
    Execute a documentation-focused RAG query.

    Uses only the documentation agent for doc-specific queries.
    """
    request.agents = ["documentation"]
    return await execute_rag_query(request)


@router.post("/analyze/diff", response_model=RAGQueryResponse)
async def analyze_diff(request: DiffAnalysisRequest) -> RAGQueryResponse:
    """
    Analyze a diff with the full RAG pipeline.

    Uses all agents to provide comprehensive review context.
    """
    start_time = time.perf_counter()
    settings = get_settings()
    
    logger.info(f"Diff analysis for {request.repo_id}")
    
    if not settings.RAG_AGENTS_ENABLED:
        return RAGQueryResponse(
            success=False,
            synthesis=None,
            agents={},
            total_duration_ms=0,
            agents_executed=0,
            agents_skipped=0,
            error="RAG agents are not enabled",
        )
    
    # In full implementation, this would execute the diff analysis
    total_duration_ms = int((time.perf_counter() - start_time) * 1000)
    
    return RAGQueryResponse(
        success=True,
        synthesis=None,
        agents={},
        total_duration_ms=total_duration_ms,
        agents_executed=0,
        agents_skipped=0,
        error=None,
    )


@router.get("/agents/status", response_model=AgentStatusResponse)
async def get_agents_status() -> AgentStatusResponse:
    """
    Get the status of all RAG agents.

    Returns which agents are enabled and their configuration.
    """
    settings = get_settings()

    agents_status = {
        "code_context": {
            "enabled": settings.RAG_AGENT_CODE_CONTEXT_ENABLED,
            "collection": settings.QDRANT_REPO_CONTEXT_COLLECTION,
        },
        "documentation": {
            "enabled": settings.RAG_AGENT_DOCUMENTATION_ENABLED,
            "collection": settings.QDRANT_COLLECTION_KB_DOCUMENTS,
        },
        "policy_rules": {
            "enabled": settings.RAG_AGENT_POLICY_RULES_ENABLED,
            "collection": settings.QDRANT_COLLECTION_ORG_RULES,
        },
        "synthesis": {
            "enabled": settings.RAG_AGENT_SYNTHESIS_ENABLED,
            "collection": None,
        },
    }

    return AgentStatusResponse(
        enabled=settings.RAG_AGENTS_ENABLED,
        agents=agents_status,
    )
