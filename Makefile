# ─── AI Code Review Platform ─── Dev Makefile ────────────────────────────────
# All commands use the local docker-compose stack.
# Run `make help` to see all available targets.

.PHONY: help up down build build-no-cache migrate migrate-history \
        migrate-create logs logs-api logs-worker test test-ci api-shell \
        worker-shell generate-fernet-key ps clean db-shell dev-backend-ngrok \
        prod-build prod-up prod-down prod-logs prod-migrate

COMPOSE_FILE = infra/local/docker-compose.yml
COMPOSE      = docker compose --env-file .env -f $(COMPOSE_FILE)
PROD_COMPOSE_FILE = infra/cloud/oracle/docker-compose.prod.yml
PROD_ENV_FILE = infra/cloud/oracle/.env.prod
PROD_COMPOSE = docker compose -f $(PROD_COMPOSE_FILE) --env-file $(PROD_ENV_FILE)
BACKEND_DIR  = apps/backend
MINIO_API_PORT ?= 9000
MINIO_CONSOLE_PORT ?= 9001
GRAFANA_PORT ?= 3000

# Default target
help:
	@echo ""
	@echo "  AI Code Review Platform - Dev Commands"
	@echo ""
	@echo "  Stack Control"
	@echo "  -----------------------------------------------------"
	@echo "  make up                 Start all services (detached)"
	@echo "  make down               Stop and remove containers"
	@echo "  make build              Build Docker images (with cache)"
	@echo "  make build-no-cache     Build Docker images (no cache)"
	@echo "  make ps                 Show running service status"
	@echo "  make clean              Remove volumes + containers (DESTRUCTIVE)"
	@echo ""
	@echo "  Development"
	@echo "  -----------------------------------------------------"
	@echo "  make migrate            Run Alembic: upgrade head"
	@echo "  make migrate-history    Show Alembic migration history"
	@echo "  make migrate-create m=  Create new migration (m=<name>)"
	@echo "  make dev-backend-ngrok  Start ngrok, rewrite env URLs, then run backend"
	@echo "  make test               Run pytest (local Poetry env)"
	@echo "  make logs               Tail all container logs"
	@echo "  make logs-api           Tail API logs only"
	@echo "  make logs-worker        Tail worker logs only"
	@echo ""
	@echo "  Shells"
	@echo "  -----------------------------------------------------"
	@echo "  make api-shell          Enter running API container"
	@echo "  make worker-shell       Enter running worker container"
	@echo "  make db-shell           psql in DB container"
	@echo ""
	@echo "  Production (Oracle)"
	@echo "  -----------------------------------------------------"
	@echo "  make prod-build         Build prod API/worker images"
	@echo "  make prod-migrate       Run Alembic migrations in prod stack"
	@echo "  make prod-up            Start prod stack (api+worker+caddy)"
	@echo "  make prod-down          Stop prod stack"
	@echo "  make prod-logs          Tail prod stack logs"
	@echo ""
	@echo "  Security"
	@echo "  -----------------------------------------------------"
	@echo "  make generate-fernet-key  Generate SECRETS_ENCRYPTION_KEY"
	@echo ""

# ─── Stack Control ────────────────────────────────────────────────────────────

up:
	$(COMPOSE) up -d
	@echo ""
	@echo "  Services started:"
	@echo "  -------------------------------------------------------"
	@echo "  API:            http://localhost:8000"
	@echo "  API Docs:       http://localhost:8000/docs"
	@echo "  API Metrics:    http://localhost:8000/metrics"
	@echo "  Grafana:        http://localhost:$(GRAFANA_PORT)   (admin / admin)"
	@echo "  Prometheus:     http://localhost:9090"
	@echo "  Flower:         http://localhost:5555"
	@echo "  Adminer:        http://localhost:8080"
	@echo "  Qdrant:         http://localhost:6333/dashboard"
	@echo "  MinIO Console:  http://localhost:$(MINIO_CONSOLE_PORT)   (minioadmin / minioadmin)"
	@echo "  MinIO S3 API:   http://localhost:$(MINIO_API_PORT)"
	@echo "  -------------------------------------------------------"
	@echo "  Hint: run 'make migrate' to apply DB migrations."
	@echo ""

down:
	$(COMPOSE) down

build:
	$(COMPOSE) build

build-no-cache:
	$(COMPOSE) build --no-cache

ps:
	$(COMPOSE) ps

clean:
	@echo "WARNING: This will delete all volumes including database data."
	$(COMPOSE) down -v --remove-orphans

# ─── Database Migrations ──────────────────────────────────────────────────────

migrate:
	$(COMPOSE) exec api alembic -c /app/alembic.ini upgrade head

migrate-history:
	$(COMPOSE) exec api alembic -c /app/alembic.ini history --verbose

migrate-create:
	@if [ -z "$(m)" ]; then echo "Usage: make migrate-create m=<migration_name>"; exit 1; fi
	$(COMPOSE) exec api alembic -c /app/alembic.ini revision --autogenerate -m "$(m)"

# ─── Testing ──────────────────────────────────────────────────────────────────

test:
	cd $(BACKEND_DIR) && poetry run pytest tests/ -v --tb=short

test-ci:
	cd $(BACKEND_DIR) && poetry run pytest tests/ -v --tb=short --no-header -q

dev-backend-ngrok:
	python scripts/dev_backend_ngrok.py

# ─── Logs ─────────────────────────────────────────────────────────────────────

logs:
	$(COMPOSE) logs -f

logs-api:
	$(COMPOSE) logs -f api

logs-worker:
	$(COMPOSE) logs -f worker

# ─── Shells ───────────────────────────────────────────────────────────────────

api-shell:
	$(COMPOSE) exec api bash

worker-shell:
	$(COMPOSE) exec worker bash

db-shell:
	$(COMPOSE) exec db psql -U postgres -d ai_code_review_platform

# ─── Security Utilities ───────────────────────────────────────────────────────

generate-fernet-key:
	@python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# ——— Oracle Production Helpers ——————————————————————————————————————————————
prod-build:
	$(PROD_COMPOSE) build

prod-migrate:
	$(PROD_COMPOSE) run --rm api alembic -c /app/alembic.ini upgrade head

prod-up:
	$(PROD_COMPOSE) up -d

prod-down:
	$(PROD_COMPOSE) down

prod-logs:
	$(PROD_COMPOSE) logs -f
