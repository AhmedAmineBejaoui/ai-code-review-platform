from __future__ import annotations

import logging
from collections import deque
from threading import Lock
from typing import Any

from sqlalchemy import text as sa_text

from analysis.langGraph.raggraph.neo4j_fallback import Neo4jFallback
from app.data.database import get_engine
from app.settings import settings

logger = logging.getLogger(__name__)


class RepositoryGraphManager:
    """Graph operations with SQL source-of-truth and optional Neo4j mirror."""

    def __init__(self, *, neo4j_client: Neo4jFallback | None = None) -> None:
        self._adjacency: dict[str, dict[str, set[str]]] = {}
        self._reverse_adjacency: dict[str, dict[str, set[str]]] = {}
        self._cache_lock = Lock()
        self._neo4j = neo4j_client or Neo4jFallback(
            enabled=settings.NEO4J_ENABLED,
            uri=settings.NEO4J_URI,
            user=settings.NEO4J_USER,
            password=settings.NEO4J_PASSWORD,
            database=settings.NEO4J_DATABASE,
        )

    def refresh_graph(
        self,
        *,
        repo_id: str,
        changed_files: list[str] | None = None,
        indexed_commit: str | None = None,
    ) -> int:
        edges = self._load_edges(repo_id=repo_id, changed_files=changed_files)
        adjacency: dict[str, set[str]] = {}
        reverse: dict[str, set[str]] = {}

        for edge in edges:
            source_path = str(edge.get("source_path") or "").strip()
            target_path = str(edge.get("target_path") or "").strip()
            edge_type = str(edge.get("edge_type") or "related")
            if not source_path or not target_path:
                continue
            adjacency.setdefault(source_path, set()).add(target_path)
            reverse.setdefault(target_path, set()).add(source_path)

            self._neo4j.upsert_edge(
                repo_id=repo_id,
                source_path=source_path,
                target_path=target_path,
                edge_type=edge_type,
                indexed_commit=indexed_commit,
            )

        with self._cache_lock:
            self._adjacency[repo_id] = adjacency
            self._reverse_adjacency[repo_id] = reverse

        logger.debug(
            "Repository graph refreshed",
            extra={
                "repo_id": repo_id,
                "edges": len(edges),
                "neo4j_available": self._neo4j.available,
            },
        )
        return len(edges)

    def neighbors(
        self,
        *,
        repo_id: str,
        path: str,
        depth: int = 2,
        limit: int = 32,
    ) -> list[str]:
        if not path.strip():
            return []

        with self._cache_lock:
            adjacency = self._adjacency.get(repo_id)
            reverse = self._reverse_adjacency.get(repo_id)

        if adjacency is None or reverse is None:
            self.refresh_graph(repo_id=repo_id)
            with self._cache_lock:
                adjacency = self._adjacency.get(repo_id, {})
                reverse = self._reverse_adjacency.get(repo_id, {})

        visited: set[str] = {path}
        queue: deque[tuple[str, int]] = deque([(path, 0)])
        output: list[str] = []
        max_depth = max(int(depth), 1)
        max_items = max(int(limit), 1)

        while queue and len(output) < max_items:
            current, current_depth = queue.popleft()
            if current_depth >= max_depth:
                continue

            neighbors = adjacency.get(current, set()).union(reverse.get(current, set()))
            for candidate in neighbors:
                if candidate in visited:
                    continue
                visited.add(candidate)
                output.append(candidate)
                queue.append((candidate, current_depth + 1))
                if len(output) >= max_items:
                    break

        return output

    def _load_edges(self, *, repo_id: str, changed_files: list[str] | None = None) -> list[dict[str, Any]]:
        engine = get_engine()
        if engine is None:
            return []

        query = """
            SELECT source_path, target_path, edge_type
            FROM code_entity_edges
            WHERE repo_id = :repo_id
        """
        params: dict[str, Any] = {"repo_id": repo_id}
        if changed_files:
            query += " AND (source_path = ANY(:paths) OR target_path = ANY(:paths))"
            params["paths"] = changed_files

        with engine.connect() as conn:
            rows = conn.execute(sa_text(query), params).mappings().all()
        return [dict(item) for item in rows]


class ContextGraphManager:
    """Backward-compatible adapter."""

    def __init__(self, manager: RepositoryGraphManager | None = None) -> None:
        self.manager = manager or RepositoryGraphManager()

    def build_graph(self, repo_id: str, repo_path: str | None = None) -> int:
        _ = repo_path
        return self.manager.refresh_graph(repo_id=repo_id)

    def update_graph(self, repo_id: str, diff_files: list[str]) -> int:
        return self.manager.refresh_graph(repo_id=repo_id, changed_files=diff_files)

    def get_neighbors(self, repo_id: str, path: str, depth: int = 2) -> list[str]:
        return self.manager.neighbors(repo_id=repo_id, path=path, depth=depth)
