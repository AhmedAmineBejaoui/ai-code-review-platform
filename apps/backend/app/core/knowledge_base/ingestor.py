from __future__ import annotations

import ast
import hashlib
import json
import re
import subprocess
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterable

from app.core.knowledge_base.embeddings import hash_embed_text
from app.core.knowledge_base.guardrails import (
    iter_repo_files,
    normalize_repo_id,
    resolve_repo_path,
    should_index_path,
    to_posix_relative,
    validate_allowed_roots,
)
from app.data.repos.repo_context_chunks_repo import RepoContextChunkWrite, RepoContextChunksRepo
from app.integrations.vector_store.qdrant_client import QdrantClient, QdrantPoint
from app.settings import settings

_LANGUAGE_BY_SUFFIX: dict[str, str] = {
    ".py": "python",
    ".pyi": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".vue": "vue",
    ".svelte": "svelte",
    ".go": "go",
    ".java": "java",
    ".kt": "kotlin",
    ".scala": "scala",
    ".rs": "rust",
    ".rb": "ruby",
    ".php": "php",
    ".c": "c",
    ".h": "c",
    ".cpp": "cpp",
    ".hpp": "cpp",
    ".cs": "csharp",
    ".swift": "swift",
    ".m": "objective-c",
    ".mm": "objective-cpp",
    ".dart": "dart",
    ".md": "markdown",
    ".mdx": "markdown",
    ".rst": "rst",
    ".txt": "text",
    ".sql": "sql",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".json": "json",
    ".toml": "toml",
    ".ini": "ini",
    ".cfg": "config",
    ".conf": "config",
    ".env.example": "dotenv",
    ".tf": "terraform",
    ".hcl": "hcl",
    ".sh": "bash",
    ".ps1": "powershell",
    ".bat": "batch",
    ".xml": "xml",
    ".feature": "gherkin",
    ".diff": "diff",
    ".patch": "diff",
}

_DOC_SUFFIXES = {".md", ".mdx", ".rst", ".txt"}
_CONFIG_SUFFIXES = {".yaml", ".yml", ".json", ".toml", ".ini", ".cfg", ".conf", ".env.example", ".xml"}
_SCRIPT_SUFFIXES = {".sh", ".ps1", ".bat"}
_SQL_SUFFIXES = {".sql"}
_DIFF_SUFFIXES = {".diff", ".patch"}
_INFRA_SUFFIXES = {".tf", ".hcl"}
_CODE_SUFFIXES = {
    ".py",
    ".pyi",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".go",
    ".java",
    ".kt",
    ".scala",
    ".rs",
    ".rb",
    ".php",
    ".c",
    ".h",
    ".cpp",
    ".hpp",
    ".cs",
    ".swift",
    ".m",
    ".mm",
    ".dart",
    ".vue",
    ".svelte",
}

_DEPENDENCY_FILENAMES = {
    "package.json",
    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
    "requirements.txt",
    "requirements-dev.txt",
    "poetry.lock",
    "pyproject.toml",
    "go.mod",
    "go.sum",
    "cargo.toml",
    "cargo.lock",
    "pom.xml",
    "build.gradle",
    "build.gradle.kts",
    "composer.json",
    "composer.lock",
    "gemfile",
    "gemfile.lock",
}

_CI_FILENAMES = {
    ".gitlab-ci.yml",
    "azure-pipelines.yml",
    "azure-pipelines.yaml",
    "buildkite.yml",
    "buildkite.yaml",
    "circle.yml",
    "drone.yml",
    "drone.yaml",
}

_CI_PATH_HINTS = (".github/workflows/", ".circleci/", ".gitlab/")
_MIGRATION_PATH_HINTS = ("migrations/", "alembic/versions/", "db/migrate/")
_TEST_PATH_HINTS = ("tests/", "test/", "__tests__/", "spec/")
_ADR_PATH_HINTS = ("docs/adr/", "adr/")

_GENERIC_SYMBOL_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"^\s*(?:export\s+)?class\s+([A-Za-z_]\w*)"), "class"),
    (re.compile(r"^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_]\w*)"), "function"),
    (re.compile(r"^\s*func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)\s*\("), "function"),
    (re.compile(r"^\s*(?:pub\s+)?fn\s+([A-Za-z_]\w*)\s*\("), "function"),
    (
        re.compile(
            r"^\s*(?:public|private|protected|internal|static|final|virtual|override|\s)+\s*"
            r"[A-Za-z_<>\[\], ?]+\s+([A-Za-z_]\w*)\s*\([^;]*\)\s*\{?"
        ),
        "function",
    ),
)


@dataclass(frozen=True)
class RepoIndexResult:
    repo_id: str
    repo_path: str
    mode: str
    collection_name: str
    indexed_commit: str | None
    default_branch: str | None
    files_seen: int
    files_indexed: int
    chunks_upserted: int
    chunks_deleted: int
    changed_files: list[str]
    started_at: str
    completed_at: str


