"""
Route definitions mapping URL prefixes to downstream services.
This is the central routing configuration for the API Gateway.
"""

from dataclasses import dataclass
from typing import Optional
from enum import Enum


class ServiceName(str, Enum):
    AUTH = "auth"
    ANALYSIS = "analysis"
    PROJECT = "project"
    REVIEW = "review"
    INTEGRATION = "integration"
    AI = "ai"
    NOTIFICATION = "notification"
    SECURITY = "security"


@dataclass
class RouteConfig:
    """Configuration for a route prefix."""
    prefix: str
    service: ServiceName
    strip_prefix: bool = False  # Whether to strip the prefix when forwarding
    require_auth: bool = True   # Whether this route requires authentication
    rate_limit_override: Optional[int] = None  # Custom rate limit for this route


# Route definitions - order matters (more specific routes first)
ROUTES: list[RouteConfig] = [
    # ============ AUTH SERVICE (4001) ============
    # Organizations
    RouteConfig(prefix="/v1/organizations", service=ServiceName.AUTH),
    RouteConfig(prefix="/api/v1/organizations", service=ServiceName.AUTH),
    # Teams
    RouteConfig(prefix="/api/v1/teams", service=ServiceName.AUTH),
    # Users/Auth
    RouteConfig(prefix="/api/v1/users", service=ServiceName.AUTH),
    RouteConfig(prefix="/api/v1/auth", service=ServiceName.AUTH),
    # Org structure (hierarchy)
    RouteConfig(prefix="/api/v1/org-structure", service=ServiceName.AUTH),
    # Role permissions
    RouteConfig(prefix="/api/v1/role-permissions", service=ServiceName.AUTH),
    # Project roles
    RouteConfig(prefix="/api/v1/project-roles", service=ServiceName.AUTH),
    
    # ============ ANALYSIS SERVICE (4002) ============
    # Analyses
    RouteConfig(prefix="/v1/analyze", service=ServiceName.ANALYSIS),
    RouteConfig(prefix="/v1/analyses", service=ServiceName.ANALYSIS),
    RouteConfig(prefix="/api/v1/analyses", service=ServiceName.ANALYSIS),
    # Internal analysis engine
    RouteConfig(prefix="/api/v1/internal/analysis", service=ServiceName.ANALYSIS),
    # Statistics
    RouteConfig(prefix="/api/v1/statistics", service=ServiceName.ANALYSIS),
    
    # ============ PROJECT SERVICE (4003) ============
    # Projects
    RouteConfig(prefix="/api/v1/projects", service=ServiceName.PROJECT),
    # Repositories
    RouteConfig(prefix="/api/v1/repositories", service=ServiceName.PROJECT),
    # Branches
    RouteConfig(prefix="/api/v1/branches", service=ServiceName.PROJECT),
    # Branch protection
    RouteConfig(prefix="/api/v1/branch-protection", service=ServiceName.PROJECT),
    # Branch policies
    RouteConfig(prefix="/api/v1/branch-policies", service=ServiceName.PROJECT),
    # Project settings
    RouteConfig(prefix="/api/v1/project-settings", service=ServiceName.PROJECT),
    # Project comprehension
    RouteConfig(prefix="/api/v1/project-comprehension", service=ServiceName.PROJECT),
    
    # ============ REVIEW SERVICE (4004) ============
    # Reviews
    RouteConfig(prefix="/api/v1/reviews", service=ServiceName.REVIEW),
    # Review queue
    RouteConfig(prefix="/api/v1/review-queue", service=ServiceName.REVIEW),
    # Review states
    RouteConfig(prefix="/api/v1/review-states", service=ServiceName.REVIEW),
    # Reviewer metrics
    RouteConfig(prefix="/api/v1/reviewer-metrics", service=ServiceName.REVIEW),
    
    # ============ INTEGRATION SERVICE (4005) ============
    # GitHub webhooks (no auth required - signature validation instead)
    RouteConfig(prefix="/webhooks/github", service=ServiceName.INTEGRATION, require_auth=False),
    # Jira integration
    RouteConfig(prefix="/api/v1/jira", service=ServiceName.INTEGRATION),
    # Generic integrations
    RouteConfig(prefix="/api/v1/integrations", service=ServiceName.INTEGRATION),
    
    # ============ AI/RAG SERVICE (4006) ============
    # Knowledge base
    RouteConfig(prefix="/api/v1/knowledge-base", service=ServiceName.AI),
    # RAG queries
    RouteConfig(prefix="/api/v1/rag", service=ServiceName.AI),
    RouteConfig(prefix="/api/v1/rag-query", service=ServiceName.AI),
    # RAG evaluation
    RouteConfig(prefix="/api/v1/rag-evaluation", service=ServiceName.AI),
    # RAG feedback
    RouteConfig(prefix="/api/v1/rag-feedback", service=ServiceName.AI),
    # GraphRAG
    RouteConfig(prefix="/api/v1/graphrag", service=ServiceName.AI),
    # AI endpoints
    RouteConfig(prefix="/api/v1/ai", service=ServiceName.AI),
    
    # ============ NOTIFICATION SERVICE (4007) ============
    # Notifications REST
    RouteConfig(prefix="/api/v1/notifications", service=ServiceName.NOTIFICATION),
    # WebSocket notifications
    RouteConfig(prefix="/ws/notifications", service=ServiceName.NOTIFICATION, require_auth=True),
    # WebSocket review sessions
    RouteConfig(prefix="/ws/review-sessions", service=ServiceName.NOTIFICATION, require_auth=True),
    
    # ============ SECURITY SERVICE (4008) ============
    # Security scanning
    RouteConfig(prefix="/api/v1/security", service=ServiceName.SECURITY),
    # Object storage (secrets handling)
    RouteConfig(prefix="/api/v1/object-storage", service=ServiceName.SECURITY),
    
    # ============ ADMIN/OBSERVABILITY (distributed) ============
    # Admin routes go to Auth service
    RouteConfig(prefix="/api/v1/admin", service=ServiceName.AUTH),
    # Observability stays at gateway level (handled separately)
]


def get_service_url(service: ServiceName, settings) -> str:
    """Get the URL for a service from settings."""
    service_url_map = {
        ServiceName.AUTH: settings.AUTH_SERVICE_URL,
        ServiceName.ANALYSIS: settings.ANALYSIS_SERVICE_URL,
        ServiceName.PROJECT: settings.PROJECT_SERVICE_URL,
        ServiceName.REVIEW: settings.REVIEW_SERVICE_URL,
        ServiceName.INTEGRATION: settings.INTEGRATION_SERVICE_URL,
        ServiceName.AI: settings.AI_SERVICE_URL,
        ServiceName.NOTIFICATION: settings.NOTIFICATION_SERVICE_URL,
        ServiceName.SECURITY: settings.SECURITY_SERVICE_URL,
    }
    return service_url_map[service]


def find_route(path: str) -> Optional[RouteConfig]:
    """Find the matching route configuration for a given path."""
    for route in ROUTES:
        if path.startswith(route.prefix):
            return route
    return None
