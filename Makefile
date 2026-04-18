# ─── AI Code Review Platform ─── Dev Makefile ────────────────────────────────
# All commands use the local docker-compose stack.
# Run `make help` to see all available targets.

.PHONY: help up down build build-no-cache migrate migrate-history \
        migrate-create logs logs-api logs-worker test test-ci api-shell \
        worker-shell generate-fernet-key ps clean db-shell dev-backend-ngrok \
        dev-backend-cloudflare infra-core-up infra-core-down host-migrate \
        host-api host-api-no-reload host-api-prod host-worker legacy-api \
        prod-build prod-up prod-down prod-logs prod-migrate \
        langchain-parity langchain-qdrant-aliases langchain-promote langchain-rollback \
        svc-install svc-gateway svc-up svc-down svc-build svc-logs svc-ps \
        svc-health svc-routes \
        svc-run-analysis svc-run-kb svc-run-reviews svc-run-org svc-run-config svc-run-notifications

COMPOSE_FILE = infra/local/docker-compose.yml
COMPOSE_MINIMAL_FILE = infra/local/docker-compose.minimal.yml
COMPOSE      = docker compose --env-file .env -f $(COMPOSE_FILE)
COMPOSE_MINIMAL = docker compose --env-file .env -f $(COMPOSE_MINIMAL_FILE)
PROD_COMPOSE_FILE = infra/vps/docker-compose.yml
PROD_ENV_FILE ?= infra/vps/.env.vps
PROD_COMPOSE = docker compose --env-file $(PROD_ENV_FILE) -f $(PROD_COMPOSE_FILE)
BACKEND_DIR  = apps/backend
# Microservices (legacy attempt, kept for reference — will be deleted after full migration)
MICRO_COMPOSE_FILE = services-legacy-attempt/docker-compose.yml
MICRO_COMPOSE = docker compose --env-file .env -f $(MICRO_COMPOSE_FILE)

# Microservices (new strangler-fig migration — step 1 of the refactor)
SVC_DIR              = apps/services
SVC_COMPOSE_FILE     = docker-compose.services.yml
SVC_COMPOSE          = docker compose --env-file .env -f $(SVC_COMPOSE_FILE)
MINIO_API_PORT ?= 9000
MINIO_CONSOLE_PORT ?= 9001
GRAFANA_PORT ?= 3000
UVICORN_DEV_ENV = WATCHFILES_FORCE_POLLING=$${WATCHFILES_FORCE_POLLING:-true}
UVICORN_RELOAD_ARGS = --reload --reload-dir app --reload-dir alembic --reload-exclude "__pycache__/*" --reload-exclude "*.py[cod]" --reload-exclude "*.log" --reload-exclude ".ruff_cache/*" --reload-exclude ".pytest_cache/*" --reload-exclude ".venv/*" --reload-delay 0.75

