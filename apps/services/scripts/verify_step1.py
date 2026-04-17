"""Step-1 verification — run from apps/services/ via poetry.

Covers: gateway local endpoints, route table, 502 pass-through when legacy
is down, and /healthz on every service stub.
"""

from __future__ import annotations

import sys


def main() -> int:
    try:
        from fastapi.testclient import TestClient
    except Exception as exc:  # pragma: no cover
        print(f"cannot import TestClient: {exc}", file=sys.stderr)
        return 2

    from api_gateway.main import app as gateway_app

    client = TestClient(gateway_app)

    r = client.get("/__gateway/healthz")
    assert r.status_code == 200 and r.json()["status"] == "ok", f"got {r.status_code} {r.text}"
    print("  ok   /__gateway/healthz")

    r = client.get("/__gateway/routes")
    assert r.status_code == 200, f"got {r.status_code}"
    prefixes = {row["prefix"] for row in r.json()["routes"]}
    expected = {"/v1/analyses", "/api/v1/reviews", "/v1/kb", "/organizations", "/github/webhooks", "/"}
    missing = expected - prefixes
    assert not missing, f"missing prefixes: {missing}"
    print(f"  ok   /__gateway/routes — {len(prefixes)} prefixes registered")

    # Legacy is down in this environment → proxy should return 502.
    r = client.get("/v1/analyses")
    assert r.status_code == 502, f"expected 502, got {r.status_code}"
    assert r.json()["error"]["code"] == "UPSTREAM_UNAVAILABLE"
    print("  ok   pass-through returns 502 when legacy is down")

    # Every stub answers /healthz.
    from analysis_service.main import app as a
    from config_service.main import app as cf
    from kb_service.main import app as k
    from notifications_service.main import app as n
    from org_service.main import app as o
    from reviews_service.main import app as re
    for name, stub in [("analysis", a), ("kb", k), ("reviews", re),
                       ("org", o), ("config", cf), ("notifications", n)]:
        h = TestClient(stub).get("/healthz")
        assert h.status_code == 200, f"{name}: {h.status_code}"
        print(f"  ok   {name}-service /healthz")

    print("\n-- step 1 verification: all green --")
    return 0


if __name__ == "__main__":
    sys.exit(main())
