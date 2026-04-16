"""
Analysis Service — Celery queue interface
──────────────────────────────────────────
MOVED FROM: apps/backend/app/workers/queue.py
LOGIC:      Identical. The Analysis Service is the only service that enqueues
            analysis jobs. The Worker Service is the only one that consumes them.
"""
from __future__ import annotations

from dataclasses import dataclass

from celery import Celery

from app.settings import settings


@dataclass(frozen=True)
class EnqueueResult:
    task_id: str


class QueueUnavailableError(Exception):
    pass


def _get_celery_app() -> Celery:
    app = Celery("ai_review_gateway")
    broker = (settings.CELERY_BROKER_URL or settings.REDIS_URL)
    if broker:
        app.conf.broker_url        = broker
        app.conf.result_backend    = settings.CELERY_RESULT_BACKEND or broker
    app.conf.task_always_eager     = settings.CELERY_TASK_ALWAYS_EAGER
    app.conf.task_default_queue    = settings.ANALYSIS_QUEUE_NAME
    return app


def enqueue_analysis_job(analysis_id: str) -> EnqueueResult:
    """Send analysis_id to the worker queue. Identical logic to monolith queue.py."""
    broker = settings.CELERY_BROKER_URL or settings.REDIS_URL
    if not broker and not settings.CELERY_TASK_ALWAYS_EAGER:
        raise QueueUnavailableError("No queue broker URL configured")

    celery_app = _get_celery_app()

    # Check for active worker (same inspect logic as monolith)
    if not settings.CELERY_TASK_ALWAYS_EAGER and settings.CELERY_ENQUEUE_REQUIRE_WORKER:
        try:
            inspector = celery_app.control.inspect(timeout=2.0)
            ping      = inspector.ping() or {}
            if not ping:
                raise QueueUnavailableError("No active Celery worker found")
        except QueueUnavailableError:
            raise
        except Exception as exc:
            raise QueueUnavailableError("Cannot reach queue broker") from exc

    try:
        # The task is registered in the Worker Service, but we reference it by name
        result = celery_app.send_task(
            "app.tasks.analyze_pr.run_minimal_analysis_pipeline",
            args=[analysis_id],
            queue=settings.ANALYSIS_QUEUE_NAME,
        )
    except Exception as exc:
        raise QueueUnavailableError("Unable to enqueue analysis job") from exc

    return EnqueueResult(task_id=result.id or "")
