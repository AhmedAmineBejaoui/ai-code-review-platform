"""
Authentication middleware for the API Gateway.
Validates Clerk JWTs and extracts user information.
"""

import logging
from typing import Optional, Tuple

import httpx
from fastapi import Request
from jose import JWTError, jwt

from .config import get_settings

logger = logging.getLogger(__name__)

# Cache for JWKS
_jwks_cache: Optional[dict] = None
_jwks_cache_time: float = 0


async def fetch_jwks() -> dict:
    """Fetch JWKS from Clerk."""
    global _jwks_cache, _jwks_cache_time
    import time
    
    settings = get_settings()
    
    # Return cached JWKS if still valid (cache for 5 minutes)
    if _jwks_cache and (time.time() - _jwks_cache_time) < 300:
        return _jwks_cache
    
    if not settings.CLERK_JWKS_URL:
        raise ValueError("CLERK_JWKS_URL not configured")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(settings.CLERK_JWKS_URL)
        response.raise_for_status()
        _jwks_cache = response.json()
        _jwks_cache_time = time.time()
        return _jwks_cache


def get_signing_key(jwks: dict, token: str) -> Optional[str]:
    """Extract the signing key from JWKS based on the token's kid."""
    try:
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                return key
        return None
    except JWTError:
        return None


async def validate_token(token: str) -> Tuple[bool, Optional[str], Optional[dict]]:
    """
    Validate a Clerk JWT token.
    
    Returns:
        Tuple of (is_valid, user_id, claims)
    """
    settings = get_settings()
    
    if not settings.CLERK_AUTH_ENABLED:
        # Auth disabled - allow all requests
        return True, None, None
    
    try:
        jwks = await fetch_jwks()
        signing_key = get_signing_key(jwks, token)
        
        if not signing_key:
            logger.warning("No matching signing key found in JWKS")
            return False, None, None
        
        # Decode and validate the token
        claims = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            issuer=settings.CLERK_ISSUER_URL,
            options={
                "verify_aud": False,  # Clerk doesn't always set aud
            }
        )
        
        # Extract user ID from Clerk token
        user_id = claims.get("sub")
        
        return True, user_id, claims
        
    except JWTError as e:
        logger.warning("JWT validation failed: %s", str(e))
        return False, None, None
    except Exception as e:
        logger.exception("Error validating token: %s", str(e))
        return False, None, None


def extract_token(request: Request) -> Optional[str]:
    """Extract the Bearer token from the request."""
    auth_header = request.headers.get("Authorization")
    
    if not auth_header:
        return None
    
    parts = auth_header.split()
    
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    
    return parts[1]


async def authenticate_request(request: Request) -> Tuple[bool, Optional[str], Optional[dict]]:
    """
    Authenticate an incoming request.
    
    Returns:
        Tuple of (is_authenticated, user_id, claims)
    """
    settings = get_settings()
    
    if not settings.CLERK_AUTH_ENABLED:
        return True, None, None
    
    token = extract_token(request)
    
    if not token:
        return False, None, None
    
    return await validate_token(token)
