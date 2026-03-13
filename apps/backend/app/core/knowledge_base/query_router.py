from __future__ import annotations

import re

from app.core.knowledge_base.retrieval_models import QueryRoute

_POLICY_KEYWORDS = {
    "policy",
    "policies",
    "rule",
    "rules",
    "security",
    "compliance",
    "owasp",
    "secret",
    "secrets",
    "permission",
    "permissions",
    "rbac",
    "governance",
}
_DOCUMENT_KEYWORDS = {
    "pdf",
    "document",
    "documentation",
    "docs",
    "readme",
    "markdown",
    "architecture",
    "design",
    "adr",
    "guide",
    "manual",
}
_CODE_PATH_PATTERN = re.compile(r"\b[\w./-]+\.(?:py|pyi|ts|tsx|js|jsx|go|java|kt|rs|rb|php|sql|md|mdx|ya?ml|json|toml)\b")
_CODE_SYMBOL_PATTERN = re.compile(r"`[A-Za-z_][A-Za-z0-9_./:-]*`|[A-Za-z_][A-Za-z0-9_]*\(")


class QueryRouter:
    def route_query(self, *, query: str, route_hint: str = "auto") -> QueryRoute:
        normalized_hint = (route_hint or "auto").strip().lower()
        if normalized_hint == QueryRoute.REPO_QUERY.value:
            return QueryRoute.REPO_QUERY
        if normalized_hint == QueryRoute.POLICY_QUERY.value:
            return QueryRoute.POLICY_QUERY
        if normalized_hint == QueryRoute.DOCUMENT_QUERY.value:
            return QueryRoute.DOCUMENT_QUERY

        normalized_query = query.strip().lower()
        if not normalized_query:
            return QueryRoute.GENERIC_HYBRID_QUERY

        query_terms = set(re.findall(r"[a-z0-9_./-]+", normalized_query))
        if query_terms.intersection(_POLICY_KEYWORDS):
            return QueryRoute.POLICY_QUERY

        looks_like_path = bool(_CODE_PATH_PATTERN.search(query))
        looks_like_symbol = bool(_CODE_SYMBOL_PATTERN.search(query))
        if looks_like_path or looks_like_symbol:
            return QueryRoute.REPO_QUERY

        if query_terms.intersection(_DOCUMENT_KEYWORDS):
            return QueryRoute.DOCUMENT_QUERY

        return QueryRoute.GENERIC_HYBRID_QUERY

    def route_diff(self) -> QueryRoute:
        return QueryRoute.DIFF_REVIEW
