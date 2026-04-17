"""
AI Service configuration.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class AIServiceSettings(BaseSettings):
    """AI Service specific settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Service identification
    SERVICE_NAME: str = "ai-service"
    SERVICE_VERSION: str = "1.0.0"
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 4006
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str = "postgresql+psycopg://postgres:simplepass@localhost:5432/ai_code_review_platform"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Celery (for task queuing)
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    ANALYSIS_QUEUE_NAME: str = "analysis_queue"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Qdrant Vector Store
    QDRANT_ENABLED: bool = True
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str | None = None
    QDRANT_REPO_CONTEXT_COLLECTION: str = "repo_context"
    QDRANT_COLLECTION_KB_DOCUMENTS: str = "kb_documents"
    QDRANT_COLLECTION_ORG_RULES: str = "org_rules"
    
    # Neo4j Graph Database
    NEO4J_ENABLED: bool = False
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "password"
    NEO4J_DATABASE: str = "neo4j"
    
    # LLM Settings
    LLM_ENABLED: bool = False
    LLM_PROVIDER: str = "ollama"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"
    OLLAMA_TIMEOUT_SECONDS: int = 120
    
    # OpenAI (optional)
    OPENAI_API_KEY: str | None = None
    
    # Embeddings
    EMBEDDING_PROVIDER: str = "ollama"
    EMBEDDING_MODEL: str = "nomic-embed-text"
    EMBEDDING_BATCH_SIZE: int = 32
    EMBEDDING_CACHE_ENABLED: bool = True
    
    # RAG Agents
    RAG_AGENTS_ENABLED: bool = True
    RAG_AGENT_CODE_CONTEXT_ENABLED: bool = True
    RAG_AGENT_DOCUMENTATION_ENABLED: bool = True
    RAG_AGENT_POLICY_RULES_ENABLED: bool = True
    RAG_AGENT_SYNTHESIS_ENABLED: bool = True


@lru_cache
def get_settings() -> AIServiceSettings:
    return AIServiceSettings()
