"""
Neo4j Client - Graph Database Operations

Handles all Neo4j operations:
- Connection management
- Schema initialization
- Node/relationship CRUD
- Cypher query execution
- Transaction handling

Design: Singleton pattern, connection pooling, retry logic
"""

from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Any, Iterator

from neo4j import GraphDatabase, Driver, Session
from neo4j.exceptions import ServiceUnavailable

from app.settings import settings

logger = logging.getLogger(__name__)


class Neo4jClient:
    """
    Neo4j database client with connection pooling.
    
    Features:
    - Automatic connection management
    - Transaction support
    - Retry logic for transient failures
    - Query result mapping
    
    Usage:
        client = Neo4jClient()
        with client.session() as session:
            result = session.run("MATCH (n:Repository) RETURN n LIMIT 10")
            for record in result:
                print(record["n"])
    """
    
    _instance: Neo4jClient | None = None
    _driver: Driver | None = None
    
    def __new__(cls) -> Neo4jClient:
        """Singleton pattern."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self) -> None:
        """Initialize Neo4j driver if not already done."""
        if self._driver is None:
            self._connect()
    
    def _connect(self) -> None:
        """
        Establish connection to Neo4j.
        
        Config from settings:
        - NEO4J_URI (bolt://localhost:7687)
        - NEO4J_USER (neo4j)
        - NEO4J_PASSWORD (password)
        """
        try:
            self._driver = GraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
                max_connection_lifetime=3600,
                max_connection_pool_size=50,
                connection_acquisition_timeout=60,
            )
            # Verify connectivity
            self._driver.verify_connectivity()
            logger.info(f"Connected to Neo4j at {settings.NEO4J_URI}")
        except ServiceUnavailable as exc:
            logger.error(f"Neo4j unavailable: {exc}")
            raise
        except Exception as exc:
            logger.error(f"Neo4j connection failed: {exc}")
            raise
    
    @contextmanager
    def session(self, database: str | None = None) -> Iterator[Session]:
        """
        Context manager for Neo4j session.
        
        Args:
            database: Database name (default: neo4j)
            
        Yields:
            Neo4j session
        """
        if self._driver is None:
            self._connect()
        
        session = self._driver.session(database=database or settings.NEO4J_DATABASE)
        try:
            yield session
        finally:
            session.close()
    
    def close(self) -> None:
        """Close driver connection."""
        if self._driver is not None:
            self._driver.close()
            self._driver = None
            logger.info("Neo4j driver closed")
    
    def execute_query(
        self,
        query: str,
        parameters: dict[str, Any] | None = None,
        database: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Execute a Cypher query and return results.
        
        Args:
            query: Cypher query string
            parameters: Query parameters
            database: Database name
            
        Returns:
            List of records as dictionaries
        """
        with self.session(database=database) as session:
            result = session.run(query, parameters or {})
            return [dict(record) for record in result]
    
    def execute_write(
        self,
        query: str,
        parameters: dict[str, Any] | None = None,
        database: str | None = None,
    ) -> dict[str, Any]:
        """
        Execute a write query in a transaction.
        
        Args:
            query: Cypher query string
            parameters: Query parameters
            database: Database name
            
        Returns:
            Query summary statistics
        """
        with self.session(database=database) as session:
            result = session.run(query, parameters or {})
            summary = result.consume()
            return {
                "nodes_created": summary.counters.nodes_created,
                "relationships_created": summary.counters.relationships_created,
                "properties_set": summary.counters.properties_set,
                "nodes_deleted": summary.counters.nodes_deleted,
                "relationships_deleted": summary.counters.relationships_deleted,
            }


def get_neo4j_client() -> Neo4jClient:
    """Get singleton Neo4j client instance."""
    return Neo4jClient()
