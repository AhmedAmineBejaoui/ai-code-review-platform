"""
Notification Service routes package.
"""

from .notifications import router as notifications_router
from .preferences import router as preferences_router
from .push import router as push_router

__all__ = ["notifications_router", "preferences_router", "push_router"]
