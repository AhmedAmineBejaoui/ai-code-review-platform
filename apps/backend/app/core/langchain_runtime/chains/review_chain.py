"""LCEL chain for grounded code review generation.

This chain combines dual RAG retrieval (repository context + knowledge base)
with context fusion and LLM generation to produce grounded review findings.
"""
from __future__ import annotations

import logging
from typing import Any

from app.settings import settings

logger = logging.getLogger(__name__)


def build_review_chain() -> Any:
    """Build an LCEL chain for code review generation.

    Returns *None* when LangChain dependencies are unavailable.

    The chain expects an input dict with:
        - ``diff``: the unified diff text
        - ``repo_id``: repository identifier
        - ``changed_files``: list of changed file paths

    And produces a ``GroundedFindingOutput``-compatible dict.
    """
    try:
        from langchain_core.output_parsers import StrOutputParser
        from langchain_core.prompts import ChatPromptTemplate
        from langchain_core.runnables import RunnableLambda, RunnablePassthrough
        from langchain_ollama import ChatOllama
    except ImportError:
        logger.debug("LangChain packages not available for review chain")
        return None

    llm = ChatOllama(
        base_url=settings.langchain_ollama_base_url,
        model=settings.LANGCHAIN_OLLAMA_CHAT_MODEL_PRIMARY,
        temperature=settings.OLLAMA_TEMPERATURE,
        num_predict=settings.OLLAMA_NUM_PREDICT,
        timeout=settings.LANGCHAIN_RAG_TIMEOUT_SECONDS,
    )

    review_prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            "You are a senior code reviewer. Analyze the diff and produce findings "
            "grounded in the provided repository context and knowledge base context. "
            "Output ONLY raw JSON with a 'findings' array. Each finding has: "
            "file_path, line_start, line_end, severity (INFO|WARN|BLOCKER), "
            "category (security|perf|quality|style|maintainability|other), "
            "message, suggestion, confidence (0-1), kb_refs (list of source references).",
        ),
        (
            "human",
            "## Repository Context\n{repo_context}\n\n"
            "## Knowledge Base Context\n{kb_context}\n\n"
            "## Diff\n{diff}\n\n"
            "## Changed Files\n{changed_files}\n\n"
            "Produce your review findings as JSON:",
        ),
    ])

    chain = (
        RunnablePassthrough()
        | review_prompt
        | llm
        | StrOutputParser()
    )

    return chain


def build_hyde_chain() -> Any:
    """Build an LCEL chain for HyDE (Hypothetical Document Embeddings).

    The chain takes a query string and returns a hypothetical code snippet
    that can be embedded for more precise vector search.
    """
    try:
        from langchain_core.output_parsers import StrOutputParser
        from langchain_core.prompts import ChatPromptTemplate
        from langchain_ollama import ChatOllama
    except ImportError:
        return None

    llm = ChatOllama(
        base_url=settings.langchain_ollama_base_url,
        model=settings.LANGCHAIN_OLLAMA_CHAT_MODEL_PRIMARY,
        temperature=0.7,
        num_predict=512,
        timeout=settings.LANGCHAIN_RAG_TIMEOUT_SECONDS,
    )

    hyde_prompt = ChatPromptTemplate.from_messages([
        (
            "human",
            "You are a senior software engineer. Given the following query about a "
            "codebase, write a SHORT, realistic code snippet (10-30 lines) that would "
            "directly answer the query. Output ONLY the code — no explanation, "
            "no markdown fences.\n\nQuery: {query}",
        ),
    ])

    chain = hyde_prompt | llm | StrOutputParser()
    return chain