# Default target
help:
	@echo ""
	@echo "  AI Code Review Platform - Dev Commands"
	@echo ""
	@echo "  Stack Control"
	@echo "  -----------------------------------------------------"
	@echo "  make up                 Start all services (detached)"
	@echo "  make up-minimal         Start minimal services only (db+redis+qdrant)"
	@echo "  make down               Stop and remove containers"
	@echo "  make down-minimal       Stop minimal services"
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
	@echo "  make dev-backend-cloudflare  Start Cloudflare Quick Tunnel, rewrite env URL hints, then run backend"
	@echo "  make infra-core-up      Start only db + redis + qdrant locally"
	@echo "  make infra-core-down    Stop only db + redis + qdrant locally"
	@echo "  make host-migrate       Run Alembic on the host Poetry env"
	@echo "  make host-api           Run uvicorn on the host Poetry env with stable reload"
	@echo "  make host-api-no-reload Run uvicorn on the host Poetry env without reload"
	@echo "  make host-api-prod      Alias for host-api-no-reload"
	@echo "  make host-worker        Run the Celery worker on the Windows host with -P solo"
	@echo "  make test               Run pytest (local Poetry env)"
	@echo "  make langchain-parity   Build a corpus-wide LangChain parity report"
	@echo "  make langchain-qdrant-aliases  Show LangChain Qdrant alias targets"
	@echo "  make langchain-promote collection=<name>  Promote active LangChain alias"
	@echo "  make langchain-rollback collection=<name> Roll back active LangChain alias"
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
	@echo "  Production / VPS"
	@echo "  -----------------------------------------------------"
	@echo "  make prod-build         Build VPS images"
	@echo "  make prod-migrate       Run Alembic migrations in VPS stack"
	@echo "  make prod-up            Start VPS stack (caddy+dashboard+api+worker)"
	@echo "  make prod-down          Stop prod stack"
	@echo "  make prod-logs          Tail prod stack logs"
	@echo ""
	@echo "  Security"
	@echo "  -----------------------------------------------------"
	@echo "  make generate-fernet-key  Generate SECRETS_ENCRYPTION_KEY"
	@echo ""
	@echo "  Microservices (legacy attempt — services-legacy-attempt/)"
	@echo "  -----------------------------------------------------"
	@echo "  make micro-build        Build legacy-attempt microservice images"
	@echo "  make micro-up           Start legacy-attempt microservices stack"
	@echo "  make micro-down         Stop legacy-attempt microservices stack"
	@echo "  make micro-logs         Show legacy-attempt microservices logs"
	@echo "  make micro-validate     Validate legacy-attempt microservices health"
	@echo ""
	@echo "  Microservices v2 — strangler-fig (apps/services/)"
	@echo "  -----------------------------------------------------"
	@echo "  make svc-install        Poetry-install apps/services deps"
	@echo "  make legacy-api         Run legacy monolith on :8100 (for gateway use)"
	@echo "  make svc-gateway        Run API gateway on :8000 (host, reload)"
	@echo "  make svc-run-<svc>      Run a single service host-side (analysis|kb|reviews|org|config|notifications)"
	@echo "  make svc-build          docker compose build (all services v2)"
	@echo "  make svc-up             docker compose up -d (all services v2)"
	@echo "  make svc-down           docker compose down (all services v2)"
	@echo "  make svc-logs           Tail services v2 logs"
	@echo "  make svc-health         Smoke-test gateway + every stub"
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

up-minimal:
	$(COMPOSE_MINIMAL) up -d
	@echo ""
	@echo "  Minimal services started:"
	@echo "  -------------------------------------------------------"
	@echo "  PostgreSQL:     localhost:5432    (postgres / simplepass)"
	@echo "  Redis:          localhost:6380"
	@echo "  Qdrant:         http://localhost:6333/dashboard"
	@echo "  -------------------------------------------------------"
	@echo "  Hint: run 'make host-migrate' then 'make host-api' to start backend."
	@echo ""

down:
	$(COMPOSE) down

down-minimal:
	$(COMPOSE_MINIMAL) down

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
	python tools/dev/dev_backend_ngrok.py

dev-backend-cloudflare:
	python tools/dev/dev_backend_cloudflare.py

infra-core-up:
	$(COMPOSE) up -d db redis qdrant

infra-core-down:
	$(COMPOSE) stop db redis qdrant

host-migrate:
	cd $(BACKEND_DIR) && poetry run alembic -c alembic.ini upgrade head

host-api:
	cd $(BACKEND_DIR) && $(UVICORN_DEV_ENV) poetry run uvicorn app.main:app $(UVICORN_RELOAD_ARGS) --port 8000

host-api-no-reload:
	cd $(BACKEND_DIR) && poetry run uvicorn app.main:app --port 8000

host-api-prod: host-api-no-reload

host-worker:
	cd $(BACKEND_DIR) && poetry run python -m celery -A app.workers.celery_app.celery_app worker --loglevel=info -Q analyses -P solo

# Legacy monolith on :8100 — used together with the new API gateway on :8000.
# Keeps `make host-api` unchanged so existing workflows are not disrupted.
legacy-api:
	cd $(BACKEND_DIR) && $(UVICORN_DEV_ENV) poetry run uvicorn app.main:app $(UVICORN_RELOAD_ARGS) --port $${LEGACY_BACKEND_PORT:-8100}

langchain-parity:
	cd $(BACKEND_DIR) && poetry run python ../../tools/kb/langchain_parity_report.py

langchain-qdrant-aliases:
	cd $(BACKEND_DIR) && poetry run python ../../tools/kb/langchain_qdrant_aliases.py show

langchain-promote:
	@if [ -z "$(collection)" ]; then echo "Usage: make langchain-promote collection=<collection_name>"; exit 1; fi
	cd $(BACKEND_DIR) && poetry run python ../../tools/kb/langchain_qdrant_aliases.py promote --collection "$(collection)"

langchain-rollback:
	@if [ -z "$(collection)" ]; then echo "Usage: make langchain-rollback collection=<collection_name>"; exit 1; fi
	cd $(BACKEND_DIR) && poetry run python ../../tools/kb/langchain_qdrant_aliases.py rollback --collection "$(collection)"

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

