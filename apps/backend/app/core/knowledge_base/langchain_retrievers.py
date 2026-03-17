from __future__ import annotations

import inspect
from typing import Any, Awaitable, Callable

from app.core.knowledge_base.retrieval_models import RetrievalCandidate, RetrievedContextChunk

try:
    from langchain_core.documents import Document
    from langchain_core.retrievers import BaseRetriever
    from langchain_core.callbacks import CallbackManagerForRetrieverRun, AsyncCallbackManagerForRetrieverRun
except Exception:  # pragma: no cover - handled at runtime when LangChain is unavailable
    Document = None
    BaseRetriever = object
    CallbackManagerForRetrieverRun = object
    AsyncCallbackManagerForRetrieverRun = object


CandidateLoader = Callable[[str], list[RetrievalCandidate] | Awaitable[list[RetrievalCandidate]]]


class CandidateDocumentRetriever(BaseRetriever):
    loader: CandidateLoader
    retriever_name: str = "candidate_retriever"

    def _get_relevant_documents(
        self,
        query: str,
        *,
        run_manager: CallbackManagerForRetrieverRun | None = None,
    ) -> list[Document]:
        _ = run_manager
        result = self.loader(query)
        if inspect.isawaitable(result):
            raise RuntimeError(f"{self.retriever_name} requires async invocation")
        return candidates_to_documents(result)

    async def _aget_relevant_documents(
        self,
        query: str,
        *,
        run_manager: AsyncCallbackManagerForRetrieverRun | None = None,
    ) -> list[Document]:
        _ = run_manager
        result = self.loader(query)
        if inspect.isawaitable(result):
            result = await result
        return candidates_to_documents(result)


def candidates_to_documents(candidates: list[RetrievalCandidate]) -> list[Document]:
    if Document is None:
        raise RuntimeError("LangChain Document support is unavailable")
    documents: list[Document] = []
    for candidate in candidates:
        chunk = candidate.chunk
        documents.append(
            Document(
                page_content=chunk.content,
                metadata={
                    "path": chunk.path,
                    "chunk_index": chunk.chunk_index,
                    "language": chunk.language,
                    "token_count": chunk.token_count,
                    "file_type": chunk.file_type,
                    "chunk_type": chunk.chunk_type,
                    "symbol_name": chunk.symbol_name,
                    "start_line": chunk.start_line,
                    "end_line": chunk.end_line,
                    "source": chunk.source,
                    "source_type": chunk.source_type,
                    "tags": list(chunk.tags),
                    "document_id": chunk.document_id,
                    "title": chunk.title,
                    "repo_id": chunk.repo_id,
                    "source_id": chunk.source_id,
                    "chunk_id": chunk.chunk_id,
                    "document_version": chunk.document_version,
                    "section_title": chunk.section_title,
                    "retrieval_reason": chunk.retrieval_reason,
                    "retriever_channel": chunk.retriever_channel,
                    "score_raw": chunk.score_raw,
                    "score_final": chunk.score_final,
                    "collection_version": chunk.collection_version,
                    "channel": candidate.channel,
                    "raw_score": candidate.raw_score,
                    "score": candidate.score,
                },
            )
        )
    return documents


