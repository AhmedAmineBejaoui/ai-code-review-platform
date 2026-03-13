from __future__ import annotations

import re

from app.core.knowledge_base.retrieval_models import RetrievalCandidate, RetrievedContextChunk
from app.data.repos.repo_context_chunks_repo import RepoContextChunkRow, RepoContextChunksRepo

_QUERY_PATH_PATTERN = re.compile(r"[\w./-]+\.(?:py|pyi|ts|tsx|js|jsx|go|java|kt|rs|rb|php|sql|md|mdx|ya?ml|json|toml)")
_QUERY_SYMBOL_PATTERN = re.compile(r"`([A-Za-z_][A-Za-z0-9_]*)`|\b([A-Za-z_][A-Za-z0-9_]*)\s*\(")


class ExactRetriever:
    def __init__(self, repo: RepoContextChunksRepo | None = None) -> None:
        self._repo = repo or RepoContextChunksRepo()

    def retrieve_file_chunks(self, *, repo_id: str, paths: list[str], per_file_limit: int) -> list[RetrievalCandidate]:
        candidates: list[RetrievalCandidate] = []
        for path in paths:
            for row in self._repo.list_by_path(repo_id=repo_id, path=path, limit=per_file_limit):
                candidates.append(_row_to_candidate(row, source="file_exact", score=1.0))
        return candidates

    def retrieve_symbol_chunks(
        self,
        *,
        repo_id: str,
        symbols: set[str],
        per_symbol_limit: int,
    ) -> list[RetrievalCandidate]:
        candidates: list[RetrievalCandidate] = []
        for symbol in symbols:
            for row in self._repo.list_by_symbol(repo_id=repo_id, symbol_name=symbol, limit=per_symbol_limit):
                candidates.append(_row_to_candidate(row, source="symbol_exact", score=0.95))
        return candidates

    def retrieve_related_tests(self, *, repo_id: str, changed_files: list[str], limit: int) -> list[RetrievalCandidate]:
        rows = self._repo.list_related_test_chunks(repo_id=repo_id, changed_files=changed_files, limit=limit)
        return [_row_to_candidate(row, source="test_related", score=0.9) for row in rows]

    def retrieve_query_hints(self, *, repo_id: str, query: str, limit: int = 8) -> list[RetrievalCandidate]:
        paths = sorted(set(match.group(0) for match in _QUERY_PATH_PATTERN.finditer(query)))
        symbols = sorted(
            {
                symbol
                for match in _QUERY_SYMBOL_PATTERN.finditer(query)
                for symbol in match.groups()
                if isinstance(symbol, str) and symbol.strip()
            }
        )
        candidates = [
            *self.retrieve_file_chunks(repo_id=repo_id, paths=paths[:limit], per_file_limit=max(limit, 2)),
            *self.retrieve_symbol_chunks(repo_id=repo_id, symbols=set(symbols[:limit]), per_symbol_limit=max(limit, 2)),
        ]
        return candidates


def _row_to_candidate(row: RepoContextChunkRow, *, source: str, score: float) -> RetrievalCandidate:
    chunk = RetrievedContextChunk(
        score=score,
        path=row.path,
        chunk_index=row.chunk_index,
        language=row.language,
        content=row.content,
        token_count=max(1, len(row.content.split())),
        file_type=row.file_type,
        chunk_type=row.chunk_type,
        symbol_name=row.symbol_name,
        start_line=row.start_line,
        end_line=row.end_line,
        source=source,
    )
    return RetrievalCandidate(chunk=chunk, channel=source, raw_score=score, score=score)
