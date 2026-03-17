from __future__ import annotations

import hashlib
from dataclasses import replace

from app.core.knowledge_base.retrieval_models import QueryRoute, RetrievalCandidate, RetrievedContextChunk


class ContextPacker:
    def __init__(self, *, max_chars: int, max_chunks: int, max_chunks_per_path: int = 3) -> None:
        self._max_chars = max_chars
        self._max_chunks = max_chunks
        self._max_chunks_per_path = max_chunks_per_path

    def pack(
        self,
        *,
        candidates: list[RetrievalCandidate],
        route: QueryRoute,
        limit: int | None = None,
    ) -> list[RetrievedContextChunk]:
        if not candidates:
            return []

        max_chunks = min(limit or self._max_chunks, self._max_chunks)
        quotas = _quotas_for_route(route, max_chunks)

        deduped = self._dedup(candidates)
        deduped.sort(key=lambda item: item.score, reverse=True)

        selected: list[RetrievedContextChunk] = []
        bucket_counts = {key: 0 for key in quotas}
        path_counts: dict[str, int] = {}
        total_chars = 0

        for candidate in deduped:
            chunk = candidate.chunk
            bucket = _bucket_for_candidate(candidate)
            if bucket_counts.get(bucket, 0) >= quotas.get(bucket, max_chunks):
                continue
            if path_counts.get(chunk.path, 0) >= self._max_chunks_per_path:
                continue
            projected_chars = total_chars + len(chunk.content)
            if projected_chars > self._max_chars and selected:
                continue

            selected.append(
                replace(
                    chunk,
                    score=candidate.score,
                    retrieval_reason=chunk.retrieval_reason or f"packed:{candidate.channel}",
                    retriever_channel=candidate.channel,
                    score_raw=candidate.raw_score,
                    score_final=candidate.score,
                )
            )
            bucket_counts[bucket] = bucket_counts.get(bucket, 0) + 1
            path_counts[chunk.path] = path_counts.get(chunk.path, 0) + 1
            total_chars = projected_chars
            if len(selected) >= max_chunks:
                break

        if not selected:
            top_candidate = deduped[0]
            return [
                replace(
                    top_candidate.chunk,
                    score=top_candidate.score,
                    retrieval_reason=top_candidate.chunk.retrieval_reason or f"packed:{top_candidate.channel}",
                    retriever_channel=top_candidate.channel,
                    score_raw=top_candidate.raw_score,
                    score_final=top_candidate.score,
                )
            ]
        return selected

    def _dedup(self, candidates: list[RetrievalCandidate]) -> list[RetrievalCandidate]:
        deduped: dict[tuple[str, int, str], RetrievalCandidate] = {}
        content_hashes: set[str] = set()
        for candidate in candidates:
            key = (candidate.chunk.path, candidate.chunk.chunk_index, candidate.channel)
            previous = deduped.get(key)
            if previous is None or candidate.score > previous.score:
                deduped[key] = candidate
        results: list[RetrievalCandidate] = []
        for candidate in deduped.values():
            content_hash = hashlib.sha1(candidate.chunk.content.strip().encode("utf-8")).hexdigest()
            if content_hash in content_hashes:
                continue
            content_hashes.add(content_hash)
            results.append(candidate)
        return results


def _bucket_for_candidate(candidate: RetrievalCandidate) -> str:
    chunk = candidate.chunk
    if chunk.file_type == "test" or chunk.chunk_type in {"test_case", "test_block"}:
        return "test"
    tags = {tag.lower() for tag in chunk.tags}
    if chunk.source_type == "policy" or tags.intersection({"policy", "security", "compliance"}):
        return "policy"
    if chunk.chunk_type == "document_chunk" or chunk.source_type in {"pdf", "markdown", "web", "sql"}:
        return "document"
    return "code"


def _quotas_for_route(route: QueryRoute, max_chunks: int) -> dict[str, int]:
    if route == QueryRoute.DIFF_REVIEW:
        return {"code": max_chunks, "test": max(2, max_chunks // 3), "document": 2, "policy": 2}
    if route == QueryRoute.POLICY_QUERY:
        return {"policy": max_chunks, "document": max(3, max_chunks // 2), "code": 3, "test": 1}
    if route == QueryRoute.DOCUMENT_QUERY:
        return {"document": max_chunks, "policy": max(3, max_chunks // 2), "code": 3, "test": 1}
    return {"code": max_chunks, "document": max(3, max_chunks // 2), "policy": 2, "test": 2}
