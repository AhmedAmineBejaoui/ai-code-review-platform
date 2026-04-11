from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from analysis.langGraph.models import GraphIndexSnapshot
from app.core.knowledge_base.ingestor import RepoContextIngestor, RepoIndexResult
from app.integrations.vector_store.qdrant_client import QdrantClient


logger = logging.getLogger(__name__)


class RepositoryIngestionService:
    """Repository onboarding and incremental index updates for GraphRAG."""

    def __init__(
        self,
        *,
        vector_store: QdrantClient | None = None,
        ingestor: RepoContextIngestor | None = None,
        graph_manager: RepositoryGraphManager | None = None,
    ) -> None:
        self._vector_store = vector_store
        self._ingestor = ingestor
        if graph_manager is None:
            from analysis.langGraph.context.graph_manager import RepositoryGraphManager

            graph_manager = RepositoryGraphManager()
        self._graph_manager = graph_manager

    async def ensure_index(
        self,
        *,
        repo_id: str,
        repo_path: str,
        base_ref: str | None = None,
        head_ref: str = "HEAD",
        force_full: bool = False,
    ) -> GraphIndexSnapshot:
        ingestor = self._get_ingestor()
        try:
            profile = await ingestor.get_repo_profile(repo_id)
        except Exception:
            profile = None

        try:
            if force_full or profile is None:
                result = await ingestor.onboard_repo(
                    repo_id=repo_id,
                    repo_path=repo_path,
                    source="langgraph_pipeline",
                    force_full=True,
                )
            else:
                result = await ingestor.update_repo_incremental(
                    repo_id=repo_id,
                    repo_path=repo_path,
                    base_ref=base_ref,
                    head_ref=head_ref,
                    source="langgraph_pipeline",
                )
        except Exception as exc:
            logger.exception("Repository index update failed")
            return GraphIndexSnapshot(
                status="failed",
                mode="unknown",
                indexed_commit=None,
                default_branch=None,
                files_seen=0,
                files_indexed=0,
                chunks_upserted=0,
                chunks_deleted=0,
                changed_files=[],
                started_at=None,
                completed_at=None,
                error=str(exc),
                graph_edges_count=0,
            )

        graph_edges_count = self._graph_manager.refresh_graph(
            repo_id=repo_id,
            changed_files=result.changed_files if result.mode == "incremental" else None,
            indexed_commit=result.indexed_commit,
        )
        return _to_snapshot(result=result, graph_edges_count=graph_edges_count)

    def neighbors(
        self,
        *,
        repo_id: str,
        path: str,
        depth: int = 2,
        limit: int = 32,
    ) -> list[str]:
        return self._graph_manager.neighbors(
            repo_id=repo_id,
            path=path,
            depth=depth,
            limit=limit,
        )

    def _get_ingestor(self) -> RepoContextIngestor:
        if self._ingestor is not None:
            return self._ingestor
        if self._vector_store is None:
            self._vector_store = QdrantClient()
        self._ingestor = RepoContextIngestor(vector_store=self._vector_store)
        return self._ingestor


def _to_snapshot(*, result: RepoIndexResult, graph_edges_count: int) -> GraphIndexSnapshot:
    mode = result.mode if result.mode in {"full", "incremental"} else "unknown"
    return GraphIndexSnapshot(
        status="completed",
        mode=mode,  # type: ignore[arg-type]
        indexed_commit=result.indexed_commit,
        default_branch=result.default_branch,
        files_seen=result.files_seen,
        files_indexed=result.files_indexed,
        chunks_upserted=result.chunks_upserted,
        chunks_deleted=result.chunks_deleted,
        changed_files=list(result.changed_files),
        started_at=result.started_at,
        completed_at=result.completed_at,
        error=None,
        graph_edges_count=graph_edges_count,
    )
