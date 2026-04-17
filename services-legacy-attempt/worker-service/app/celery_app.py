"""
Worker Service — Celery configuration
───────────────────────────────────────
MOVED FROM: apps/backend/app/workers/celery_app.py
LOGIC:      Identical — only settings import changed.
"""
from __future__ import annotations

import sys

from celery import Celery

from app.settings import settings

celery_app = Celery("ai_review_worker")


def configure() -> None:
    broker  = settings.CELERY_BROKER_URL or settings.REDIS_URL
    backend = settings.CELERY_RESULT_BACKEND or broker

    if broker:
        celery_app.conf.broker_url     = broker
    if backend:
        celery_app.conf.result_backend = backend

    celery_app.conf.broker_connection_retry         = True
    celery_app.conf.broker_connection_max_retries   = 10
    celery_app.conf.broker_pool_limit               = 10
    celery_app.conf.task_default_queue              = settings.ANALYSIS_QUEUE_NAME
    celery_app.conf.task_always_eager               = settings.CELERY_TASK_ALWAYS_EAGER

    if settings.CELERY_WORKER_POOL:
        celery_app.conf.worker_pool = settings.CELERY_WORKER_POOL
    elif sys.platform.startswith("win"):
        celery_app.conf.worker_pool        = "solo"
        celery_app.conf.worker_concurrency = 1

    celery_app.conf.imports = (
        "app.tasks.analyze_pr",
        "app.tasks.ingest_kb",
    )


configure()
