from __future__ import annotations

import hashlib
import subprocess
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.core.knowledge_base.embeddings import hash_embed_text
from app.core.knowledge_base.guardrails import (
    iter_repo_files,
    normalize_repo_id,
    resolve_repo_path,
    should_index_path,
    to_posix_relative,
    validate_allowed_roots,
)
from app.integrations.vector_store.qdrant_client import QdrantClient, QdrantPoint
from app.settings import settings

_LANGUAGE_BY_SUFFIX: dict[str, str] = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".go": "go",
    ".java": "java",
    ".kt": "kotlin",
    ".rs": "rust",
    ".rb": "ruby",
    ".php": "php",
    ".c": "c",
    ".h": "c",
    ".cpp": "cpp",
    ".hpp": "cpp",
    ".cs": "csharp",
    ".swift": "swift",
    ".md": "markdown",
    ".mdx": "markdown",
    ".rst": "rst",
    ".sql": "sql",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".json": "json",
    ".toml": "toml",
}


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


class RepoContextIngestor:
    def __init__(self, vector_store: QdrantClient) -> None:
        self._vector_store = vector_store
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
        files_indexed = 0
        for file_path in files:
            relative_path = to_posix_relative(root, file_path)
            chunks = self._file_to_chunks(file_path)
            if not chunks:
                continue

            for chunk_index, chunk_text in enumerate(chunks):
                points.append(self._build_chunk_point(
                    repo_id=repo_key,
                    relative_path=relative_path,
                    chunk_index=chunk_index,
                    content=chunk_text,
                    indexed_commit=indexed_commit,
                ))
            files_indexed += 1

        await self._upsert_in_batches(points)

        profile_payload = self._build_repo_profile_payload(
            repo_id=repo_key,
            root=root,
            indexed_commit=indexed_commit,
            default_branch=default_branch,
            files_seen=len(files),
            files_indexed=files_indexed,
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
        chunks_deleted = 0
        files_indexed = 0
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

            chunks = self._file_to_chunks(abs_path)
            if not chunks:
                continue

            indexed_commit = self._safe_git_head(root)
            for chunk_index, chunk_text in enumerate(chunks):
                points_to_upsert.append(
                    self._build_chunk_point(
                        repo_id=repo_key,
                        relative_path=relative_path,
                        chunk_index=chunk_index,
                        content=chunk_text,
                        indexed_commit=indexed_commit,
                    )
                )
            files_indexed += 1

        await self._upsert_in_batches(points_to_upsert)

        indexed_commit = self._safe_git_head(root)
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

    def _file_to_chunks(self, file_path: Path) -> list[str]:
        try:
            text = file_path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            return []
        if not text.strip():
            return []
        return _split_text(text, chunk_size=self._chunk_size, overlap=self._chunk_overlap)

    def _build_chunk_point(
        self,
        *,
        repo_id: str,
        relative_path: str,
        chunk_index: int,
        content: str,
        indexed_commit: str | None,
    ) -> QdrantPoint:
        token_count = len(content.split())
        language = _guess_language(relative_path)
        hash_material = f"{repo_id}:{relative_path}:{chunk_index}:{content[:48]}".encode("utf-8")
        point_id = f"ctx_{hashlib.sha1(hash_material).hexdigest()}"
        payload = {
            "repo_id": repo_id,
            "type": "chunk",
            "path": relative_path,
            "chunk_index": chunk_index,
            "language": language,
            "token_count": token_count,
            "indexed_commit": indexed_commit,
            "indexed_at": _utc_now(),
            "content": content,
        }
        vector = hash_embed_text(f"{relative_path}\n{content}", vector_size=self._vector_size)
        return QdrantPoint(id=point_id, vector=vector, payload=payload)

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

        summary_parts = [
            f"Repo {repo_id}",
            f"Top dirs: {', '.join(top_dirs)}" if top_dirs else "Top dirs: n/a",
            f"Key files: {', '.join(detected_key_files)}" if detected_key_files else "Key files: n/a",
            f"Languages: {', '.join(f'{lang}:{count}' for lang, count in language_stats.items())}" if language_stats else "Languages: n/a",
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


def _utc_now() -> str:
    return datetime.now(UTC).isoformat()


def _guess_language(relative_path: str) -> str:
    suffix = Path(relative_path).suffix.lower()
    return _LANGUAGE_BY_SUFFIX.get(suffix, "text")


def _split_text(text: str, *, chunk_size: int, overlap: int) -> list[str]:
    normalized = text.replace("\r\n", "\n")
    if chunk_size <= 0:
        return [normalized]
    if overlap < 0:
        overlap = 0

    chunks: list[str] = []
    start = 0
    total_len = len(normalized)
    while start < total_len:
        end = min(total_len, start + chunk_size)
        if end < total_len:
            window = normalized[start:end]
            newline_cut = window.rfind("\n")
            if newline_cut > chunk_size // 3:
                end = start + newline_cut + 1

        chunk = normalized[start:end].strip()
        if chunk:
            chunks.append(chunk)

        if end >= total_len:
            break
        start = max(end - overlap, start + 1)

    return chunks


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


def _as_non_empty_str(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    cleaned = value.strip()
    return cleaned or None
