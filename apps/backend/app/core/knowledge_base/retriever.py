from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from typing import Any

from app.core.knowledge_base.embeddings import hash_embed_text
from app.core.knowledge_base.ingestor import RepoContextIngestor
from app.core.review_engine.diff_engine import DiffParseError, parse_unified_diff
from app.integrations.vector_store.qdrant_client import QdrantClient
from app.settings import settings


@dataclass(frozen=True)
class RetrievedContextChunk:
    score: float
    path: str
    chunk_index: int
    language: str
    content: str
    token_count: int
    file_type: str = "text"
    chunk_type: str = "text_chunk"
    symbol_name: str | None = None
    start_line: int | None = None
    end_line: int | None = None
    source: str = "semantic"


@dataclass(frozen=True)
class DiffSignals:
    paths: list[str]
    symbols: list[str]
    added_lines: list[str]
    semantic_query: str


class RepoContextRetriever:
    def __init__(self, vector_store: QdrantClient) -> None:
        self._vector_store = vector_store
        self._collection = settings.QDRANT_REPO_CONTEXT_COLLECTION
        self._vector_size = settings.REPO_CONTEXT_VECTOR_SIZE
        self._ingestor = RepoContextIngestor(vector_store=vector_store)
        self._max_context_chars = 14_000
        self._max_chunks_per_file = 3

    async def get_repo_profile(self, repo_id: str) -> dict[str, Any] | None:
        return await self._ingestor.get_repo_profile(repo_id)

    async def retrieve_for_repo_bootstrap(
        self,
        *,
        repo_id: str,
        limit: int = 16,
    ) -> tuple[list[RetrievedContextChunk], dict[str, Any] | None]:
        """Auto-retrieval entrypoint for a newly indexed repo (no user question)."""
        self._vector_store.ensure_enabled()
        await self._vector_store.ensure_collection(collection_name=self._collection, vector_size=self._vector_size)

        seed_queries = [
            "repository architecture overview entry points main modules",
            "authentication authorization security middleware",
            "configuration environment variables deployment",
            "database models repositories migrations",
            "ci pipeline workflows quality checks",
        ]

        merged_hits: list[RetrievedContextChunk] = []
        for query in seed_queries:
            query_vector = hash_embed_text(query, vector_size=self._vector_size)
            hits = await self._vector_store.search(
                collection_name=self._collection,
                query_vector=query_vector,
                filter_payload={"repo_id": repo_id, "type": "chunk"},
                limit=max(limit, 8),
            )
            merged_hits.extend(_to_retrieved_chunks(hits, source="repo_bootstrap"))

        ranked = _rank_and_trim(
            chunks=merged_hits,
            limit=limit,
            max_context_chars=self._max_context_chars,
            max_chunks_per_file=self._max_chunks_per_file,
            mode="repo_bootstrap",
        )
        profile = await self._ingestor.get_repo_profile(repo_id)
        return ranked, profile

    async def retrieve_for_query(
        self,
        *,
        repo_id: str,
        query: str,
        changed_files: list[str] | None = None,
        limit: int = 8,
    ) -> tuple[list[RetrievedContextChunk], dict[str, Any] | None]:
        if limit < 1:
            limit = 1

        self._vector_store.ensure_enabled()
        await self._vector_store.ensure_collection(collection_name=self._collection, vector_size=self._vector_size)

        query_vector = hash_embed_text(query, vector_size=self._vector_size)
        code_hits = await self._vector_store.search(
            collection_name=self._collection,
            query_vector=query_vector,
            filter_payload={"repo_id": repo_id, "type": "chunk"},
            limit=limit * 6,
        )
        document_hits = await self._vector_store.search(
            collection_name=self._collection,
            query_vector=query_vector,
            filter_payload={"repo_id": repo_id, "type": "kb_document_chunk"},
            limit=limit * 4,
        )

        chunks = [
            *_to_retrieved_chunks(code_hits, source="semantic"),
            *_to_retrieved_chunks(document_hits, source="document"),
        ]
        changed_files_set = set(changed_files or [])
        if changed_files_set:
            chunks = [item for item in chunks if item.path in changed_files_set]

        ranked = _rank_and_trim(
            chunks=chunks,
            limit=limit,
            max_context_chars=self._max_context_chars,
            max_chunks_per_file=self._max_chunks_per_file,
            mode="query",
            changed_files=changed_files_set,
            symbols=set(),
        )
        profile = await self._ingestor.get_repo_profile(repo_id)
        return ranked, profile

    async def retrieve_for_diff(
        self,
        *,
        repo_id: str,
        diff_text: str,
        changed_files: list[str] | None = None,
        limit: int = 8,
    ) -> tuple[list[RetrievedContextChunk], dict[str, Any] | None]:
        if limit < 1:
            limit = 1

        self._vector_store.ensure_enabled()
        await self._vector_store.ensure_collection(collection_name=self._collection, vector_size=self._vector_size)

        signals = _extract_diff_signals(diff_text)
        inferred_files = sorted(set(changed_files or signals.paths))
        symbols = set(signals.symbols)

        exact_chunks = await self._retrieve_exact_file_chunks(repo_id=repo_id, paths=inferred_files, per_file_limit=8)
        symbol_chunks = await self._retrieve_symbol_chunks(repo_id=repo_id, symbols=symbols, per_symbol_limit=4)
        semantic_chunks = await self._retrieve_semantic_chunks(repo_id=repo_id, query_text=signals.semantic_query, limit=limit * 4)
        test_chunks = await self._retrieve_related_tests(repo_id=repo_id, changed_files=inferred_files, limit=max(4, limit))

        merged = [*exact_chunks, *symbol_chunks, *semantic_chunks, *test_chunks]
        ranked = _rank_and_trim(
            chunks=merged,
            limit=limit,
            max_context_chars=self._max_context_chars,
            max_chunks_per_file=self._max_chunks_per_file,
            mode="diff",
            changed_files=set(inferred_files),
            symbols=symbols,
        )
        profile = await self._ingestor.get_repo_profile(repo_id)
        return ranked, profile

    async def _retrieve_exact_file_chunks(
        self,
        *,
        repo_id: str,
        paths: list[str],
        per_file_limit: int,
    ) -> list[RetrievedContextChunk]:
        chunks: list[RetrievedContextChunk] = []
        for path in paths:
            hits = await self._vector_store.scroll(
                collection_name=self._collection,
                limit=per_file_limit,
                filter_payload={"repo_id": repo_id, "type": "chunk", "path": path},
            )
            chunks.extend(_to_retrieved_chunks(hits, source="file_exact", fallback_score=1.0))
        return chunks

    async def _retrieve_symbol_chunks(
        self,
        *,
        repo_id: str,
        symbols: set[str],
        per_symbol_limit: int,
    ) -> list[RetrievedContextChunk]:
        chunks: list[RetrievedContextChunk] = []
        for symbol in symbols:
            hits = await self._vector_store.scroll(
                collection_name=self._collection,
                limit=per_symbol_limit,
                filter_payload={"repo_id": repo_id, "type": "chunk", "symbol_name": symbol},
            )
            chunks.extend(_to_retrieved_chunks(hits, source="symbol_exact", fallback_score=0.95))
        return chunks

    async def _retrieve_semantic_chunks(
        self,
        *,
        repo_id: str,
        query_text: str,
        limit: int,
    ) -> list[RetrievedContextChunk]:
        query_vector = hash_embed_text(query_text, vector_size=self._vector_size)
        hits = await self._vector_store.search(
            collection_name=self._collection,
            query_vector=query_vector,
            filter_payload={"repo_id": repo_id, "type": "chunk"},
            limit=limit,
        )
        return _to_retrieved_chunks(hits, source="semantic")

    async def _retrieve_related_tests(
        self,
        *,
        repo_id: str,
        changed_files: list[str],
        limit: int,
    ) -> list[RetrievedContextChunk]:
        if not changed_files:
            return []

        test_query = _build_related_tests_query(changed_files)
        query_vector = hash_embed_text(test_query, vector_size=self._vector_size)
        hits = await self._vector_store.search(
            collection_name=self._collection,
            query_vector=query_vector,
            filter_payload={"repo_id": repo_id, "type": "chunk"},
            limit=limit * 3,
        )
        candidates = _to_retrieved_chunks(hits, source="test_related")
        filtered = [item for item in candidates if _is_probably_test_path(item.path, item.file_type)]
        return filtered[:limit]


