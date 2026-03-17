from __future__ import annotations

import pytest

from app.core.knowledge_base.langchain_shadow import LangChainShadowIndexingService
from app.data.repos.kb_repo import KBDocumentChunkRow
from app.data.repos.repo_context_chunks_repo import RepoContextChunkRow


class _FakeVectorStore:
    def __init__(self) -> None:
        self.enabled = True
        self.ensure_calls: list[tuple[str, int | None]] = []
        self.alias_calls: list[tuple[str, str]] = []
        self.upsert_calls: list[tuple[str, list[object]]] = []

    async def ensure_collection(self, *, collection_name: str, vector_size: int | None = None) -> None:
        self.ensure_calls.append((collection_name, vector_size))

    async def get_collection_vector_size(self, *, collection_name: str) -> int | None:  # noqa: ARG002
        return 3

    async def ensure_alias(self, *, alias_name: str, collection_name: str) -> None:
        self.alias_calls.append((alias_name, collection_name))

    async def upsert_points(self, *, collection_name: str, points: list[object]) -> None:
        self.upsert_calls.append((collection_name, points))


class _FakeEmbeddings:
    available = True

    def get_vector_size(self) -> int:
        return 3

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [[float(index + 1), 0.0, 0.0] for index, _ in enumerate(texts)]

    def embed_query(self, text: str) -> list[float]:  # noqa: ARG002
        return [1.0, 0.0, 0.0]


@pytest.mark.anyio
async def test_shadow_index_upserts_repo_context_rows_to_shadow_alias(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.core.knowledge_base.langchain_shadow.settings.LANGCHAIN_ENABLED", True)
    vector_store = _FakeVectorStore()
    service = LangChainShadowIndexingService(vector_store=vector_store, embeddings=_FakeEmbeddings())

    trace = await service.upsert_repo_context_rows(
        repo_id="owner/repo",
        rows=[
            RepoContextChunkRow(
                id="chunk-1",
                repo_id="owner/repo",
                path="src/main.py",
                chunk_index=0,
                content="def login_user(payload):\n    return payload\n",
                language="python",
                file_type="code",
                chunk_type="function",
                symbol_name="login_user",
                start_line=1,
                end_line=2,
                indexed_commit="abc123",
                metadata={"token_count": 7, "indexed_at": "2026-03-17T00:00:00Z"},
                lexical_score=0.0,
            )
        ],
    )

    assert trace.backfilled_repo_chunks == 1
    assert vector_store.upsert_calls
    collection_name, points = vector_store.upsert_calls[0]
    assert collection_name == "repo_context_langchain_shadow"
    assert points[0].payload["collection_version"].startswith("repo_context_lc_v1_")


@pytest.mark.anyio
async def test_shadow_index_upserts_document_rows_with_doc_metadata(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.core.knowledge_base.langchain_shadow.settings.LANGCHAIN_ENABLED", True)
    vector_store = _FakeVectorStore()
    service = LangChainShadowIndexingService(vector_store=vector_store, embeddings=_FakeEmbeddings())

    trace = await service.upsert_kb_document_rows(
        repo_id="owner/repo",
        rows=[
            KBDocumentChunkRow(
                doc_id="doc-1",
                title="Policy",
                source_type="markdown",
                path_or_url="docs/policy.md",
                repo_id="owner/repo",
                doc_version="v1",
                chunk_index=0,
                content="Always validate input before persistence.",
                token_count=6,
                tags=["policy", "security"],
            )
        ],
    )

    assert trace.backfilled_document_chunks == 1
    _, points = vector_store.upsert_calls[0]
    assert points[0].payload["doc_id"] == "doc-1"
    assert points[0].payload["document_version"] == "v1"
