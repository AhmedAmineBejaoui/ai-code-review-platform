"""Redis-backed conversation memory for iterative code reviews.

Stores per-analysis conversation history so users can ask follow-up
questions about a review through the web dashboard.  Each session
expires after 24 hours.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from app.settings import settings

logger = logging.getLogger(__name__)


class ReviewSessionMemory:
    """Manages conversation history for a single analysis review session."""

    def __init__(self, analysis_id: str, *, ttl_seconds: int = 86400) -> None:
        self._session_key = f"review_memory:{analysis_id}"
        self._ttl = ttl_seconds
        self._redis: Any = None

    @property
    def available(self) -> bool:
        return self._get_redis() is not None

    def add_user_message(self, content: str) -> None:
        self._append_message(role="user", content=content)

    def add_assistant_message(self, content: str) -> None:
        self._append_message(role="assistant", content=content)

    def get_history(self, *, max_messages: int = 20) -> list[dict[str, str]]:
        """Return the conversation history as a list of ``{role, content}`` dicts."""
        r = self._get_redis()
        if r is None:
            return []
        try:
            raw = r.lrange(self._session_key, -max_messages, -1)
            return [json.loads(item) for item in raw]
        except Exception:
            return []

    def clear(self) -> None:
        r = self._get_redis()
        if r is None:
            return
        try:
            r.delete(self._session_key)
        except Exception:
            pass

    def _append_message(self, *, role: str, content: str) -> None:
        r = self._get_redis()
        if r is None:
            return
        try:
            r.rpush(self._session_key, json.dumps({"role": role, "content": content}))
            r.expire(self._session_key, self._ttl)
        except Exception:
            logger.debug("Failed to append review memory message", exc_info=True)

    def _get_redis(self) -> Any:
        if self._redis is not None:
            return self._redis
        url = settings.REDIS_URL
        if not url:
            return None
        try:
            import redis

            self._redis = redis.Redis.from_url(url, decode_responses=True, socket_timeout=2)
            return self._redis
        except Exception:
            return None


def build_review_memory(analysis_id: str) -> ReviewSessionMemory:
    """Factory for creating a review session memory instance."""
    return ReviewSessionMemory(analysis_id)
