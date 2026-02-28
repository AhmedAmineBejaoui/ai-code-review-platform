from __future__ import annotations

from dataclasses import dataclass

from app.settings import settings
from app.workers.celery_app import configure_celery_app
from app.workers.tasks.analyze_pr import run_minimal_analysis_pipeline


@dataclass(frozen=True)
class EnqueueResult:
    task_id: str


class QueueUnavailableError(Exception):
    pass


def enqueue_analysis_job(analysis_id: str) -> EnqueueResult:
    configure_celery_app()

    if not settings.CELERY_TASK_ALWAYS_EAGER and not settings.resolved_celery_broker_url:
        raise QueueUnavailableError("Queue broker URL is not configured")

    try:
        async_result = run_minimal_analysis_pipeline.apply_async(
            args=[analysis_id],
            queue=settings.ANALYSIS_QUEUE_NAME,
        )
    except Exception as exc:
        raise QueueUnavailableError("Unable to enqueue analysis job") from exc

    task_id = async_result.id or ""
    return EnqueueResult(task_id=task_id)
