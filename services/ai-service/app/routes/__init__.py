"""
AI Service routes.
"""

from .knowledge_base import router as knowledge_base_router
from .rag_query import router as rag_query_router
from .rag_evaluation import router as rag_evaluation_router

__all__ = ["knowledge_base_router", "rag_query_router", "rag_evaluation_router"]
