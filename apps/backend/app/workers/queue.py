from __future__ import annotations

from dataclasses import dataclass

from app.settings import settings
from app.workers.celery_app import celery_app
from app.workers.celery_app import configure_celery_app
from app.workers.tasks.analyze_pr import run_minimal_analysis_pipeline


@dataclass(frozen=True)
class EnqueueResult:
    task_id: str


class QueueUnavailableError(Exception):
    pass


def _has_active_analysis_worker() -> bool:
    if not settings.CELERY_ENQUEUE_REQUIRE_WORKER:
        return True

    try:
        inspector = celery_app.control.inspect(timeout=settings.CELERY_ENQUEUE_INSPECT_TIMEOUT_SECONDS)
    except Exception:
        return False

    if inspector is None:
        return False

    try:
        ping = inspector.ping() or {}
    except Exception:
        ping = {}
    if not ping:
        return False

    try:
        active_queues = inspector.active_queues() or {}
    except Exception:
        # If we can ping workers but cannot query queues, assume available.
        return True

    expected_queue = (settings.ANALYSIS_QUEUE_NAME or "analyses").strip()
    if not expected_queue:
        return bool(ping)

    for worker_queues in active_queues.values():
        if not isinstance(worker_queues, list):
            continue
        for queue_info in worker_queues:
            if not isinstance(queue_info, dict):
                continue
            if str(queue_info.get("name") or "").strip() == expected_queue:
                return True

    return False


def enqueue_analysis_job(analysis_id: str) -> EnqueueResult:
    configure_celery_app()

    if not settings.CELERY_TASK_ALWAYS_EAGER and not settings.resolved_celery_broker_url:
        raise QueueUnavailableError("Queue broker URL is not configured")

    if not settings.CELERY_TASK_ALWAYS_EAGER and not _has_active_analysis_worker():
        raise QueueUnavailableError("No active Celery worker is consuming the analysis queue")

    try:
        async_result = run_minimal_analysis_pipeline.apply_async(
            args=[analysis_id],
            queue=settings.ANALYSIS_QUEUE_NAME,
        )
    except Exception as exc:
        raise QueueUnavailableError("Unable to enqueue analysis job") from exc

    task_id = async_result.id or ""
    return EnqueueResult(task_id=task_id)
