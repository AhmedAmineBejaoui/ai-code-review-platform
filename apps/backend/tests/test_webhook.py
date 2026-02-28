import hmac
import hashlib
import uuid

from fastapi.testclient import TestClient

from app.main import app
from app import settings


def test_github_webhook_signature_ok():
    secret = "test-secret-123"
    # set secret for test
    settings.settings.GITHUB_WEBHOOK_SECRET = secret

    client = TestClient(app)

    body = b'{"action": "opened"}'
    mac = hmac.new(secret.encode("utf-8"), msg=body, digestmod=hashlib.sha256).hexdigest()
    header = f"sha256={mac}"

    resp = client.post(
        "/webhooks/github",
        content=body,
        headers={
            "X-Hub-Signature-256": header,
            "X-GitHub-Event": "pull_request",
            "Content-Type": "application/json",
        },
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert data["event"] == "pull_request"
    assert data.get("duplicate") is False


def test_github_webhook_signature_bad():
    secret = "test-secret-123"
    settings.settings.GITHUB_WEBHOOK_SECRET = secret

    client = TestClient(app)

    body = b'{"action": "opened"}'
    # wrong signature
    header = "sha256=deadbeef"

    resp = client.post(
        "/webhooks/github",
        content=body,
        headers={
            "X-Hub-Signature-256": header,
            "X-GitHub-Event": "pull_request",
            "Content-Type": "application/json",
        },
    )

    assert resp.status_code == 401


def test_github_webhook_idempotency():
    secret = "test-secret-123"
    settings.settings.GITHUB_WEBHOOK_SECRET = secret

    client = TestClient(app)

    body = b'{"action": "opened"}'
    mac = hmac.new(secret.encode("utf-8"), msg=body, digestmod=hashlib.sha256).hexdigest()
    header = f"sha256={mac}"
    delivery = f"delivery-{uuid.uuid4().hex}"

    resp1 = client.post(
        "/webhooks/github",
        content=body,
        headers={
            "X-Hub-Signature-256": header,
            "X-GitHub-Event": "pull_request",
            "X-GitHub-Delivery": delivery,
            "Content-Type": "application/json",
        },
    )
    assert resp1.status_code == 200
    assert resp1.json().get("duplicate") is False

    # send the same delivery again -> should be marked duplicate
    resp2 = client.post(
        "/webhooks/github",
        content=body,
        headers={
            "X-Hub-Signature-256": header,
            "X-GitHub-Event": "pull_request",
            "X-GitHub-Delivery": delivery,
            "Content-Type": "application/json",
        },
    )
    assert resp2.status_code == 200
    assert resp2.json().get("duplicate") is True