def retrieve(query: str) -> list[str]:
    _ = query
    return []


def build_llm_context(chunks: list[RetrievedContextChunk]) -> str:
    if not chunks:
        return "[NO_CONTEXT_AVAILABLE]"

    sections: list[str] = []
    for item in chunks:
        location = ""
        if item.start_line is not None and item.end_line is not None:
            location = f"Lines {item.start_line}-{item.end_line}"
        elif item.start_line is not None:
            location = f"Line {item.start_line}"

        header_parts = [f"[FILE: {item.path}]"]
        if location:
            header_parts.append(location)
        if item.chunk_type:
            header_parts.append(f"type={item.chunk_type}")
        if item.symbol_name:
            header_parts.append(f"symbol={item.symbol_name}")

        sections.append("\n".join([" | ".join(header_parts), item.content.strip()]))
    return "\n\n".join(sections)


def _extract_paths_from_diff(diff_text: str) -> list[str]:
    try:
        parsed = parse_unified_diff(diff_text)
        paths = [item.path_new for item in parsed.files if item.path_new]
        return sorted(set(path for path in paths if path))
    except DiffParseError:
        paths: list[str] = []
        for line in diff_text.splitlines():
            if not line.startswith("diff --git a/"):
                continue
            right = line.split(" b/", maxsplit=1)
            if len(right) != 2:
                continue
            candidate = right[1].strip()
            if candidate:
                paths.append(candidate)
        return sorted(set(paths))


