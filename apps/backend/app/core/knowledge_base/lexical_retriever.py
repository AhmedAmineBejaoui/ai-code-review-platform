from __future__ import annotations

from app.core.knowledge_base.retrieval_models import RetrievalCandidate, RetrievedContextChunk
from app.data.repos.kb_repo import KBRepo
from app.data.repos.repo_context_chunks_repo import RepoContextChunksRepo


class LexicalRetriever:
    def __init__(
        self,
        *,
        code_repo: RepoContextChunksRepo | None = None,
        kb_repo: KBRepo | None = None,
    ) -> None:
        self._code_repo = code_repo or RepoContextChunksRepo()
        self._kb_repo = kb_repo or KBRepo()

    def retrieve_code(
        self,
        *,
        repo_id: str,
        query: str,
        limit: int,
        changed_files: set[str] | None = None,
    ) -> list[RetrievalCandidate]:
        rows = self._code_repo.search_lexical(repo_id=repo_id, query=query, limit=max(limit * 4, limit))
        if changed_files:
            filtered = [row for row in rows if row.path in changed_files]
            if filtered:
                rows = filtered

        candidates: list[RetrievalCandidate] = []
        for row in rows[:limit]:
            score = max(row.lexical_score, 0.1)
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
                source="lexical_code",
            )
            candidates.append(RetrievalCandidate(chunk=chunk, channel="lexical_code", raw_score=score, score=score))
        return candidates

    def retrieve_documents(
        self,
        *,
        repo_id: str,
        query: str,
        limit: int,
        source_type: str | None = None,
        tags: list[str] | None = None,
    ) -> list[RetrievalCandidate]:
        rows = self._kb_repo.search_document_chunks(
            repo_id=repo_id,
            query=query,
            limit=limit,
            source_type=source_type,
            tags=tags or [],
        )
        candidates: list[RetrievalCandidate] = []
        for row in rows:
            score = max(row.lexical_score, 0.1)
            chunk = RetrievedContextChunk(
                score=score,
                path=row.path_or_url or row.title,
                chunk_index=row.chunk_index,
                language=row.source_type,
                content=row.content,
                token_count=row.token_count,
                file_type=row.source_type,
                chunk_type="document_chunk",
                source="lexical_document",
                source_type=row.source_type,
                tags=tuple(row.tags),
                document_id=row.doc_id,
                title=row.title,
            )
            candidates.append(RetrievalCandidate(chunk=chunk, channel="lexical_document", raw_score=score, score=score))
        return candidates
