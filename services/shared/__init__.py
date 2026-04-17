"""Shared utilities package for microservices."""

from .config import BaseServiceSettings, ServiceClient
from .database import Base, get_engine, get_db_session, check_db_health
from .auth import AuthenticatedUser, get_current_user, get_optional_user, require_permission, require_role

__all__ = [
    "BaseServiceSettings",
    "ServiceClient",
    "Base",
    "get_engine",
    "get_db_session",
    "check_db_health",
    "AuthenticatedUser",
    "get_current_user",
    "get_optional_user",
    "require_permission",
    "require_role",
]