def _extract_diff_signals(diff_text: str) -> DiffSignals:
    paths = _extract_paths_from_diff(diff_text)
    symbols = _extract_symbols_from_diff(diff_text)
    added_lines = _extract_added_lines_from_diff(diff_text)
    semantic_query = _build_query_from_diff(
        diff_text=diff_text,
        changed_files=paths,
        symbols=symbols,
        added_lines=added_lines,
    )
    return DiffSignals(paths=paths, symbols=symbols, added_lines=added_lines, semantic_query=semantic_query)


def _extract_symbols_from_diff(diff_text: str) -> list[str]:
    patterns = [
        re.compile(r"^\+\s*def\s+([A-Za-z_]\w*)\s*\("),
        re.compile(r"^\+\s*class\s+([A-Za-z_]\w*)"),
        re.compile(r"^\+\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_]\w*)\s*\("),
        re.compile(r"^\+\s*(?:export\s+)?class\s+([A-Za-z_]\w*)"),
        re.compile(r"^\+\s*func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)\s*\("),
        re.compile(r"^\+\s*(?:pub\s+)?fn\s+([A-Za-z_]\w*)\s*\("),
    ]
    symbols: list[str] = []
    for line in diff_text.splitlines():
        if not line.startswith("+") or line.startswith("+++"):
            continue
        for pattern in patterns:
            match = pattern.match(line)
            if match:
                symbols.append(match.group(1))
                break
    return sorted(set(symbols))


def _extract_added_lines_from_diff(diff_text: str, *, max_lines: int = 200) -> list[str]:
    cleaned: list[str] = []
    for line in diff_text.splitlines():
        if not line.startswith("+") or line.startswith("+++"):
            continue
        body = line[1:].strip()
        if not body:
            continue
        body = re.sub(r"//.*$", "", body).strip()
        body = re.sub(r"#.*$", "", body).strip()
        if not body:
            continue
        cleaned.append(body)
        if len(cleaned) >= max_lines:
            break
    return cleaned


def _build_query_from_diff(
    *,
    diff_text: str,
    changed_files: list[str],
    symbols: list[str] | None = None,
    added_lines: list[str] | None = None,
) -> str:
    file_hint = ", ".join(changed_files[:20])
    symbol_hint = ", ".join((symbols or [])[:20])
    added_excerpt = "\n".join((added_lines or [])[:60])[:2500]
    diff_excerpt = diff_text[:1600]
    return (
        "Repository diff context request (impact analysis).\n"
        f"Changed files: {file_hint}\n"
        f"Changed symbols: {symbol_hint}\n"
        "Added code excerpt:\n"
        f"{added_excerpt}\n"
        "Raw diff excerpt:\n"
        f"{diff_excerpt}"
    )


def _build_related_tests_query(changed_files: list[str]) -> str:
    seeds: list[str] = []
    for path in changed_files:
        parts = path.split("/")
        filename = parts[-1] if parts else path
        stem = filename.rsplit(".", maxsplit=1)[0]
        if stem:
            seeds.append(f"test {stem}")
        if parts:
            seeds.append(" ".join(parts[-3:]))
    return "related unit tests integration tests " + " ".join(seeds[:20])


