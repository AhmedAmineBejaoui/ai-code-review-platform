from __future__ import annotations

from app.core.knowledge_base.context_packer import ContextPacker
from app.core.knowledge_base.retrieval_models import QueryRoute, RetrievalCandidate, RetrievedContextChunk


def _candidate(
    *,
    source: str,
    file_type: str,
    chunk_type: str,
    content: str,
    path: str,
    score: float,
    source_type: str | None = None,
    tags: tuple[str, ...] = (),
) -> RetrievalCandidate:
    chunk = RetrievedContextChunk(
        score=score,
        path=path,
        chunk_index=0,
        language=file_type,
        content=content,
        token_count=max(1, len(content.split())),
        file_type=file_type,
        chunk_type=chunk_type,
        source=source,
        source_type=source_type,
        tags=tags,
    )
    return RetrievalCandidate(chunk=chunk, channel=source, raw_score=score, score=score)


def test_context_packer_dedups_same_content() -> None:
    packer = ContextPacker(max_chars=1000, max_chunks=4)
    packed = packer.pack(
        candidates=[
            _candidate(source="semantic_code", file_type="code", chunk_type="function", content="same", path="a.py", score=0.9),
            _candidate(source="lexical_code", file_type="code", chunk_type="function", content="same", path="a.py", score=0.8),
        ],
        route=QueryRoute.REPO_QUERY,
        limit=4,
    )

    assert len(packed) == 1


def test_context_packer_prioritizes_policy_bucket_for_policy_route() -> None:
    packer = ContextPacker(max_chars=1000, max_chunks=3)
    packed = packer.pack(
        candidates=[
            _candidate(
                source="lexical_document",
                file_type="policy",
                chunk_type="document_chunk",
                content="Never expose secrets in logs.",
                path="policy/security.md",
                score=1.2,
                source_type="policy",
                tags=("policy",),
            ),
            _candidate(
                source="semantic_code",
                file_type="code",
                chunk_type="function",
                content="def login_user(payload): return payload",
                path="apps/backend/app/main.py",
                score=0.6,
            ),
        ],
        route=QueryRoute.POLICY_QUERY,
        limit=2,
    )

    assert packed[0].source_type == "policy"
