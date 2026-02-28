# ─── AI Code Review Platform ─── Dev Makefile ────────────────────────────────
# All commands use the local docker-compose stack.
# Run `make help` to see all available targets.

.PHONY: help up down build build-no-cache migrate migrate-history \
        migrate-create logs logs-api logs-worker test test-ci api-shell \
        worker-shell generate-fernet-key ps clean db-shell

COMPOSE_FILE = infra/local/docker-compose.yml
COMPOSE      = docker compose -f $(COMPOSE_FILE)
BACKEND_DIR  = apps/backend

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
	@echo "  Grafana:        http://localhost:3000   (admin / admin)"
	@echo "  Prometheus:     http://localhost:9090"
	@echo "  Flower:         http://localhost:5555"
	@echo "  Adminer:        http://localhost:8080"
	@echo "  Qdrant:         http://localhost:6333/dashboard"
	@echo "  MinIO Console:  http://localhost:9001   (minioadmin / minioadmin)"
	@echo "  MinIO S3 API:   http://localhost:9000"
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
