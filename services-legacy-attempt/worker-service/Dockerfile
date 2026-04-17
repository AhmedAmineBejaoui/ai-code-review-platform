FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir \
    celery[redis] \
    sqlalchemy \
    psycopg2-binary \
    httpx \
    pydantic-settings \
    gitpython \
    semgrep \
    ruff

COPY app/ ./app/

CMD ["celery", "worker", "-A", "app.celery_app:app", "--loglevel=info", "--pool=solo"]