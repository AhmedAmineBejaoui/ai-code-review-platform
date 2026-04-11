from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


class Neo4jFallback:
    """Best-effort Neo4j mirror with automatic degradation on failures."""

    def __init__(
        self,
        *,
        enabled: bool,
        uri: str,
        user: str,
        password: str,
        database: str = "neo4j",
    ) -> None:
        self._enabled = bool(enabled)
        self._uri = uri
        self._user = user
        self._password = password
        self._database = database
        self._driver: Any | None = None
        self._disabled_reason: str | None = None

    @property
    def available(self) -> bool:
        return self._enabled and self._disabled_reason is None

    def upsert_edge(
        self,
        *,
        repo_id: str,
        source_path: str,
        target_path: str,
        edge_type: str,
        indexed_commit: str | None = None,
    ) -> None:
        if not self.available:
            return
        query = """
            MERGE (s:CodeNode {repo_id: $repo_id, path: $source_path})
            MERGE (t:CodeNode {repo_id: $repo_id, path: $target_path})
            MERGE (s)-[r:RELATES {type: $edge_type}]->(t)
            SET r.indexed_commit = $indexed_commit
        """
        self.execute_write(
            query=query,
            params={
                "repo_id": repo_id,
                "source_path": source_path,
                "target_path": target_path,
                "edge_type": edge_type,
                "indexed_commit": indexed_commit,
            },
        )

    def execute_read(self, *, query: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        if not self.available:
            return []
        driver = self._get_driver()
        if driver is None:
            return []
        try:
            with driver.session(database=self._database) as session:
                result = session.run(query, params or {})
                return [dict(item) for item in result]
        except Exception as exc:
            self._degrade(reason=f"read_failed:{exc}")
            return []

    def execute_write(self, *, query: str, params: dict[str, Any] | None = None) -> None:
        if not self.available:
            return
        driver = self._get_driver()
        if driver is None:
            return
        try:
            with driver.session(database=self._database) as session:
                session.run(query, params or {})
        except Exception as exc:
            self._degrade(reason=f"write_failed:{exc}")

    def _get_driver(self) -> Any | None:
        if self._driver is not None:
            return self._driver
        try:
            from neo4j import GraphDatabase, basic_auth

            self._driver = GraphDatabase.driver(
                self._uri,
                auth=basic_auth(self._user, self._password),
            )
            return self._driver
        except Exception as exc:
            self._degrade(reason=f"init_failed:{exc}")
            return None

    def _degrade(self, *, reason: str) -> None:
        if self._disabled_reason is None:
            logger.warning("Neo4j fallback disabled: %s", reason)
        self._disabled_reason = reason

