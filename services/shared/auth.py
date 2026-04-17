"""
Shared authentication middleware for all microservices.
Validates JWT tokens from Clerk.
"""

import os
from typing import Optional
from functools import lru_cache

import httpx
import jwt
from fastapi import HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials


security = HTTPBearer(auto_error=False)


class AuthenticatedUser:
    """Represents an authenticated user from Clerk JWT."""
    
    def __init__(
        self,
        user_id: str,
        email: Optional[str] = None,
        org_id: Optional[str] = None,
        role: Optional[str] = None,
        permissions: Optional[list[str]] = None,
    ):
        self.user_id = user_id
        self.email = email
        self.org_id = org_id
        self.role = role or "developer"
        self.permissions = permissions or []
    
    def has_permission(self, permission: str) -> bool:
        """Check if user has a specific permission."""
        if self.role == "admin":
            return True
        return permission in self.permissions


@lru_cache(maxsize=1)
def get_clerk_jwks(issuer_url: str) -> dict:
    """Fetch Clerk JWKS for JWT verification."""
    jwks_url = f"{issuer_url}/.well-known/jwks.json"
    response = httpx.get(jwks_url, timeout=10)
    response.raise_for_status()
    return response.json()


def verify_clerk_token(token: str, issuer_url: str) -> dict:
    """Verify and decode a Clerk JWT token."""
    try:
        # Get JWKS
        jwks = get_clerk_jwks(issuer_url)
        
        # Get the key ID from token header
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        
        # Find the matching key
        rsa_key = None
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                rsa_key = jwt.algorithms.RSAAlgorithm.from_jwk(key)
                break
        
        if not rsa_key:
            raise HTTPException(status_code=401, detail="Invalid token key")
        
        # Verify and decode
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            options={"verify_aud": False},  # Clerk doesn't always set audience
        )
        
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> AuthenticatedUser:
    """
    Dependency to get current authenticated user.
    Can be used in route handlers.
    """
    # Check if auth is enabled
    clerk_enabled = os.getenv("CLERK_AUTH_ENABLED", "false").lower() == "true"
    
    if not clerk_enabled:
        # Return anonymous user for development
        return AuthenticatedUser(
            user_id="anonymous",
            email="dev@localhost",
            role="admin",
        )
    
    if not credentials:
        raise HTTPException(status_code=401, detail="Missing authentication credentials")
    
    issuer_url = os.getenv("CLERK_ISSUER_URL", "")
    if not issuer_url:
        raise HTTPException(status_code=500, detail="Clerk issuer URL not configured")
    
    # Verify token
    payload = verify_clerk_token(credentials.credentials, issuer_url)
    
    # Extract user info
    return AuthenticatedUser(
        user_id=payload.get("sub", ""),
        email=payload.get("email"),
        org_id=payload.get("org_id"),
        role=payload.get("role", "developer"),
        permissions=payload.get("permissions", []),
    )


async def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[AuthenticatedUser]:
    """
    Dependency to optionally get current user.
    Returns None if not authenticated.
    """
    try:
        return await get_current_user(request, credentials)
    except HTTPException:
        return None


def require_permission(permission: str):
    """Dependency factory to require a specific permission."""
    async def check_permission(user: AuthenticatedUser = Depends(get_current_user)):
        if not user.has_permission(permission):
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied: {permission} required"
            )
        return user
    return check_permission


def require_role(role: str):
    """Dependency factory to require a specific role."""
    async def check_role(user: AuthenticatedUser = Depends(get_current_user)):
        if user.role != role and user.role != "admin":
            raise HTTPException(
                status_code=403,
                detail=f"Role denied: {role} required"
            )
        return user
    return check_role
