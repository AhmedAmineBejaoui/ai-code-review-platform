"""
Integration Service routes.
"""

from .github import router as github_router
from .jira import router as jira_router
from .integrations import router as integrations_router

__all__ = ["github_router", "jira_router", "integrations_router"]
