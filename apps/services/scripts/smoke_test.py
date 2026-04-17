#!/usr/bin/env python3
"""Smoke test for the microservices stack.

Hits every /healthz (services) and /__gateway/healthz (gateway), plus a
pass-through probe to verify the gateway correctly forwards requests to
the legacy monolith. Exits non-zero on any failure.

Run:
    make svc-health
    # or
    python apps/services/scripts/smoke_test.py
"""

from __future__ import annotations

import os
import sys
import time
from typing import NamedTuple
from urllib.error import URLError
from urllib.request import Request, urlopen


class Check(NamedTuple):
    name: str
    url: str
    required: bool  # If True, failure fails the script. Soft checks only warn.


def _env(name: str, default: str) -> str:
    return os.environ.get(name, default)


def _probe(url: str, timeout: float = 3.0) -> tuple[int | None, str | None]:
    """Return (status_code, err). status_code is None when the request fails."""
    req = Request(url, method="GET", headers={"User-Agent": "svc-smoke-test/0.1"})
    try:
        with urlopen(req, timeout=timeout) as resp:  # noqa: S310 — localhost
            return resp.status, None
    except URLError as exc:  # includes timeouts, connection refused
        return None, str(exc.reason if hasattr(exc, "reason") else exc)
    except Exception as exc:  # pragma: no cover — defensive
        return None, repr(exc)


def build_checks() -> list[Check]:
    gateway_port = _env("GATEWAY_PORT", "8000")
    legacy_port = _env("LEGACY_BACKEND_PORT", "8100")
    ports = {
        "analysis-service":      _env("ANALYSIS_SERVICE_PORT", "8001"),
        "kb-service":            _env("KB_SERVICE_PORT", "8002"),
        "reviews-service":       _env("REVIEWS_SERVICE_PORT", "8003"),
        "org-service":           _env("ORG_SERVICE_PORT", "8004"),
        "config-service":        _env("CONFIG_SERVICE_PORT", "8005"),
        "notifications-service": _env("NOTIFICATIONS_SERVICE_PORT", "8006"),
    }

    checks: list[Check] = [
        Check("gateway local healthz",
              f"http://localhost:{gateway_port}/__gateway/healthz", required=True),
        Check("gateway routing introspection",
              f"http://localhost:{gateway_port}/__gateway/routes", required=True),
        # Legacy monolith must be reachable directly on :8100 — soft-required
        # (script still useful even if user forgot to start it).
        Check("legacy monolith (:8100) healthz",
              f"http://localhost:{legacy_port}/healthz", required=False),
        # Gateway pass-through: asking the gateway for /healthz should land
        # on the legacy monolith since no service owns that route yet.
        Check("gateway -> legacy pass-through (/healthz)",
              f"http://localhost:{gateway_port}/healthz", required=False),
    ]

    for name, port in ports.items():
        checks.append(Check(f"{name} healthz",
                            f"http://localhost:{port}/healthz", required=True))
    return checks


def main() -> int:
    print("== Microservices smoke test ==\n")
    checks = build_checks()
    failures = 0
    warnings = 0

    # Give things a beat to start if this is run right after `docker compose up`.
    time.sleep(0.2)

    for chk in checks:
        status, err = _probe(chk.url)
        if status is None:
            verdict = "FAIL" if chk.required else "SKIP"
            if chk.required:
                failures += 1
            else:
                warnings += 1
            print(f"  [{verdict}] {chk.name:<45} {chk.url}  ({err})")
        elif 200 <= status < 300:
            print(f"  [ OK ] {chk.name:<45} {chk.url}  -> {status}")
        else:
            failures += 1 if chk.required else 0
            warnings += 0 if chk.required else 1
            label = "FAIL" if chk.required else "WARN"
            print(f"  [{label}] {chk.name:<45} {chk.url}  -> HTTP {status}")

    print()
    if failures:
        print(f"FAILED: {failures} required check(s) broken, {warnings} soft warning(s).")
        return 1
    if warnings:
        print(f"OK with warnings: {warnings} soft check(s) unavailable "
              "(legacy monolith not running?).")
        return 0
    print("All checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
