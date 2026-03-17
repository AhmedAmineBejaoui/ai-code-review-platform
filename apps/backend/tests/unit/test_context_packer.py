from __future__ import annotations

from app.core.knowledge_base.context_packer import ContextPacker
from app.core.knowledge_base.retrieval_models import QueryRoute, RetrievalCandidate, RetrievedContextChunk


def test_context_packer_preserves_final_score_and_channel_metadata() -> None:
    packer = ContextPacker(max_chars=500, max_chunks=4)
    candidate = RetrievalCandidate(
        chunk=RetrievedContextChunk(
            score=0.2,
            path="src/auth.py",
            chunk_index=0,
            language="python",
            content="def login():\n    return True",
            token_count=8,
            file_type="code",
            chunk_type="function",
            source="semantic_code",
        ),
        channel="semantic_code",
        raw_score=0.2,
        score=0.91,
    )

    packed = packer.pack(candidates=[candidate], route=QueryRoute.DIFF_REVIEW, limit=1)

    assert len(packed) == 1
    assert packed[0].score == 0.91
    assert packed[0].score_raw == 0.2
    assert packed[0].score_final == 0.91
    assert packed[0].retriever_channel == "semantic_code"