def documents_to_candidates(documents: list[Document]) -> list[RetrievalCandidate]:
    candidates: list[RetrievalCandidate] = []
    for document in documents:
        metadata = dict(document.metadata)
        score = float(metadata.get("score") or metadata.get("raw_score") or 0.0)
        tags = metadata.get("tags")
        normalized_tags = tuple(str(tag).strip() for tag in tags if str(tag).strip()) if isinstance(tags, list) else ()
        chunk = RetrievedContextChunk(
            score=score,
            path=str(metadata.get("path") or metadata.get("path_or_url") or metadata.get("title") or "unknown"),
            chunk_index=int(metadata.get("chunk_index") or 0),
            language=str(metadata.get("language") or metadata.get("source_type") or "text"),
            content=document.page_content,
            token_count=int(metadata.get("token_count") or max(1, len(document.page_content.split()))),
            file_type=str(metadata.get("file_type") or metadata.get("source_type") or "text"),
            chunk_type=str(metadata.get("chunk_type") or "text_chunk"),
            symbol_name=str(metadata.get("symbol_name")) if metadata.get("symbol_name") else None,
            start_line=int(metadata.get("start_line")) if metadata.get("start_line") is not None else None,
            end_line=int(metadata.get("end_line")) if metadata.get("end_line") is not None else None,
            source=str(metadata.get("source") or metadata.get("channel") or "langchain"),
            source_type=str(metadata.get("source_type")) if metadata.get("source_type") else None,
            tags=normalized_tags,
            document_id=str(metadata.get("document_id")) if metadata.get("document_id") else None,
            title=str(metadata.get("title")) if metadata.get("title") else None,
            repo_id=str(metadata.get("repo_id")) if metadata.get("repo_id") else None,
            source_id=str(metadata.get("source_id")) if metadata.get("source_id") else None,
            chunk_id=str(metadata.get("chunk_id")) if metadata.get("chunk_id") else None,
            document_version=str(metadata.get("document_version")) if metadata.get("document_version") else None,
            section_title=str(metadata.get("section_title")) if metadata.get("section_title") else None,
            retrieval_reason=str(metadata.get("retrieval_reason")) if metadata.get("retrieval_reason") else None,
            retriever_channel=str(metadata.get("retriever_channel")) if metadata.get("retriever_channel") else None,
            score_raw=float(metadata.get("score_raw")) if metadata.get("score_raw") is not None else None,
            score_final=float(metadata.get("score_final")) if metadata.get("score_final") is not None else None,
            collection_version=str(metadata.get("collection_version")) if metadata.get("collection_version") else None,
        )
        candidates.append(
            RetrievalCandidate(
                chunk=chunk,
                channel=str(metadata.get("channel") or chunk.source),
                raw_score=float(metadata.get("raw_score") or score),
                score=score,
            )
        )
    return candidates


def vector_hits_to_documents(hits: list[Any], *, source: str) -> list[Document]:
    if Document is None:
        raise RuntimeError("LangChain Document support is unavailable")
    documents: list[Document] = []
    for hit in hits:
        payload = getattr(hit, "payload", None) or {}
        content = str(payload.get("content") or payload.get("text") or "")
        path = str(payload.get("path") or payload.get("path_or_url") or payload.get("title") or payload.get("doc_id") or "")
        if not content or not path:
            continue
        score = float(getattr(hit, "score", 0.0) or 0.0)
        documents.append(
            Document(
                page_content=content,
                metadata={
                    "path": path,
                    "chunk_index": int(payload.get("chunk_index") or 0),
                    "language": str(payload.get("language") or payload.get("source_type") or "text"),
                    "token_count": int(payload.get("token_count") or max(1, len(content.split()))),
                    "file_type": str(payload.get("file_type") or payload.get("source_type") or "text"),
                    "chunk_type": str(payload.get("chunk_type") or "text_chunk"),
                    "symbol_name": str(payload.get("symbol_name")) if payload.get("symbol_name") else None,
                    "start_line": int(payload.get("start_line")) if payload.get("start_line") is not None else None,
                    "end_line": int(payload.get("end_line")) if payload.get("end_line") is not None else None,
                    "source": source,
                    "source_type": str(payload.get("source_type")) if payload.get("source_type") else None,
                    "tags": list(payload.get("tags")) if isinstance(payload.get("tags"), list) else [],
                    "document_id": str(payload.get("doc_id")) if payload.get("doc_id") else None,
                    "title": str(payload.get("title")) if payload.get("title") else None,
                    "repo_id": str(payload.get("repo_id")) if payload.get("repo_id") else None,
                    "source_id": str(payload.get("source_id")) if payload.get("source_id") else None,
                    "chunk_id": str(payload.get("chunk_id")) if payload.get("chunk_id") else None,
                    "document_version": str(payload.get("document_version")) if payload.get("document_version") else None,
                    "section_title": str(payload.get("section_title") or payload.get("title")) if (payload.get("section_title") or payload.get("title")) else None,
                    "retrieval_reason": f"semantic_match:{source}",
                    "retriever_channel": source,
                    "score_raw": score,
                    "score_final": score,
                    "collection_version": str(payload.get("collection_version")) if payload.get("collection_version") else None,
                    "channel": source,
                    "raw_score": score,
                    "score": score,
                },
            )
        )
    return documents
