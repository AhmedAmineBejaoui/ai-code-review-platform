"""Gateway route map.

Each entry says: *"Any request whose path starts with <prefix> goes to
<target>."* Order matters — the **first** matching prefix wins, so list
specific prefixes before generic ones.

During the migration, every prefix points at the legacy monolith. As
services are extracted, the target for that prefix is flipped to the
new service host. The *frontend never sees a change*.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from common.settings import BaseServiceSettings


class Target(str, Enum):
    """Logical upstream; resolved to an URL via ``Router.resolve``."""

    LEGACY = "legacy"
    ANALYSIS = "analysis"
    KB = "kb"
    REVIEWS = "reviews"
    ORG = "org"
    CONFIG = "config"
    NOTIFICATIONS = "notifications"


@dataclass(frozen=True)
class Route:
    prefix: str
    target: Target
    description: str = ""


# ---------------------------------------------------------------------------
# Route table (most specific first)
# ---------------------------------------------------------------------------
ROUTES: tuple[Route, ...] = (
    # ---- Reviews & review-adjacent ---------------------------------------
    Route("/v1/reviews/metrics",      Target.LEGACY, "reviewer personal/team metrics"),
    Route("/v1/review-queue",         Target.LEGACY, "queue prioritisation"),
    Route("/v1/review-states",        Target.LEGACY, "review state machine"),
    Route("/v1/jira",                 Target.LEGACY, "Jira integration"),
    Route("/api/v1/reviews",          Target.LEGACY, "reviews dashboard & comments"),
    Route("/ws/review-sessions",      Target.LEGACY, "collaborative review WS"),

    # ---- Knowledge base / RAG --------------------------------------------
    Route("/v1/kb",                   Target.LEGACY, "knowledge base"),
    Route("/api/v1/rag",              Target.LEGACY, "RAG query, feedback"),
    Route("/api/v1/graphrag",         Target.LEGACY, "graph-based analysis"),
    Route("/v1/rag",                  Target.LEGACY, "RAG evaluation"),

    # ---- Organization / RBAC ---------------------------------------------
    Route("/organizations",           Target.LEGACY, "org CRUD"),
    Route("/api/v1/teams",            Target.LEGACY, "teams"),
    Route("/api/v1/roles",            Target.LEGACY, "roles & permissions"),
    Route("/api/v1/structure",        Target.LEGACY, "org structure"),
    Route("/v1/admin",                Target.LEGACY, "admin utilities"),

    # ---- Configuration ---------------------------------------------------
    Route("/api/v1/projects",         Target.LEGACY, "projects, settings, comprehension, roles"),
    Route("/api/v1/repositories",     Target.LEGACY, "repo linking"),
    Route("/api/v1/integrations",     Target.LEGACY, "external integrations"),
    Route("/api/v1/security",         Target.LEGACY, "secrets, audit"),
    Route("/api/v1/storage",          Target.LEGACY, "MinIO proxy"),
    Route("/v1/branch-protection",    Target.LEGACY, "branch protection rules"),
    Route("/v1/branch-policies",      Target.LEGACY, "branch policies"),
    Route("/v1/branches",             Target.LEGACY, "branch sync"),

    # ---- Analysis & observability ----------------------------------------
    Route("/v1/analyses",             Target.LEGACY, "analysis intake & results"),
    Route("/v1/observability",        Target.LEGACY, "Prometheus metrics"),
    Route("/github/webhooks",         Target.LEGACY, "GitHub webhook inbound"),
    Route("/ai",                      Target.LEGACY, "AI utility endpoints"),

    # ---- Notifications ---------------------------------------------------
    Route("/api/v1/notifications",    Target.LEGACY, "in-app notifications"),
    Route("/ws/notifications",        Target.LEGACY, "real-time notifications WS"),

    # ---- Catch-all: anything else (docs, healthz, metrics, openapi) ------
    Route("/",                        Target.LEGACY, "fallback — never extract"),
)


class Router:
    """Resolves an incoming request path to an upstream base URL."""

    def __init__(self, settings: BaseServiceSettings) -> None:
        self._settings = settings
        # Pre-compute target → base URL so matching stays O(1) per lookup.
        self._target_urls: dict[Target, str] = {
            Target.LEGACY:         settings.legacy_backend_url,
            Target.ANALYSIS:       settings.service_url("analysis"),
            Target.KB:             settings.service_url("kb"),
            Target.REVIEWS:        settings.service_url("reviews"),
            Target.ORG:            settings.service_url("org"),
            Target.CONFIG:         settings.service_url("config"),
            Target.NOTIFICATIONS:  settings.service_url("notifications"),
        }

    def resolve(self, path: str) -> tuple[Target, str]:
        """Return (target, base_url) for the first matching prefix."""
        for route in ROUTES:
            if path.startswith(route.prefix):
                return route.target, self._target_urls[route.target]
        # Should never happen because ``/`` catches everything.
        return Target.LEGACY, self._target_urls[Target.LEGACY]
