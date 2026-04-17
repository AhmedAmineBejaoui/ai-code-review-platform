"""Shared exception handlers.

The monolith has a rich error module (`app/api/errors.py`). The gateway and
stubs only need generic fall-through handlers — services that extract real
routers can reuse the legacy module via import until they are fully moved.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

log = logging.getLogger(__name__)


def _error_response(
    *, code: str, message: str, status_code: int, details: Any = None
) -> JSONResponse:
    body: dict[str, Any] = {"error": {"code": code, "message": message}}
    if details is not None:
        body["error"]["details"] = details
    return JSONResponse(content=body, status_code=status_code)


def register_exception_handlers(app: FastAPI) -> None:
    """Attach generic handlers. Services may override by registering later."""

    @app.exception_handler(RequestValidationError)
    async def _validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        return _error_response(
            code="VALIDATION_ERROR",
            message="Request payload is invalid.",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=exc.errors(),
        )

    @app.exception_handler(Exception)
    async def _catch_all(_: Request, exc: Exception) -> JSONResponse:
        log.exception("Unhandled error: %s", exc)
        return _error_response(
            code="INTERNAL_ERROR",
            message="An unexpected error occurred.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
