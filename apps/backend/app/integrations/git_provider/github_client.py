from __future__ import annotations

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import jwt

from app.core.security.secret_store import GITHUB_NAMESPACE, EncryptedSecretStore, get_secret_store
from app.settings import settings

LOGGER = logging.getLogger(__name__)

_GITHUB_API_VERSION = "2022-11-28"
_USER_AGENT = "ai-code-review-platform"
_INSTALLATION_TOKEN_KEY_PREFIX = "github_app_installation_token"
_TOKEN_REFRESH_SAFETY_SECONDS = 60


class GithubClient:
    def __init__(self, token: str | None = None, *, secret_store: EncryptedSecretStore | None = None):
        self.token = token
        self._secret_store = secret_store or get_secret_store()
        self._lock = asyncio.Lock()
        self._cached_installation_token: str | None = None
        self._cached_installation_expires_at: datetime | None = None

    async def fetch_pr_context(self, repo: str, pr_number: int | None, commit_sha: str | None) -> dict[str, Any]:
        payload: dict[str, Any] = {"repo": repo, "pr_number": pr_number, "commit_sha": commit_sha}
        auth_token = await self._resolve_auth_token()
        if auth_token is None:
            payload["provider"] = "github"
            payload["auth"] = "unconfigured"
            return payload

        try:
            if pr_number is not None:
                response = await asyncio.to_thread(
                    self._request_json,
                    method="GET",
                    path=f"/repos/{repo}/pulls/{pr_number}",
                    auth_token=auth_token,
                    body=None,
                )
                payload["provider"] = "github"
                payload["auth"] = "ok"
                payload["pr_title"] = response.get("title")
                payload["pr_state"] = response.get("state")
                payload["pr_author"] = (response.get("user") or {}).get("login")
                payload["head_sha"] = (response.get("head") or {}).get("sha")
                payload["base_sha"] = (response.get("base") or {}).get("sha")
                return payload

            if commit_sha:
                response = await asyncio.to_thread(
                    self._request_json,
                    method="GET",
                    path=f"/repos/{repo}/commits/{commit_sha}",
                    auth_token=auth_token,
                    body=None,
                )
                payload["provider"] = "github"
                payload["auth"] = "ok"
                payload["commit_message"] = ((response.get("commit") or {}).get("message") or "").strip()
                payload["author"] = ((response.get("commit") or {}).get("author") or {}).get("name")
                return payload
        except Exception as exc:
            LOGGER.warning("GitHub context fetch failed for repo=%s pr=%s sha=%s: %s", repo, pr_number, commit_sha, exc)
            payload["provider"] = "github"
            payload["auth"] = "failed"
            payload["fetch_error"] = str(exc)
            return payload

        payload["provider"] = "github"
        payload["auth"] = "ok"
        return payload

    async def create_comment(self, repo: str, pr: int, body: str) -> None:
        auth_token = await self._resolve_auth_token()
        if auth_token is None:
            LOGGER.warning("Skipping GitHub comment because auth token is unavailable for repo=%s pr=%s", repo, pr)
            return

        await asyncio.to_thread(
            self._request_json,
            method="POST",
            path=f"/repos/{repo}/issues/{pr}/comments",
            auth_token=auth_token,
            body={"body": body},
        )

    async def _resolve_auth_token(self) -> str | None:
        if self.token:
            return self.token
        return await self._resolve_installation_token()

    async def _resolve_installation_token(self) -> str | None:
        app_id = _parse_int(settings.GITHUB_APP_ID)
        installation_id = _parse_int(settings.GITHUB_APP_INSTALLATION_ID)
        private_key = self._secret_store.resolve_github_app_private_key()
        if app_id is None or installation_id is None or not private_key:
            return None

        async with self._lock:
            if _is_token_valid(self._cached_installation_expires_at):
                return self._cached_installation_token

            stored_key = f"{_INSTALLATION_TOKEN_KEY_PREFIX}:{installation_id}"
            stored = self._secret_store.get_secret_with_meta(namespace=GITHUB_NAMESPACE, secret_key=stored_key)
            if stored is not None:
                token_value, token_meta = stored
                expires_at = _parse_datetime(token_meta.get("expires_at"))
                if _is_token_valid(expires_at):
                    self._cached_installation_token = token_value
                    self._cached_installation_expires_at = expires_at
                    return token_value

            app_jwt = self._build_app_jwt(private_key=private_key, app_id=app_id)
            token_value, expires_at = await asyncio.to_thread(
                self._request_installation_token,
                installation_id=installation_id,
                app_jwt=app_jwt,
            )

            self._secret_store.upsert_secret(
                namespace=GITHUB_NAMESPACE,
                secret_key=stored_key,
                plaintext=token_value,
                meta={
                    "source": "github_app_installation_token",
                    "installation_id": installation_id,
                    "expires_at": expires_at.isoformat().replace("+00:00", "Z"),
                },
            )
            self._cached_installation_token = token_value
            self._cached_installation_expires_at = expires_at
            return token_value

    @staticmethod
    def _build_app_jwt(*, private_key: str, app_id: int) -> str:
        now = int(time.time())
        payload = {
            "iat": now - 60,
            "exp": now + 9 * 60,
            "iss": str(app_id),
        }
        encoded = jwt.encode(payload, private_key, algorithm="RS256")
        if isinstance(encoded, bytes):
            return encoded.decode("utf-8")
        return encoded

    def _request_installation_token(self, *, installation_id: int, app_jwt: str) -> tuple[str, datetime]:
        response = self._request_json(
            method="POST",
            path=f"/app/installations/{installation_id}/access_tokens",
            auth_token=app_jwt,
            body={},
            token_scheme="Bearer",
        )
        token = str(response.get("token") or "")
        expires_at = _parse_datetime(response.get("expires_at"))
        if not token or expires_at is None:
            raise RuntimeError("GitHub installation token response is missing token or expires_at")
        return token, expires_at

    def _request_json(
        self,
        *,
        method: str,
        path: str,
        auth_token: str,
        body: dict[str, Any] | None,
        token_scheme: str = "Bearer",
    ) -> dict[str, Any]:
        url = f"{settings.GITHUB_API_BASE_URL.rstrip('/')}{path}"
        headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": _GITHUB_API_VERSION,
            "User-Agent": _USER_AGENT,
            "Authorization": f"{token_scheme} {auth_token}",
        }
        data = None
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"

        req = Request(url=url, method=method, data=data, headers=headers)
        try:
            with urlopen(req, timeout=20) as response:
                raw = response.read().decode("utf-8")
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            raise RuntimeError(f"GitHub API error {exc.code}: {detail}") from exc
        except URLError as exc:
            raise RuntimeError(f"GitHub API network error: {exc.reason}") from exc

        if not raw:
            return {}
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return parsed
        return {"data": parsed}


def _parse_int(raw: str | None) -> int | None:
    if raw is None:
        return None
    value = raw.strip()
    if not value:
        return None
    try:
        return int(value)
    except ValueError:
        return None


def _parse_datetime(raw: str | None) -> datetime | None:
    if raw is None:
        return None
    value = raw.strip()
    if not value:
        return None
    normalized = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _is_token_valid(expires_at: datetime | None) -> bool:
    if expires_at is None:
        return False
    now = datetime.now(timezone.utc)
    return expires_at - timedelta(seconds=_TOKEN_REFRESH_SAFETY_SECONDS) > now
