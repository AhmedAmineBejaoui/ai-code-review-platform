from __future__ import annotations

from cryptography.fernet import Fernet

from app.core.security.secret_store import EncryptedSecretStore
from app.data.models.secret import StoredSecret


class _FakeSecretsRepo:
    def __init__(self) -> None:
        self.rows: dict[tuple[str, str], StoredSecret] = {}

    def upsert(self, *, namespace: str, secret_key: str, ciphertext: str, meta=None) -> StoredSecret:
        row = StoredSecret(
            id=f"{namespace}:{secret_key}",
            namespace=namespace,
            secret_key=secret_key,
            ciphertext=ciphertext,
            meta_json="{}",
            created_at="2026-02-28T00:00:00Z",
            updated_at="2026-02-28T00:00:00Z",
        )
        self.rows[(namespace, secret_key)] = row
        return row

    def get(self, *, namespace: str, secret_key: str) -> StoredSecret | None:
        return self.rows.get((namespace, secret_key))


def test_encrypted_secret_store_encrypts_before_storage() -> None:
    repo = _FakeSecretsRepo()
    key = Fernet.generate_key().decode("utf-8")
    store = EncryptedSecretStore(repo=repo, key=key)

    inserted = store.upsert_secret(namespace="github", secret_key="token", plaintext="super-secret-token")
    assert inserted is True

    row = repo.get(namespace="github", secret_key="token")
    assert row is not None
    assert row.ciphertext != "super-secret-token"
    assert store.get_secret(namespace="github", secret_key="token") == "super-secret-token"


def test_encrypted_secret_store_is_disabled_with_invalid_key() -> None:
    repo = _FakeSecretsRepo()
    store = EncryptedSecretStore(repo=repo, key="not-a-fernet-key")
    assert store.is_enabled is False
    assert store.upsert_secret(namespace="github", secret_key="token", plaintext="x") is False
