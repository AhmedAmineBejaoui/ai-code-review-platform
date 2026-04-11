import sys

from celery import Celery

from app.settings import settings

celery_app = Celery("ai_review")


def configure_celery_app() -> None:
    broker_url = settings.resolved_celery_broker_url
    result_backend = settings.resolved_celery_result_backend

    if broker_url:
        celery_app.conf.broker_url = broker_url
    if result_backend:
        celery_app.conf.result_backend = result_backend

    # Connection resilience / retries for unstable local Redis
    celery_app.conf.broker_connection_retry = True
    celery_app.conf.broker_connection_max_retries = 10
    celery_app.conf.broker_transport_options = {"max_retries": 3}
    # Limit connection pool to avoid exhausting Redis on small local instances
    celery_app.conf.broker_pool_limit = 10

    celery_app.conf.task_default_queue = settings.ANALYSIS_QUEUE_NAME
    celery_app.conf.task_always_eager = settings.CELERY_TASK_ALWAYS_EAGER
    celery_app.conf.task_eager_propagates = settings.CELERY_TASK_EAGER_PROPAGATES
    if settings.CELERY_WORKER_POOL:
        celery_app.conf.worker_pool = settings.CELERY_WORKER_POOL
    elif sys.platform.startswith("win"):
        # Celery prefork is unstable on Windows; default to solo unless overridden.
        celery_app.conf.worker_pool = "solo"
        # Solo pool on Windows should run single-threaded to avoid intermittent
        # connection pressure against local Redis instances.
        celery_app.conf.worker_concurrency = 1
    celery_app.conf.imports = (
        "app.workers.tasks.analyze_pr",
        "app.workers.tasks.ingest_kb",
        "app.workers.tasks.langgraph_analysis",
    )
    if settings.KB_DOCUMENT_MAINTENANCE_SCHEDULE_MINUTES > 0:
        celery_app.conf.beat_schedule = {
            "kb-document-maintenance": {
                "task": "kb.maintain_documents",
                "schedule": settings.KB_DOCUMENT_MAINTENANCE_SCHEDULE_MINUTES * 60,
                "kwargs": {"reason": "scheduled"},
            }
        }


configure_celery_app()