def _to_retrieved_chunks(hits: list[Any], *, source: str, fallback_score: float = 0.0) -> list[RetrievedContextChunk]:
    chunks: list[RetrievedContextChunk] = []
    for hit in hits:
        payload = getattr(hit, "payload", None) or {}
        path = str(payload.get("path") or payload.get("path_or_url") or payload.get("title") or payload.get("doc_id") or "")
        content = str(payload.get("content") or payload.get("text") or "")
        if not path or not content:
            continue
        score = float(getattr(hit, "score", fallback_score) or fallback_score)
        token_count = _as_optional_int(payload.get("token_count"))
        chunks.append(
            RetrievedContextChunk(
                score=score,
                path=path,
                chunk_index=int(payload.get("chunk_index") or 0),
                language=str(payload.get("language") or payload.get("source_type") or "text"),
                content=content,
                token_count=token_count if token_count is not None else max(1, len(content) // 4),
                file_type=str(payload.get("file_type") or payload.get("source_type") or "text"),
                chunk_type=str(payload.get("chunk_type") or "text_chunk"),
                symbol_name=_as_optional_str(payload.get("symbol_name")),
                start_line=_as_optional_int(payload.get("start_line")),
                end_line=_as_optional_int(payload.get("end_line")),
                source=source,
            )
        )
    return chunks


def _rank_and_trim(
    *,
    chunks: list[RetrievedContextChunk],
    limit: int,
    max_context_chars: int,
    max_chunks_per_file: int,
    mode: str,
    changed_files: set[str] | None = None,
    symbols: set[str] | None = None,
) -> list[RetrievedContextChunk]:
    if not chunks:
        return []

    changed_files = changed_files or set()
    symbols = symbols or set()
    deduped: dict[str, RetrievedContextChunk] = {}
    for item in chunks:
        key = _dedup_key(item)
        previous = deduped.get(key)
        if previous is None or item.score > previous.score:
            deduped[key] = item

    scored: list[tuple[float, RetrievedContextChunk]] = []
    for item in deduped.values():
        bonus = 0.0
        source_weight = {
            "file_exact": 3.0,
            "symbol_exact": 2.2,
            "test_related": 1.6,
            "semantic": 1.2,
            "repo_bootstrap": 1.0,
        }.get(item.source, 1.0)
        bonus += source_weight

        if mode == "diff":
            if item.path in changed_files:
                bonus += 2.5
            if item.symbol_name and item.symbol_name in symbols:
                bonus += 2.0
            if item.file_type == "test":
                bonus += 0.7
            if item.chunk_type in {"function", "class", "test_case"}:
                bonus += 0.4
        elif mode == "repo_bootstrap":
            if _is_key_repo_file(item.path):
                bonus += 2.0
            if item.file_type == "test":
                bonus -= 0.6
            if item.chunk_type in {"class", "function", "config_section", "infra_block"}:
                bonus += 0.5

        scored.append((item.score + bonus, item))

    scored.sort(key=lambda pair: pair[0], reverse=True)

    result: list[RetrievedContextChunk] = []
    by_file: dict[str, int] = {}
    total_chars = 0
    for _, item in scored:
        current_count = by_file.get(item.path, 0)
        if current_count >= max_chunks_per_file:
            continue
        projected = total_chars + len(item.content)
        if projected > max_context_chars and result:
            continue
        result.append(item)
        by_file[item.path] = current_count + 1
        total_chars = projected
        if len(result) >= limit:
            break
    return result


def _is_probably_test_path(path: str, file_type: str) -> bool:
    lower_path = path.lower()
    if file_type == "test":
        return True
    if "/tests/" in lower_path or "/test/" in lower_path or "__tests__" in lower_path:
        return True
    filename = lower_path.rsplit("/", maxsplit=1)[-1]
    return filename.startswith("test_") or filename.endswith("_test.py") or filename.endswith(".spec.ts")


def _is_key_repo_file(path: str) -> bool:
    lower = path.lower()
    key_names = (
        "readme.md",
        "docker-compose.yml",
        "dockerfile",
        "pyproject.toml",
        "package.json",
        "go.mod",
        "cargo.toml",
        "pom.xml",
        "app/main.py",
        "src/main.ts",
        "main.py",
        "main.ts",
    )
    return any(lower.endswith(name) for name in key_names)


def _dedup_key(item: RetrievedContextChunk) -> str:
    anchor = f"{item.path}:{item.start_line}:{item.end_line}:{item.chunk_index}:{item.chunk_type}"
    digest = hashlib.sha1(item.content.encode("utf-8")).hexdigest()[:12]
    return f"{anchor}:{digest}"


def _as_optional_str(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    normalized = value.strip()
    return normalized or None


def _as_optional_int(value: Any) -> int | None:
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None
