from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from app.integrations.git_provider.github_client import GithubClient
from app.settings import settings


def _generate_private_key_pem() -> str:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    return pem.decode("utf-8")


class _FakeSecretStore:
    def __init__(self, private_key_pem: str) -> None:
        self.private_key_pem = private_key_pem
        self.token_rows: dict[tuple[str, str], tuple[str, dict]] = {}

    def resolve_github_app_private_key(self) -> str:
        return self.private_key_pem

    def get_secret_with_meta(self, *, namespace: str, secret_key: str):
        return self.token_rows.get((namespace, secret_key))

    def upsert_secret(self, *, namespace: str, secret_key: str, plaintext: str, meta: dict | None = None):
        self.token_rows[(namespace, secret_key)] = (plaintext, meta or {})
        return True


def test_build_app_jwt_contains_required_claims() -> None:
    private_key = _generate_private_key_pem()
    encoded = GithubClient._build_app_jwt(private_key=private_key, app_id=12345)
    claims = jwt.decode(encoded, options={"verify_signature": False})
    assert claims["iss"] == "12345"
    assert claims["exp"] > claims["iat"]


def test_installation_token_is_cached(monkeypatch) -> None:
    private_key = _generate_private_key_pem()
    store = _FakeSecretStore(private_key)
    client = GithubClient(secret_store=store)

    old_app_id = settings.GITHUB_APP_ID
    old_installation_id = settings.GITHUB_APP_INSTALLATION_ID
    settings.GITHUB_APP_ID = "12345"
    settings.GITHUB_APP_INSTALLATION_ID = "45678"

    calls = {"count": 0}

    def _fake_installation_token(*, installation_id: int, app_jwt: str) -> tuple[str, datetime]:
        assert installation_id == 45678
        assert app_jwt
        calls["count"] += 1
        return "ghs_mock_installation_token", datetime.now(timezone.utc) + timedelta(minutes=30)

    monkeypatch.setattr(client, "_request_installation_token", _fake_installation_token)

    async def _run() -> tuple[str | None, str | None]:
        first = await client._resolve_installation_token()
        second = await client._resolve_installation_token()
        return first, second

    try:
        first, second = asyncio.run(_run())
        assert first == "ghs_mock_installation_token"
        assert second == "ghs_mock_installation_token"
        assert calls["count"] == 1
    finally:
        settings.GITHUB_APP_ID = old_app_id
        settings.GITHUB_APP_INSTALLATION_ID = old_installation_id
