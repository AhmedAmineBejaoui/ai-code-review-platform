FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 POETRY_VIRTUALENVS_CREATE=false PIP_NO_CACHE_DIR=1
WORKDIR /app

RUN pip install --no-cache-dir "poetry==1.8.3"

COPY pyproject.toml README.md ./
COPY common ./common
COPY org_service ./org_service

RUN poetry install --only main --no-interaction --no-ansi

EXPOSE 8004
CMD ["uvicorn", "org_service.main:app", "--host", "0.0.0.0", "--port", "8004"]