# ——— Microservices Stack ——————————————————————————————————————————————
micro-build:
	$(MICRO_COMPOSE) build

micro-up:
	$(MICRO_COMPOSE) up -d
	@echo ""
	@echo "  Microservices started:"
	@echo "  -------------------------------------------------------"
	@echo "  API Gateway:     http://localhost:8000"
	@echo "  Auth Service:    http://localhost:8001"
	@echo "  Analysis:        http://localhost:8002"
	@echo "  Review Service:  http://localhost:8003"
	@echo "  RAG Service:     http://localhost:8004"
	@echo "  Notifications:   http://localhost:8005"
	@echo "  -------------------------------------------------------"
	@echo "  Hint: run 'make micro-validate' to check health."
	@echo ""

micro-down:
	$(MICRO_COMPOSE) down

micro-logs:
	$(MICRO_COMPOSE) logs -f

micro-validate:
	@bash services-legacy-attempt/scripts/validate-system.sh

micro-migrate:
	$(MICRO_COMPOSE) exec auth-service python -c "from app.data.models import Base; from sqlalchemy import create_engine; import os; Base.metadata.create_all(create_engine(os.getenv('DATABASE_URL')))"

# ——— Microservices v2 — strangler-fig migration ———————————————————————
# Layout: apps/services/{api_gateway,analysis_service,kb_service,...}
# Gateway: :8000 (what the frontend already talks to)
# Legacy monolith: :8100 (run via `make legacy-api`)

svc-install:
	cd $(SVC_DIR) && poetry install --no-root

# Host-native runs (each in its own terminal).
svc-gateway:
	cd $(SVC_DIR) && poetry run uvicorn api_gateway.main:app --reload --port $${GATEWAY_PORT:-8000}

svc-run-analysis:
	cd $(SVC_DIR) && poetry run uvicorn analysis_service.main:app --reload --port $${ANALYSIS_SERVICE_PORT:-8001}

svc-run-kb:
	cd $(SVC_DIR) && poetry run uvicorn kb_service.main:app --reload --port $${KB_SERVICE_PORT:-8002}

svc-run-reviews:
	cd $(SVC_DIR) && poetry run uvicorn reviews_service.main:app --reload --port $${REVIEWS_SERVICE_PORT:-8003}

svc-run-org:
	cd $(SVC_DIR) && poetry run uvicorn org_service.main:app --reload --port $${ORG_SERVICE_PORT:-8004}

svc-run-config:
	cd $(SVC_DIR) && poetry run uvicorn config_service.main:app --reload --port $${CONFIG_SERVICE_PORT:-8005}

svc-run-notifications:
	cd $(SVC_DIR) && poetry run uvicorn notifications_service.main:app --reload --port $${NOTIFICATIONS_SERVICE_PORT:-8006}

# Docker runs.
svc-build:
	$(SVC_COMPOSE) build

svc-up:
	$(SVC_COMPOSE) up -d
	@echo ""
	@echo "  Services v2 started (docker):"
	@echo "  -------------------------------------------------------"
	@echo "  API Gateway:         http://localhost:$${GATEWAY_PORT:-8000}"
	@echo "  Analysis stub:       http://localhost:$${ANALYSIS_SERVICE_PORT:-8001}/healthz"
	@echo "  KB stub:             http://localhost:$${KB_SERVICE_PORT:-8002}/healthz"
	@echo "  Reviews stub:        http://localhost:$${REVIEWS_SERVICE_PORT:-8003}/healthz"
	@echo "  Org stub:            http://localhost:$${ORG_SERVICE_PORT:-8004}/healthz"
	@echo "  Config stub:         http://localhost:$${CONFIG_SERVICE_PORT:-8005}/healthz"
	@echo "  Notifications stub:  http://localhost:$${NOTIFICATIONS_SERVICE_PORT:-8006}/healthz"
	@echo "  -------------------------------------------------------"
	@echo "  Hint: the gateway expects the legacy monolith on :$${LEGACY_BACKEND_PORT:-8100}."
	@echo "        Start it with 'make legacy-api' in another terminal."
	@echo ""

svc-down:
	$(SVC_COMPOSE) down

svc-logs:
	$(SVC_COMPOSE) logs -f

svc-ps:
	$(SVC_COMPOSE) ps

# Lightweight smoke test — hits /healthz on the gateway + each stub.
svc-health:
	@python3 $(SVC_DIR)/scripts/smoke_test.py
