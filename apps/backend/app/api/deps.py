from __future__ import annotations

from functools import lru_cache

from fastapi import Depends

from app.core.services.analysis_service import AnalysisService
from app.core.trust_center.policy_engine import PolicyEngine
from app.data.repos.analyses_repo import AnalysesRepo
from app.integrations.git_provider.github_client import GithubClient
from app.integrations.llm_providers.openai_client import OpenAIClient
from app.integrations.vector_store.qdrant_client import QdrantClient


@lru_cache(maxsize=1)
def get_analyses_repo() -> AnalysesRepo:
    return AnalysesRepo()


@lru_cache(maxsize=1)
def get_github_client() -> GithubClient:
    return GithubClient()


@lru_cache(maxsize=1)
def get_openai_client() -> OpenAIClient:
    return OpenAIClient()


@lru_cache(maxsize=1)
def get_qdrant_client() -> QdrantClient:
    return QdrantClient()


@lru_cache(maxsize=1)
def get_policy_engine() -> PolicyEngine:
    return PolicyEngine()


def get_analysis_service(
    repo: AnalysesRepo = Depends(get_analyses_repo),
    github_client: GithubClient = Depends(get_github_client),
    openai_client: OpenAIClient = Depends(get_openai_client),
    qdrant_client: QdrantClient = Depends(get_qdrant_client),
    policy_engine: PolicyEngine = Depends(get_policy_engine),
) -> AnalysisService:
    # AnalysisService stays transient while its dependencies are singleton.
    return AnalysisService(
        repo_store=repo,
        git_provider=github_client,
        llm_provider=openai_client,
        vector_provider=qdrant_client,
        policy_provider=policy_engine,
    )
