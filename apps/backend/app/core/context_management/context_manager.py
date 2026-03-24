"""Context Manager for hierarchical project context.

Manages the three-level context hierarchy:
1. Global Context (Organization)
2. Project Context (Repository)
3. Local Context (Commit/PR)
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from app.settings import settings

if TYPE_CHECKING:
    from app.integrations.vector_store.qdrant_client import QdrantClient

logger = logging.getLogger(__name__)


@dataclass
class ProjectContext:
    """Represents the current context for a project."""

    repo_id: str
    org_id: str | None = None
    context_version: int = 1

    # Context levels
    global_context: dict[str, Any] = field(default_factory=dict)
    project_context: dict[str, Any] = field(default_factory=dict)
    local_context: dict[str, Any] = field(default_factory=dict)

    # Metadata
    last_updated: datetime | None = None
    is_stale: bool = False
    staleness_reason: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "repo_id": self.repo_id,
            "org_id": self.org_id,
            "context_version": self.context_version,
            "global_context": self.global_context,
            "project_context": self.project_context,
            "local_context": self.local_context,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None,
            "is_stale": self.is_stale,
            "staleness_reason": self.staleness_reason,
        }


class ContextManager:
    """Manages hierarchical project context.

    This manager:
    1. Retrieves and caches project context from Qdrant
    2. Manages context lifecycle (load, update, invalidate)
    3. Provides context for RAG agents
    4. Handles incremental context updates
    """

    def __init__(
        self,
        *,
        qdrant_client: QdrantClient | None = None,
        redis_client: object | None = None,  # For caching
    ):
        self.qdrant_client = qdrant_client
        self.redis_client = redis_client
        self._cache: dict[str, ProjectContext] = {}
        self._cache_ttl = settings.ANTI_HALLUCINATION_MAX_CONTEXT_AGE_HOURS * 3600

    async def get_context(
        self,
        repo_id: str,
        *,
        org_id: str | None = None,
        force_refresh: bool = False,
    ) -> ProjectContext:
        """Get the context for a repository.

        Args:
            repo_id: Repository identifier
            org_id: Optional organization ID
            force_refresh: Force refresh from storage

        Returns:
            ProjectContext with all context levels
        """
        cache_key = f"{org_id or 'default'}:{repo_id}"

        # Check memory cache
        if not force_refresh and cache_key in self._cache:
            cached = self._cache[cache_key]
            if not cached.is_stale:
                return cached

        # Check Redis cache
        if self.redis_client and not force_refresh:
            cached = await self._get_from_redis(cache_key)
            if cached:
                self._cache[cache_key] = cached
                return cached

        # Load from storage
        context = await self._load_context(repo_id, org_id)

        # Cache it
        self._cache[cache_key] = context
        if self.redis_client:
            await self._set_in_redis(cache_key, context)

        return context

    async def _load_context(
        self,
        repo_id: str,
        org_id: str | None,
    ) -> ProjectContext:
        """Load context from Qdrant and database."""
        context = ProjectContext(
            repo_id=repo_id,
            org_id=org_id,
            last_updated=datetime.now(timezone.utc),
        )

        try:
            # Load project profile from Qdrant
            project_profile = await self._load_project_profile(repo_id)
            if project_profile:
                context.project_context = project_profile
                context.context_version = project_profile.get("context_version", 1)

            # Load organization rules (global context)
            if org_id:
                org_rules = await self._load_org_rules(org_id)
                context.global_context = org_rules

            logger.debug(f"Loaded context for {repo_id}, version {context.context_version}")

        except Exception as e:
            logger.error(f"Failed to load context for {repo_id}: {e}")
            context.is_stale = True
            context.staleness_reason = str(e)

        return context

    async def _load_project_profile(self, repo_id: str) -> dict[str, Any]:
        """Load project profile from Qdrant."""
        if not self.qdrant_client or not self.qdrant_client.enabled:
            return {}

        try:
            # Search for project profile by repo_id
            results = await self.qdrant_client.scroll(
                collection_name=settings.QDRANT_COLLECTION_PROJECT_PROFILES,
                filter_payload={"repo_id": repo_id},
                limit=1,
            )

            if results:
                return results[0].payload

        except Exception as e:
            logger.warning(f"Failed to load project profile: {e}")

        return {}

    async def _load_org_rules(self, org_id: str) -> dict[str, Any]:
        """Load organization rules from Qdrant."""
        if not self.qdrant_client or not self.qdrant_client.enabled:
            return {}

        try:
            results = await self.qdrant_client.scroll(
                collection_name=settings.QDRANT_COLLECTION_ORG_RULES,
                filter_payload={"org_id": org_id, "is_active": True},
                limit=100,
            )

            rules = []
            for hit in results:
                rules.append(hit.payload)

            return {
                "rules": rules,
                "rules_count": len(rules),
            }

        except Exception as e:
            logger.warning(f"Failed to load org rules: {e}")

        return {}

    async def update_local_context(
        self,
        repo_id: str,
        local_context: dict[str, Any],
        *,
        org_id: str | None = None,
    ) -> ProjectContext:
        """Update the local context for an analysis.

        Args:
            repo_id: Repository identifier
            local_context: Local context (diff, changed files, etc.)
            org_id: Optional organization ID

        Returns:
            Updated ProjectContext
        """
        context = await self.get_context(repo_id, org_id=org_id)
        context.local_context = local_context
        context.last_updated = datetime.now(timezone.utc)

        # Update cache
        cache_key = f"{org_id or 'default'}:{repo_id}"
        self._cache[cache_key] = context

        return context

    async def invalidate_context(
        self,
        repo_id: str,
        *,
        org_id: str | None = None,
        reason: str = "manual invalidation",
    ) -> None:
        """Invalidate cached context for a repository.

        Args:
            repo_id: Repository identifier
            org_id: Optional organization ID
            reason: Reason for invalidation
        """
        cache_key = f"{org_id or 'default'}:{repo_id}"

        # Mark as stale in memory cache
        if cache_key in self._cache:
            self._cache[cache_key].is_stale = True
            self._cache[cache_key].staleness_reason = reason

        # Remove from Redis
        if self.redis_client:
            await self._delete_from_redis(cache_key)

        logger.info(f"Invalidated context for {repo_id}: {reason}")

    async def increment_version(
        self,
        repo_id: str,
        *,
        org_id: str | None = None,
    ) -> int:
        """Increment the context version for a repository.

        Returns:
            New version number
        """
        context = await self.get_context(repo_id, org_id=org_id)
        new_version = context.context_version + 1
        context.context_version = new_version
        context.last_updated = datetime.now(timezone.utc)

        # Update cache
        cache_key = f"{org_id or 'default'}:{repo_id}"
        self._cache[cache_key] = context

        return new_version

    async def _get_from_redis(self, cache_key: str) -> ProjectContext | None:
        """Get context from Redis cache."""
        if not self.redis_client:
            return None

        try:
            # This is a placeholder - actual implementation depends on Redis client
            # data = await self.redis_client.get(f"context:{cache_key}")
            # if data:
            #     return self._deserialize_context(data)
            pass
        except Exception as e:
            logger.warning(f"Redis get failed: {e}")

        return None

    async def _set_in_redis(self, cache_key: str, context: ProjectContext) -> None:
        """Set context in Redis cache."""
        if not self.redis_client:
            return

        try:
            # This is a placeholder - actual implementation depends on Redis client
            # data = self._serialize_context(context)
            # await self.redis_client.set(
            #     f"context:{cache_key}",
            #     data,
            #     ex=self._cache_ttl,
            # )
            pass
        except Exception as e:
            logger.warning(f"Redis set failed: {e}")

    async def _delete_from_redis(self, cache_key: str) -> None:
        """Delete context from Redis cache."""
        if not self.redis_client:
            return

        try:
            # This is a placeholder - actual implementation depends on Redis client
            # await self.redis_client.delete(f"context:{cache_key}")
            pass
        except Exception as e:
            logger.warning(f"Redis delete failed: {e}")

    def _serialize_context(self, context: ProjectContext) -> str:
        """Serialize context to JSON string."""
        return json.dumps(context.to_dict())

    def _deserialize_context(self, data: str) -> ProjectContext:
        """Deserialize context from JSON string."""
        d = json.loads(data)
        ctx = ProjectContext(
            repo_id=d["repo_id"],
            org_id=d.get("org_id"),
            context_version=d.get("context_version", 1),
            global_context=d.get("global_context", {}),
            project_context=d.get("project_context", {}),
            local_context=d.get("local_context", {}),
            is_stale=d.get("is_stale", False),
            staleness_reason=d.get("staleness_reason"),
        )
        if d.get("last_updated"):
            ctx.last_updated = datetime.fromisoformat(d["last_updated"])
        return ctx
