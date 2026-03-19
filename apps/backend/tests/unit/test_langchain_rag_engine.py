from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.core.knowledge_base.rag_engines import LangChainRagEngine, _result_from_chunks
from app.core.knowledge_base.retrieval_models import RetrievalCandidate, RetrievedContextChunk


class _DisabledVectorStore:
    enabled = False


def _candidate(*, path: str, content: str, score: float, source: str = "lexical_code") -> RetrievalCandidate:
    chunk = RetrievedContextChunk(
        score=score,
        path=path,
        chunk_index=0,
        language="python",
        content=content,
        token_count=8,
        file_type="code",
        chunk_type="function",
        source=source,
        repo_id="owner/repo",
        source_id=f"{path}:0",
        chunk_id=f"{path}:0",
        retriever_channel=source,
        score_raw=score,
        score_final=score,
    )
    return RetrievalCandidate(chunk=chunk, channel=source, raw_score=score, score=score)


@pytest.mark.anyio
async def test_langchain_rag_engine_degrades_to_exact_and_lexical_when_qdrant_is_down(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.core.knowledge_base.rag_engines.settings.LANGCHAIN_ENABLED", True)
    engine = LangChainRagEngine(vector_store=_DisabledVectorStore())  # type: ignore[arg-type]
    engine._shadow_index = SimpleNamespace(available=False)
    engine._get_repo_profile = lambda **_: {"repo_id": "owner/repo"}  # type: ignore[method-assign]
    engine._exact.retrieve_file_chunks = lambda **_: [_candidate(path="src/auth.py", content="def login(): pass", score=0.7)]  # type: ignore[method-assign]
    engine._exact.retrieve_symbol_chunks = lambda **_: []  # type: ignore[method-assign]
    engine._exact.retrieve_related_tests = lambda **_: []  # type: ignore[method-assign]
    engine._lexical.retrieve_code = lambda **_: [_candidate(path="src/auth.py", content="def login(): pass", score=0.9)]  # type: ignore[method-assign]
    engine._lexical.retrieve_documents = lambda **_: []  # type: ignore[method-assign]
    engine._lexical.retrieve_global_documents = lambda **_: []  # type: ignore[method-assign]

    result = await engine.retrieve_for_diff(
        repo_id="owner/repo",
        diff_text="diff --git a/src/auth.py b/src/auth.py\n+def login():\n+    pass\n",
        limit=8,
    )

    assert result.grounded is True
    assert result.qdrant_enabled is False
    assert result.mode == "langchain_hybrid"
    assert result.chunks[0].path == "src/auth.py"


def test_result_from_chunks_only_references_prompt_used_chunks() -> None:
    first = RetrievedContextChunk(
        score=0.92,
        path="src/first.py",
        chunk_index=0,
        language="python",
        content="x" * 7000,
        token_count=1200,
        file_type="code",
        chunk_type="function",
        source="semantic_code",
        repo_id="owner/repo",
        source_id="src/first.py:0",
        chunk_id="src/first.py:0",
        retriever_channel="semantic_code",
        score_raw=0.92,
        score_final=0.92,
    )
    second = RetrievedContextChunk(
        score=0.81,
        path="src/second.py",
        chunk_index=1,
        language="python",
        content="def two():\n    return 2",
        token_count=12,
        file_type="code",
        chunk_type="function",
        source="lexical_code",
        repo_id="owner/repo",
        source_id="src/second.py:1",
        chunk_id="src/second.py:1",
        retriever_channel="lexical_code",
        score_raw=0.81,
        score_final=0.81,
    )

    result = _result_from_chunks(
        stack="langchain",
        mode="langchain_hybrid",
        chunks=[first, second],
        profile=None,
        qdrant_enabled=True,
        duration_ms=5,
    )

    assert result.context_text is not None
    assert "[FILE: src/first.py]" in result.context_text
    assert "[FILE: src/second.py]" not in result.context_text
    assert len(result.context_references) == 1
    assert result.context_references[0]["path"] == "src/first.py"
    assert result.context_references[0]["source"] == "semantic_code"
    assert result.context_references[0]["chunk_type"] == "function"
    assert result.context_references[0]["score"] == 0.92
    assert result.trace["prompt_chunks_used"] == 1


def test_result_from_chunks_drops_grounding_when_citations_are_invalid() -> None:
    result = _result_from_chunks(
        stack="langchain",
        mode="langchain_hybrid",
        chunks=[
            RetrievedContextChunk(
                score=0.77,
                path="src/auth.py",
                chunk_index=0,
                language="python",
                content="def login():\n    return True",
                token_count=10,
                file_type="code",
                chunk_type="function",
                source="",
            )
        ],
        profile=None,
        qdrant_enabled=True,
        duration_ms=5,
    )

    assert result.grounded is False
    assert result.context_text is None
    assert result.context_references == []
    assert result.trace["invalid_references_count"] == 1
