"""
Rate limiting middleware for the API Gateway.
Uses Redis for distributed rate limiting across gateway instances.
"""

import logging
import time
from typing import Optional, Tuple

from fastapi import Request

from .config import get_settings

logger = logging.getLogger(__name__)

# Simple in-memory fallback when Redis is unavailable
_memory_store: dict[str, Tuple[int, float]] = {}


class RateLimiter:
    """
    Token bucket rate limiter with Redis backend.
    Falls back to in-memory store if Redis is unavailable.
    """
    
    def __init__(self):
        self.settings = get_settings()
        self._redis = None
    
    async def get_redis(self):
        """Get Redis connection (lazy initialization)."""
        if self._redis is None:
            try:
                import redis.asyncio as redis
                self._redis = redis.from_url(
                    self.settings.REDIS_URL,
                    encoding="utf-8",
                    decode_responses=True,
                )
                # Test connection
                await self._redis.ping()
            except Exception as e:
                logger.warning("Redis not available for rate limiting: %s", str(e))
                self._redis = "unavailable"
        
        if self._redis == "unavailable":
            return None
        return self._redis
    
    def _get_client_key(self, request: Request, user_id: Optional[str] = None) -> str:
        """Generate a unique key for rate limiting."""
        if user_id:
            return f"ratelimit:user:{user_id}"
        
        # Fall back to IP-based limiting
        client_ip = request.client.host if request.client else "unknown"
        return f"ratelimit:ip:{client_ip}"
    
    async def check_rate_limit(
        self,
        request: Request,
        user_id: Optional[str] = None,
        limit_override: Optional[int] = None,
    ) -> Tuple[bool, int, int]:
        """
        Check if the request is within rate limits.
        
        Args:
            request: The incoming request
            user_id: Optional authenticated user ID
            limit_override: Custom limit for this endpoint
        
        Returns:
            Tuple of (allowed, remaining, reset_time)
        """
        if not self.settings.RATE_LIMIT_ENABLED:
            return True, -1, 0
        
        limit = limit_override or self.settings.RATE_LIMIT_REQUESTS_PER_MINUTE
        window = 60  # 1 minute window
        key = self._get_client_key(request, user_id)
        
        redis = await self.get_redis()
        
        if redis:
            return await self._check_redis(redis, key, limit, window)
        else:
            return self._check_memory(key, limit, window)
    
    async def _check_redis(
        self,
        redis,
        key: str,
        limit: int,
        window: int,
    ) -> Tuple[bool, int, int]:
        """Check rate limit using Redis."""
        try:
            now = time.time()
            window_start = now - window
            
            # Use a sorted set for sliding window rate limiting
            pipe = redis.pipeline()
            
            # Remove old entries
            pipe.zremrangebyscore(key, 0, window_start)
            
            # Add current request
            pipe.zadd(key, {str(now): now})
            
            # Count requests in window
            pipe.zcard(key)
            
            # Set expiry
            pipe.expire(key, window * 2)
            
            results = await pipe.execute()
            current_count = results[2]
            
            remaining = max(0, limit - current_count)
            reset_time = int(now + window)
            
            if current_count > limit:
                return False, 0, reset_time
            
            return True, remaining, reset_time
            
        except Exception as e:
            logger.error("Redis rate limit error: %s", str(e))
            # Allow request on Redis error
            return True, -1, 0
    
    def _check_memory(
        self,
        key: str,
        limit: int,
        window: int,
    ) -> Tuple[bool, int, int]:
        """Check rate limit using in-memory store (fallback)."""
        now = time.time()
        
        if key in _memory_store:
            count, window_start = _memory_store[key]
            
            # Check if window has expired
            if now - window_start > window:
                # Reset window
                _memory_store[key] = (1, now)
                return True, limit - 1, int(now + window)
            
            # Check limit
            if count >= limit:
                return False, 0, int(window_start + window)
            
            # Increment counter
            _memory_store[key] = (count + 1, window_start)
            return True, limit - count - 1, int(window_start + window)
        
        # First request
        _memory_store[key] = (1, now)
        return True, limit - 1, int(now + window)


# Global rate limiter instance
rate_limiter = RateLimiter()
