from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.core.knowledge_base.rag_engines import LangChainRagEngine
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
