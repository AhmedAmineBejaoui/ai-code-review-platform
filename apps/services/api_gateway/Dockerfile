FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_VIRTUALENVS_CREATE=false \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install poetry — single install layer.
RUN pip install --no-cache-dir "poetry==1.8.3"

# Copy only the files poetry needs to resolve deps (maximises cache reuse).
COPY pyproject.toml README.md ./
COPY common ./common
COPY api_gateway ./api_gateway

RUN poetry install --only main --no-interaction --no-ansi

EXPOSE 8000

CMD ["uvicorn", "api_gateway.main:app", "--host", "0.0.0.0", "--port", "8000"]
