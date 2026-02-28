from __future__ import annotations

import asyncio
from typing import Any


class GithubClient:
    def __init__(self, token: str | None = None):
        self.token = token

    async def fetch_pr_context(self, repo: str, pr_number: int | None, commit_sha: str | None) -> dict[str, Any]:
        # Placeholder async I/O integration point for GitHub API reads.
        await asyncio.sleep(0)
        return {"repo": repo, "pr_number": pr_number, "commit_sha": commit_sha}

    async def create_comment(self, repo: str, pr: int, body: str) -> None:
        # Placeholder async I/O integration point for GitHub API writes.
        await asyncio.sleep(0)
