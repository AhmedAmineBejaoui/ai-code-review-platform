from __future__ import annotations

import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import quote


@dataclass
class PreparedWorkspace:
    path: str
    source: str
    warnings: list[str]
    _cleanup_root: str | None = None

    def cleanup(self) -> None:
        if self._cleanup_root:
            shutil.rmtree(self._cleanup_root, ignore_errors=True)


def _build_https_remote(repo: str, host: str, token: str | None) -> str:
    normalized_repo = repo.strip().removesuffix(".git")
    normalized_host = host.strip().strip("/")
    if not token:
        return f"https://{normalized_host}/{normalized_repo}.git"
    safe_token = quote(token, safe="")
    return f"https://x-access-token:{safe_token}@{normalized_host}/{normalized_repo}.git"


def _run_git(args: list[str], *, timeout_seconds: int, cwd: str | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=timeout_seconds,
        check=False,
    )


def prepare_workspace(
    *,
    repo: str,
    commit_sha: str | None,
    default_workspace_path: str,
    auto_checkout_enabled: bool,
    git_host: str,
    git_token: str | None,
    checkout_timeout_seconds: int,
    checkout_base_path: str | None,
) -> PreparedWorkspace:
    default_path = str(Path(default_workspace_path).resolve())
    warnings: list[str] = []

    if not auto_checkout_enabled:
        return PreparedWorkspace(path=default_path, source="local", warnings=warnings)

    if not repo.strip():
        warnings.append("static checkout skipped: missing repo")
        return PreparedWorkspace(path=default_path, source="local", warnings=warnings)

    normalized_commit_sha = (commit_sha or "").strip()
    if not normalized_commit_sha:
        warnings.append("static checkout skipped: missing commit_sha")
        return PreparedWorkspace(path=default_path, source="local", warnings=warnings)
    if len(normalized_commit_sha) < 12:
        warnings.append("static checkout skipped: commit_sha too short")
        return PreparedWorkspace(path=default_path, source="local", warnings=warnings)

    parent_dir = None
    if checkout_base_path:
        base_path = Path(checkout_base_path).resolve()
        base_path.mkdir(parents=True, exist_ok=True)
        parent_dir = str(base_path)

    temp_root = tempfile.mkdtemp(prefix="analysis-workspace-", dir=parent_dir)
    repo_dir = str(Path(temp_root) / "repo")
    remote = _build_https_remote(repo=repo, host=git_host, token=git_token)

    clone = _run_git(["git", "clone", "--no-checkout", "--filter=blob:none", "--depth", "1", remote, repo_dir], timeout_seconds=checkout_timeout_seconds)
    if clone.returncode != 0:
        shutil.rmtree(temp_root, ignore_errors=True)
        warnings.append("static checkout failed: git clone")
        return PreparedWorkspace(path=default_path, source="local", warnings=warnings)

    if normalized_commit_sha:
        fetch = _run_git(
            ["git", "fetch", "--depth", "1", "origin", normalized_commit_sha],
            cwd=repo_dir,
            timeout_seconds=checkout_timeout_seconds,
        )
        if fetch.returncode != 0:
            shutil.rmtree(temp_root, ignore_errors=True)
            warnings.append("static checkout failed: git fetch commit")
            return PreparedWorkspace(path=default_path, source="local", warnings=warnings)

        checkout = _run_git(
            ["git", "checkout", "--force", normalized_commit_sha],
            cwd=repo_dir,
            timeout_seconds=checkout_timeout_seconds,
        )
        if checkout.returncode != 0:
            shutil.rmtree(temp_root, ignore_errors=True)
            warnings.append("static checkout failed: git checkout commit")
            return PreparedWorkspace(path=default_path, source="local", warnings=warnings)

    return PreparedWorkspace(path=repo_dir, source="checkout", warnings=warnings, _cleanup_root=temp_root)