@dataclass(frozen=True)
class ChunkRecord:
    content: str
    chunk_type: str
    start_line: int
    end_line: int
    symbol_name: str | None = None


@dataclass(frozen=True)
class ChunkingResult:
    file_type: str
    chunks: list[ChunkRecord]


class RepoContextIngestor:
    def __init__(self, vector_store: QdrantClient) -> None:
        self._vector_store = vector_store
        self._repo_context_chunks_repo = RepoContextChunksRepo()
        self._collection = settings.QDRANT_REPO_CONTEXT_COLLECTION
        self._vector_size = settings.REPO_CONTEXT_VECTOR_SIZE
        self._chunk_size = settings.REPO_CONTEXT_CHUNK_SIZE
        self._chunk_overlap = settings.REPO_CONTEXT_CHUNK_OVERLAP
        self._batch_size = 256

    async def onboard_repo(
        self,
        *,
        repo_id: str,
        repo_path: str,
        source: str = "manual",
        force_full: bool = False,
    ) -> RepoIndexResult:
        _ = source
        _ = force_full
        self._vector_store.ensure_enabled()

        repo_key = normalize_repo_id(repo_id)
        root = resolve_repo_path(repo_path)
        validate_allowed_roots(root)

        started_at = _utc_now()
        indexed_commit = self._safe_git_head(root)
        default_branch = self._safe_git_branch(root)

        files = iter_repo_files(root)
        await self._vector_store.ensure_collection(collection_name=self._collection, vector_size=self._vector_size)
        await self._vector_store.delete_by_filter(collection_name=self._collection, filter_payload={"repo_id": repo_key})

        points: list[QdrantPoint] = []
        sql_rows: list[RepoContextChunkWrite] = []
        files_indexed = 0
        file_type_distribution: dict[str, int] = {}
        self._repo_context_chunks_repo.delete_repo(repo_key)
        for file_path in files:
            relative_path = to_posix_relative(root, file_path)
            chunking = self._file_to_chunks(file_path)
            if not chunking.chunks:
                continue

            language = _guess_language(relative_path)
            file_type_distribution[chunking.file_type] = file_type_distribution.get(chunking.file_type, 0) + 1
            for chunk_index, chunk in enumerate(chunking.chunks):
                point = self._build_chunk_point(
                    repo_id=repo_key,
                    relative_path=relative_path,
                    chunk_index=chunk_index,
                    language=language,
                    file_type=chunking.file_type,
                    chunk=chunk,
                    indexed_commit=indexed_commit,
                )
                points.append(point)
                sql_rows.append(self._build_sql_chunk_row(point))
            files_indexed += 1

        await self._upsert_in_batches(points)
        self._repo_context_chunks_repo.upsert_chunks(sql_rows)

        profile_payload = self._build_repo_profile_payload(
            repo_id=repo_key,
            root=root,
            indexed_commit=indexed_commit,
            default_branch=default_branch,
            files_seen=len(files),
            files_indexed=files_indexed,
            file_type_distribution=file_type_distribution,
        )
        profile_point = self._build_profile_point(repo_id=repo_key, payload=profile_payload)
        await self._vector_store.upsert_points(collection_name=self._collection, points=[profile_point])

        completed_at = _utc_now()
        return RepoIndexResult(
            repo_id=repo_key,
            repo_path=str(root),
            mode="full",
            collection_name=self._collection,
            indexed_commit=indexed_commit,
            default_branch=default_branch,
            files_seen=len(files),
            files_indexed=files_indexed,
            chunks_upserted=len(points),
            chunks_deleted=0,
            changed_files=[],
            started_at=started_at,
            completed_at=completed_at,
        )

    async def update_repo_incremental(
        self,
        *,
        repo_id: str,
        repo_path: str,
        base_ref: str | None = None,
        head_ref: str = "HEAD",
        source: str = "manual",
    ) -> RepoIndexResult:
        _ = source
        self._vector_store.ensure_enabled()

        repo_key = normalize_repo_id(repo_id)
        root = resolve_repo_path(repo_path)
        validate_allowed_roots(root)
        started_at = _utc_now()

        profile = await self.get_repo_profile(repo_key)
        inferred_base = base_ref or _as_non_empty_str(profile.get("indexed_commit") if profile else None)

        if inferred_base is None:
            return await self.onboard_repo(repo_id=repo_key, repo_path=str(root), source=source, force_full=True)

        changed_files = self._git_changed_files(root, base_ref=inferred_base, head_ref=head_ref)
        if not changed_files:
            completed_at = _utc_now()
            return RepoIndexResult(
                repo_id=repo_key,
                repo_path=str(root),
                mode="incremental",
                collection_name=self._collection,
                indexed_commit=self._safe_git_head(root),
                default_branch=self._safe_git_branch(root),
                files_seen=0,
                files_indexed=0,
                chunks_upserted=0,
                chunks_deleted=0,
                changed_files=[],
                started_at=started_at,
                completed_at=completed_at,
            )

        await self._vector_store.ensure_collection(collection_name=self._collection, vector_size=self._vector_size)

        points_to_upsert: list[QdrantPoint] = []
        sql_rows_to_upsert: list[RepoContextChunkWrite] = []
        chunks_deleted = 0
        files_indexed = 0
        file_type_distribution: dict[str, int] = {}
        indexed_commit = self._safe_git_head(root)
        self._repo_context_chunks_repo.delete_repo_paths(repo_key, changed_files)
        for relative_path in changed_files:
            await self._vector_store.delete_by_filter(
                collection_name=self._collection,
                filter_payload={"repo_id": repo_key, "type": "chunk", "path": relative_path},
            )
            chunks_deleted += 1

            abs_path = root / Path(relative_path)
            if not abs_path.exists() or not abs_path.is_file():
                continue
            if not should_index_path(abs_path):
                continue
            if abs_path.stat().st_size > settings.REPO_CONTEXT_MAX_FILE_BYTES:
                continue

            chunking = self._file_to_chunks(abs_path)
            if not chunking.chunks:
                continue

            language = _guess_language(relative_path)
            file_type_distribution[chunking.file_type] = file_type_distribution.get(chunking.file_type, 0) + 1
            for chunk_index, chunk in enumerate(chunking.chunks):
                point = self._build_chunk_point(
                    repo_id=repo_key,
                    relative_path=relative_path,
                    chunk_index=chunk_index,
                    language=language,
                    file_type=chunking.file_type,
                    chunk=chunk,
                    indexed_commit=indexed_commit,
                )
                points_to_upsert.append(point)
                sql_rows_to_upsert.append(self._build_sql_chunk_row(point))
            files_indexed += 1

        await self._upsert_in_batches(points_to_upsert)
        self._repo_context_chunks_repo.upsert_chunks(sql_rows_to_upsert)

        default_branch = self._safe_git_branch(root)
        profile_payload = self._build_repo_profile_payload(
            repo_id=repo_key,
            root=root,
            indexed_commit=indexed_commit,
            default_branch=default_branch,
            files_seen=len(changed_files),
            files_indexed=files_indexed,
            update_base=inferred_base,
            update_head=head_ref,
            file_type_distribution=file_type_distribution,
        )
        profile_point = self._build_profile_point(repo_id=repo_key, payload=profile_payload)
        await self._vector_store.upsert_points(collection_name=self._collection, points=[profile_point])

        completed_at = _utc_now()
        return RepoIndexResult(
            repo_id=repo_key,
            repo_path=str(root),
            mode="incremental",
            collection_name=self._collection,
            indexed_commit=indexed_commit,
            default_branch=default_branch,
            files_seen=len(changed_files),
            files_indexed=files_indexed,
            chunks_upserted=len(points_to_upsert),
            chunks_deleted=chunks_deleted,
            changed_files=changed_files,
            started_at=started_at,
            completed_at=completed_at,
        )

    async def get_repo_profile(self, repo_id: str) -> dict[str, Any] | None:
        self._vector_store.ensure_enabled()
        repo_key = normalize_repo_id(repo_id)
        await self._vector_store.ensure_collection(collection_name=self._collection, vector_size=self._vector_size)
        points = await self._vector_store.scroll(
            collection_name=self._collection,
            limit=1,
            filter_payload={"repo_id": repo_key, "type": "repo_profile"},
        )
        if not points:
            return None

        payload = getattr(points[0], "payload", None)
        if not isinstance(payload, dict):
            return None
        return payload

    async def _upsert_in_batches(self, points: list[QdrantPoint]) -> None:
        if not points:
            return
        for start in range(0, len(points), self._batch_size):
            batch = points[start : start + self._batch_size]
            await self._vector_store.upsert_points(collection_name=self._collection, points=batch)

    def _file_to_chunks(self, file_path: Path) -> ChunkingResult:
        try:
            text = file_path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            return ChunkingResult(file_type="text", chunks=[])
        if not text.strip():
            return ChunkingResult(file_type="text", chunks=[])

        file_type = _classify_file_type(file_path)
        if file_type == "code":
            chunks = self._chunk_code(file_path=file_path, text=text)
        elif file_type == "test":
            chunks = self._chunk_tests(file_path=file_path, text=text)
        elif file_type in {"docs", "adr"}:
            chunks = self._chunk_docs(text=text, chunk_type="adr_paragraph" if file_type == "adr" else "paragraph")
        elif file_type in {"config", "infra", "ci"}:
            chunks = self._chunk_config(file_path=file_path, text=text, file_type=file_type)
        elif file_type == "migration":
            chunks = self._chunk_migration(file_path=file_path, text=text)
        elif file_type == "dependency":
            chunks = self._chunk_dependency(file_path=file_path, text=text)
        elif file_type == "diff":
            chunks = self._chunk_diff(text=text)
        elif file_type == "script":
            chunks = self._chunk_script(text=text)
        else:
            chunks = self._chunk_fixed(text=text, chunk_type="text_chunk", start_line=1)

        normalized: list[ChunkRecord] = []
        for chunk in chunks:
            content = chunk.content.strip()
            if not content:
                continue
            normalized.extend(self._fit_chunk_size(chunk))
        return ChunkingResult(file_type=file_type, chunks=normalized)

    def _fit_chunk_size(self, chunk: ChunkRecord) -> list[ChunkRecord]:
        if len(chunk.content) <= self._chunk_size:
            return [chunk]

        sub_chunks: list[ChunkRecord] = []
        split_items = _split_text_with_line_ranges(
            chunk.content,
            chunk_size=self._chunk_size,
            overlap=self._chunk_overlap,
            base_start_line=chunk.start_line,
        )
        for item in split_items:
            sub_chunks.append(
                ChunkRecord(
                    content=item.content,
                    chunk_type=chunk.chunk_type,
                    start_line=item.start_line,
                    end_line=item.end_line,
                    symbol_name=chunk.symbol_name,
                )
            )
        return sub_chunks

    def _chunk_code(self, *, file_path: Path, text: str) -> list[ChunkRecord]:
        language = _guess_language(file_path.as_posix())
        if language == "python":
            python_chunks = self._chunk_python(text=text)
            if python_chunks:
                return python_chunks
        generic_chunks = self._chunk_generic_symbols(text=text)
        if generic_chunks:
            return generic_chunks
        return self._chunk_fixed(text=text, chunk_type="code_block", start_line=1)

    def _chunk_tests(self, *, file_path: Path, text: str) -> list[ChunkRecord]:
        chunks = self._chunk_code(file_path=file_path, text=text)
        if not chunks:
            return []

        normalized: list[ChunkRecord] = []
        for item in chunks:
            symbol = (item.symbol_name or "").lower()
            is_test = symbol.startswith("test") or "spec" in symbol or "test(" in item.content
            normalized.append(
                ChunkRecord(
                    content=item.content,
                    chunk_type="test_case" if is_test else "test_block",
                    start_line=item.start_line,
                    end_line=item.end_line,
                    symbol_name=item.symbol_name,
                )
            )
        return normalized

    def _chunk_docs(self, *, text: str, chunk_type: str) -> list[ChunkRecord]:
        lines = text.replace("\r\n", "\n").split("\n")
        if not lines:
            return []

        chunks: list[ChunkRecord] = []
        current_section = "Document"
        paragraph_lines: list[str] = []
        paragraph_start = 1

        def flush_paragraph(end_line: int) -> None:
            nonlocal paragraph_lines
            if not paragraph_lines:
                return
            body = "\n".join(paragraph_lines).strip()
            if not body:
                paragraph_lines = []
                return
            content = f"{current_section}\n{body}" if current_section else body
            chunks.append(
                ChunkRecord(
                    content=content,
                    chunk_type=chunk_type,
                    start_line=paragraph_start,
                    end_line=max(end_line, paragraph_start),
                    symbol_name=current_section if current_section != "Document" else None,
                )
            )
            paragraph_lines = []

        for line_no, line in enumerate(lines, start=1):
            stripped = line.strip()
            if stripped.startswith("#"):
                flush_paragraph(line_no - 1)
                current_section = stripped
                paragraph_start = line_no + 1
                continue
            if not stripped:
                flush_paragraph(line_no - 1)
                paragraph_start = line_no + 1
                continue
            if not paragraph_lines:
                paragraph_start = line_no
            paragraph_lines.append(line)

        flush_paragraph(len(lines))
        if chunks:
            return chunks
        return self._chunk_fixed(text=text, chunk_type=chunk_type, start_line=1)

    def _chunk_config(self, *, file_path: Path, text: str, file_type: str) -> list[ChunkRecord]:
        suffix = _extract_suffix(file_path)
        chunk_type = "config_section"
        if file_type == "infra":
            chunk_type = "infra_block"
        elif file_type == "ci":
            chunk_type = "ci_block"

        if suffix == ".json":
            try:
                parsed = json.loads(text)
            except json.JSONDecodeError:
                parsed = None
            if isinstance(parsed, dict):
                lines = text.replace("\r\n", "\n").split("\n")
                chunks: list[ChunkRecord] = []
                for key, value in parsed.items():
                    content = json.dumps({key: value}, ensure_ascii=False, indent=2)
                    start_line = _find_line_for_token(lines, f'"{key}"')
                    chunks.append(
                        ChunkRecord(
                            content=content,
                            chunk_type=chunk_type,
                            start_line=start_line,
                            end_line=start_line + max(content.count("\n"), 0),
                            symbol_name=str(key),
                        )
                    )
                if chunks:
                    return chunks

        lines = text.replace("\r\n", "\n").split("\n")
        headers: list[tuple[int, str]] = []
        for line_no, line in enumerate(lines, start=1):
            stripped = line.strip()
            if not stripped:
                continue
            if suffix in {".toml", ".ini", ".cfg", ".conf"} and stripped.startswith("[") and stripped.endswith("]"):
                headers.append((line_no, stripped))
                continue
            if re.match(r"^[A-Za-z0-9_.-]+\s*:\s*", line):
                headers.append((line_no, stripped.split(":", maxsplit=1)[0].strip()))

        if headers:
            return _chunk_by_headers(lines=lines, headers=headers, chunk_type=chunk_type)
        return self._chunk_fixed(text=text, chunk_type=chunk_type, start_line=1)

    def _chunk_migration(self, *, file_path: Path, text: str) -> list[ChunkRecord]:
        suffix = _extract_suffix(file_path)
        if suffix in _SQL_SUFFIXES:
            return self._chunk_sql_statements(text=text)
        return self._chunk_code(file_path=file_path, text=text)

    def _chunk_dependency(self, *, file_path: Path, text: str) -> list[ChunkRecord]:
        name = file_path.name.lower()
        if name == "package.json":
            try:
                parsed = json.loads(text)
            except json.JSONDecodeError:
                parsed = None
            if isinstance(parsed, dict):
                chunks: list[ChunkRecord] = []
                for section in ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies"):
                    values = parsed.get(section)
                    if isinstance(values, dict) and values:
                        content = json.dumps({section: values}, ensure_ascii=False, indent=2)
                        chunks.append(
                            ChunkRecord(
                                content=content,
                                chunk_type="dependency_group",
                                start_line=1,
                                end_line=1 + max(content.count("\n"), 0),
                                symbol_name=section,
                            )
                        )
                if chunks:
                    return chunks
        return self._chunk_fixed(text=text, chunk_type="dependency_block", start_line=1)

    def _chunk_diff(self, *, text: str) -> list[ChunkRecord]:
        lines = text.replace("\r\n", "\n").split("\n")
        headers: list[tuple[int, str]] = []
        for line_no, line in enumerate(lines, start=1):
            if line.startswith("@@"):
                headers.append((line_no, line.strip()))
        if headers:
            return _chunk_by_headers(lines=lines, headers=headers, chunk_type="diff_hunk")
        return self._chunk_fixed(text=text, chunk_type="diff_block", start_line=1)

    def _chunk_script(self, *, text: str) -> list[ChunkRecord]:
        lines = text.replace("\r\n", "\n").split("\n")
        headers: list[tuple[int, str]] = []
        for line_no, line in enumerate(lines, start=1):
            bash_match = re.match(r"^\s*(?:function\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(\)\s*\{", line)
            ps_match = re.match(r"^\s*function\s+([A-Za-z_][A-Za-z0-9_-]*)", line, flags=re.IGNORECASE)
            if bash_match:
                headers.append((line_no, bash_match.group(1)))
            elif ps_match:
                headers.append((line_no, ps_match.group(1)))
        if headers:
            return _chunk_by_headers(lines=lines, headers=headers, chunk_type="script_function")
        return self._chunk_fixed(text=text, chunk_type="script_block", start_line=1)

    def _chunk_python(self, *, text: str) -> list[ChunkRecord]:
        try:
            tree = ast.parse(text)
        except SyntaxError:
            return []

        lines = text.replace("\r\n", "\n").split("\n")
        nodes: list[ast.AST] = []
        for node in tree.body:
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                nodes.append(node)
        nodes.sort(key=lambda item: int(getattr(item, "lineno", 1)))
        if not nodes:
            return []

        chunks: list[ChunkRecord] = []
        first_line = int(getattr(nodes[0], "lineno", 1))
        if first_line > 1:
            preamble = "\n".join(lines[: first_line - 1]).strip()
            if preamble:
                chunks.append(
                    ChunkRecord(
                        content=preamble,
                        chunk_type="module_preamble",
                        start_line=1,
                        end_line=first_line - 1,
                    )
                )

        for node in nodes:
            start_line = int(getattr(node, "lineno", 1))
            end_line = int(getattr(node, "end_lineno", start_line))
            snippet = "\n".join(lines[start_line - 1 : end_line]).strip()
            if not snippet:
                continue
            chunk_type = "class" if isinstance(node, ast.ClassDef) else "function"
            symbol_name = getattr(node, "name", None)
            chunks.append(
                ChunkRecord(
                    content=snippet,
                    chunk_type=chunk_type,
                    start_line=start_line,
                    end_line=end_line,
                    symbol_name=symbol_name,
                )
            )

        last_line = int(getattr(nodes[-1], "end_lineno", len(lines)))
        if last_line < len(lines):
            tail = "\n".join(lines[last_line:]).strip()
            if tail:
                chunks.append(
                    ChunkRecord(
                        content=tail,
                        chunk_type="module_tail",
                        start_line=last_line + 1,
                        end_line=len(lines),
                    )
                )
        return chunks

    def _chunk_generic_symbols(self, *, text: str) -> list[ChunkRecord]:
        lines = text.replace("\r\n", "\n").split("\n")
        headers: list[tuple[int, str, str]] = []
        for line_no, line in enumerate(lines, start=1):
            for pattern, kind in _GENERIC_SYMBOL_PATTERNS:
                match = pattern.match(line)
                if not match:
                    continue
                symbol_name = match.group(1)
                headers.append((line_no, symbol_name, kind))
                break
        if not headers:
            return []

        chunks: list[ChunkRecord] = []
        first_line = headers[0][0]
        if first_line > 1:
            preamble = "\n".join(lines[: first_line - 1]).strip()
            if preamble:
                chunks.append(
                    ChunkRecord(
                        content=preamble,
                        chunk_type="module_preamble",
                        start_line=1,
                        end_line=first_line - 1,
                    )
                )

        for index, (start, symbol_name, kind) in enumerate(headers):
            next_start = headers[index + 1][0] if index + 1 < len(headers) else len(lines) + 1
            end = max(start, next_start - 1)
            snippet = "\n".join(lines[start - 1 : end]).strip()
            if not snippet:
                continue
            chunks.append(
                ChunkRecord(
                    content=snippet,
                    chunk_type=kind,
                    start_line=start,
                    end_line=end,
                    symbol_name=symbol_name,
                )
            )
        return chunks

    def _chunk_sql_statements(self, *, text: str) -> list[ChunkRecord]:
        lines = text.replace("\r\n", "\n").split("\n")
        chunks: list[ChunkRecord] = []
        buffer: list[str] = []
        start_line = 1

        for line_no, line in enumerate(lines, start=1):
            if not buffer and line.strip():
                start_line = line_no
            buffer.append(line)
            if ";" not in line:
                continue
            content = "\n".join(buffer).strip()
            if content:
                chunks.append(
                    ChunkRecord(
                        content=content,
                        chunk_type="sql_statement",
                        start_line=start_line,
                        end_line=line_no,
                    )
                )
            buffer = []

        if buffer:
            content = "\n".join(buffer).strip()
            if content:
                chunks.append(
                    ChunkRecord(
                        content=content,
                        chunk_type="sql_block",
                        start_line=start_line,
                        end_line=len(lines),
                    )
                )
        return chunks

    def _chunk_fixed(self, *, text: str, chunk_type: str, start_line: int) -> list[ChunkRecord]:
        chunks: list[ChunkRecord] = []
        for item in _split_text_with_line_ranges(
            text,
            chunk_size=self._chunk_size,
            overlap=self._chunk_overlap,
            base_start_line=start_line,
        ):
            chunks.append(
                ChunkRecord(
                    content=item.content,
                    chunk_type=chunk_type,
                    start_line=item.start_line,
                    end_line=item.end_line,
                )
            )
        return chunks

    def _build_chunk_point(
        self,
        *,
        repo_id: str,
        relative_path: str,
        chunk_index: int,
        language: str,
        file_type: str,
        chunk: ChunkRecord,
        indexed_commit: str | None,
    ) -> QdrantPoint:
        token_count = len(chunk.content.split())
        symbol_hint = chunk.symbol_name or ""
        hash_material = f"{repo_id}:{relative_path}:{chunk_index}:{chunk.chunk_type}:{symbol_hint}:{chunk.content[:48]}".encode(
            "utf-8"
        )
        point_id = f"ctx_{hashlib.sha1(hash_material).hexdigest()}"
        payload = {
            "repo_id": repo_id,
            "type": "chunk",
            "path": relative_path,
            "file_type": file_type,
            "chunk_type": chunk.chunk_type,
            "symbol_name": chunk.symbol_name,
            "start_line": chunk.start_line,
            "end_line": chunk.end_line,
            "chunk_index": chunk_index,
            "language": language,
            "token_count": token_count,
            "indexed_commit": indexed_commit,
            "indexed_at": _utc_now(),
            "content": chunk.content,
        }
        vector = hash_embed_text(
            f"path:{relative_path}\nfile_type:{file_type}\nsymbol:{symbol_hint}\n{chunk.content}",
            vector_size=self._vector_size,
        )
        return QdrantPoint(id=point_id, vector=vector, payload=payload)

    def _build_sql_chunk_row(self, point: QdrantPoint) -> RepoContextChunkWrite:
        payload = point.payload
        return RepoContextChunkWrite(
            id=point.id,
            repo_id=str(payload["repo_id"]),
            path=str(payload["path"]),
            chunk_index=int(payload["chunk_index"]),
            content=str(payload["content"]),
            language=str(payload["language"]),
            file_type=str(payload["file_type"]),
            chunk_type=str(payload["chunk_type"]),
            symbol_name=_as_non_empty_str(payload.get("symbol_name")),
            start_line=_as_optional_int(payload.get("start_line")),
            end_line=_as_optional_int(payload.get("end_line")),
            indexed_commit=_as_non_empty_str(payload.get("indexed_commit")),
            metadata={
                "indexed_at": payload.get("indexed_at"),
                "token_count": payload.get("token_count"),
            },
        )

    def _build_profile_point(self, *, repo_id: str, payload: dict[str, Any]) -> QdrantPoint:
        summary = payload.get("summary", "")
        vector = hash_embed_text(f"{repo_id}\n{summary}", vector_size=self._vector_size)
        return QdrantPoint(
            id=f"repo_profile_{hashlib.sha1(repo_id.encode('utf-8')).hexdigest()[:24]}",
            vector=vector,
            payload=payload,
        )

    def _build_repo_profile_payload(
        self,
        *,
        repo_id: str,
        root: Path,
        indexed_commit: str | None,
        default_branch: str | None,
        files_seen: int,
        files_indexed: int,
        update_base: str | None = None,
        update_head: str | None = None,
        file_type_distribution: dict[str, int] | None = None,
    ) -> dict[str, Any]:
        key_files = [
            "README.md",
            "Makefile",
            "docker-compose.yml",
            "Dockerfile",
            "pyproject.toml",
            "package.json",
            "requirements.txt",
            "go.mod",
            "Cargo.toml",
            "pom.xml",
        ]
        detected_key_files = [name for name in key_files if (root / name).exists()]

        top_dirs = sorted([item.name for item in root.iterdir() if item.is_dir() and not item.name.startswith(".")])[:15]
        language_stats = _language_stats(iter_repo_files(root))

        normalized_file_types = dict(sorted((file_type_distribution or {}).items(), key=lambda item: item[1], reverse=True))
        summary_parts = [
            f"Repo {repo_id}",
            f"Top dirs: {', '.join(top_dirs)}" if top_dirs else "Top dirs: n/a",
            f"Key files: {', '.join(detected_key_files)}" if detected_key_files else "Key files: n/a",
            (
                f"Languages: {', '.join(f'{lang}:{count}' for lang, count in language_stats.items())}"
                if language_stats
                else "Languages: n/a"
            ),
            (
                f"File types: {', '.join(f'{name}:{count}' for name, count in normalized_file_types.items())}"
                if normalized_file_types
                else "File types: n/a"
            ),
        ]

        payload: dict[str, Any] = {
            "repo_id": repo_id,
            "type": "repo_profile",
            "repo_path": str(root),
            "indexed_at": _utc_now(),
            "indexed_commit": indexed_commit,
            "default_branch": default_branch,
            "files_seen": files_seen,
            "files_indexed": files_indexed,
            "top_directories": top_dirs,
            "key_files": detected_key_files,
            "languages": language_stats,
            "file_types": normalized_file_types,
            "summary": " | ".join(summary_parts),
        }
        if update_base:
            payload["last_update_base_ref"] = update_base
        if update_head:
            payload["last_update_head_ref"] = update_head
        return payload

    def _safe_git_head(self, root: Path) -> str | None:
        return _safe_git_output(root, ["rev-parse", "HEAD"])

    def _safe_git_branch(self, root: Path) -> str | None:
        return _safe_git_output(root, ["rev-parse", "--abbrev-ref", "HEAD"])

    def _git_changed_files(self, root: Path, *, base_ref: str, head_ref: str) -> list[str]:
        result = subprocess.run(
            ["git", "-C", str(root), "diff", "--name-only", "--diff-filter=ACMRD", base_ref, head_ref],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            raise ValueError(
                "Unable to compute changed files for incremental indexing. "
                f"git diff failed: {result.stderr.strip() or result.stdout.strip()}"
            )

        paths = [line.strip().replace("\\", "/") for line in result.stdout.splitlines() if line.strip()]
        return sorted(set(paths))


@dataclass(frozen=True)
class _LineSplitChunk:
    content: str
    start_line: int
    end_line: int


def _utc_now() -> str:
    return datetime.now(UTC).isoformat()


def _extract_suffix(file_path: Path) -> str:
    name = file_path.name.lower()
    if name.endswith(".env.example"):
        return ".env.example"
    return file_path.suffix.lower()


def _guess_language(relative_path: str) -> str:
    candidate = Path(relative_path)
    suffix = _extract_suffix(candidate)
    return _LANGUAGE_BY_SUFFIX.get(suffix, "text")


def _classify_file_type(file_path: Path) -> str:
    posix_path = file_path.as_posix().lower()
    name = file_path.name.lower()
    suffix = _extract_suffix(file_path)

    if name in _DEPENDENCY_FILENAMES:
        return "dependency"

    if suffix in _DIFF_SUFFIXES:
        return "diff"

    if any(hint in posix_path for hint in _CI_PATH_HINTS) or name in _CI_FILENAMES:
        return "ci"

    if any(hint in posix_path for hint in _MIGRATION_PATH_HINTS):
        return "migration"

    if suffix in _SQL_SUFFIXES and "migration" in posix_path:
        return "migration"

    if any(hint in posix_path for hint in _ADR_PATH_HINTS):
        return "adr"

    if any(hint in posix_path for hint in _TEST_PATH_HINTS) or re.search(r"(?:^|[._-])(test|spec)(?:[._-]|$)", name):
        if suffix in _CODE_SUFFIXES:
            return "test"

    if suffix in _INFRA_SUFFIXES or any(token in posix_path for token in ("/terraform/", "/helm/", "/k8s/", "/kubernetes/")):
        return "infra"

    if suffix in _SCRIPT_SUFFIXES:
        return "script"

    if suffix in _DOC_SUFFIXES:
        return "docs"

    if suffix in _CONFIG_SUFFIXES:
        return "config"

    if suffix in _CODE_SUFFIXES:
        return "code"

    if suffix in _SQL_SUFFIXES:
        return "migration"

    return "text"


def _safe_git_output(root: Path, args: list[str]) -> str | None:
    result = subprocess.run(
        ["git", "-C", str(root), *args],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        return None
    value = result.stdout.strip()
    return value or None


def _language_stats(paths: list[Path]) -> dict[str, int]:
    stats: dict[str, int] = {}
    for path in paths:
        language = _guess_language(path.as_posix())
        stats[language] = stats.get(language, 0) + 1
    return dict(sorted(stats.items(), key=lambda item: item[1], reverse=True))


def _split_text_with_line_ranges(
    text: str,
    *,
    chunk_size: int,
    overlap: int,
    base_start_line: int,
) -> list[_LineSplitChunk]:
    normalized = text.replace("\r\n", "\n")
    if chunk_size <= 0:
        line_count = max(normalized.count("\n"), 0)
        return [_LineSplitChunk(content=normalized, start_line=base_start_line, end_line=base_start_line + line_count)]

    if overlap < 0:
        overlap = 0

    lines = normalized.split("\n")
    if not lines:
        return []

    chunks: list[_LineSplitChunk] = []
    start_idx = 0
    total = len(lines)
    while start_idx < total:
        end_idx = start_idx
        current_len = 0
        while end_idx < total:
            next_len = len(lines[end_idx]) + 1
            if end_idx > start_idx and current_len + next_len > chunk_size:
                break
            current_len += next_len
            end_idx += 1
            if current_len >= chunk_size:
                break

        content = "\n".join(lines[start_idx:end_idx]).strip()
        if content:
            chunks.append(
                _LineSplitChunk(
                    content=content,
                    start_line=base_start_line + start_idx,
                    end_line=base_start_line + max(start_idx, end_idx - 1),
                )
            )

        if end_idx >= total:
            break

        if overlap == 0:
            start_idx = end_idx
            continue

        overlap_chars = 0
        overlap_start = end_idx
        while overlap_start > start_idx and overlap_chars < overlap:
            overlap_start -= 1
            overlap_chars += len(lines[overlap_start]) + 1
        start_idx = overlap_start if overlap_start < end_idx else end_idx

    return chunks


def _chunk_by_headers(lines: list[str], headers: list[tuple[int, str]], chunk_type: str) -> list[ChunkRecord]:
    chunks: list[ChunkRecord] = []
    if not headers:
        return chunks

    first_header_line = headers[0][0]
    if first_header_line > 1:
        preface = "\n".join(lines[: first_header_line - 1]).strip()
        if preface:
            chunks.append(
                ChunkRecord(
                    content=preface,
                    chunk_type=f"{chunk_type}_preamble",
                    start_line=1,
                    end_line=first_header_line - 1,
                )
            )

    for index, (start_line, label) in enumerate(headers):
        next_start = headers[index + 1][0] if index + 1 < len(headers) else len(lines) + 1
        end_line = max(start_line, next_start - 1)
        content = "\n".join(lines[start_line - 1 : end_line]).strip()
        if not content:
            continue
        chunks.append(
            ChunkRecord(
                content=content,
                chunk_type=chunk_type,
                start_line=start_line,
                end_line=end_line,
                symbol_name=label,
            )
        )
    return chunks


def _find_line_for_token(lines: Iterable[str], token: str) -> int:
    for index, line in enumerate(lines, start=1):
        if token in line:
            return index
    return 1


def _as_non_empty_str(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    cleaned = value.strip()
    return cleaned or None


def _as_optional_int(value: Any) -> int | None:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str):
        try:
            return int(value.strip())
        except ValueError:
            return None
    return None
