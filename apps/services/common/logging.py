"""Minimal structured logging setup shared by every service.

Intentionally tiny so it can be swapped for structlog/OTel later without
rippling through service code.
"""

from __future__ import annotations

import logging
import sys


def configure_logging(service_name: str, level: str = "INFO") -> logging.Logger:
    """Configure the root logger once and return a service-tagged logger."""
    root = logging.getLogger()
    if not root.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(
            logging.Formatter(
                fmt="%(asctime)s %(levelname)-7s [%(name)s] %(message)s",
                datefmt="%Y-%m-%dT%H:%M:%S",
            )
        )
        root.addHandler(handler)
    root.setLevel(level.upper())
    return logging.getLogger(service_name)
