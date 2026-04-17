# Microservices

This directory contains the microservice decomposition of `apps/backend` (the legacy monolith).

## Services

| Service | Port | Status | Owns (URL prefixes) |
|---|---|---|---|
| `api_gateway` | 8000 | scaffolded | All external traffic. Routes to services; falls back to legacy. |
| `analysis_service` | 8001 | stub | `/v1/analyses`, `/v1/observability`, Celery `analyze_pr` |
| `kb_service` | 8002 | stub | `/v1/kb`, `/api/v1/rag/*`, `/api/v1/graphrag`, comprehension |
| `reviews_service` | 8003 | stub | `/api/v1/reviews`, `/v1/reviews/metrics`, `/v1/review-states`, `/v1/review-queue`, `/v1/jira`, `/ws/review-sessions` |
| `org_service` | 8004 | stub | `/organizations`, `/api/v1/teams`, `/api/v1/roles`, `/api/v1/structure`, `/v1/admin` |
| `config_service` | 8005 | stub | `/api/v1/projects`, `/v1/branches*`, `/api/v1/repositories`, `/api/v1/integrations`, `/api/v1/security`, `/api/v1/storage` |
| `notifications_service` | 8006 | stub | `/api/v1/notifications`, `/ws/notifications` |
| **legacy** (monolith) | 8100 | unchanged | Everything not yet extracted |

## Strangler-fig migration

The gateway initially proxies **100 % of traffic to the legacy monolith** on port `8100`. As services are extracted, their route prefixes are flipped in `api_gateway/routing.py`. The system never breaks end-to-end during migration.

## Running locally (native, no Docker)

```bash
# 1. Start infra (Postgres, Redis, Qdrant)
cd apps/backend && make infra-core-up

# 2. Start the legacy monolith on :8100 (not 8000)
make legacy-api     # runs uvicorn on :8100

# 3. Start the gateway on :8000
make gateway

# 4. (optional) Start any extracted service on its own port
make analysis-service
```

Frontend (`apps/dashboard`) calls `BACKEND_API_URL=http://localhost:8000` as before — no change.

## Running via Docker

```bash
docker compose -f docker-compose.services.yml up --build
```

## Shared code

- `common/` — Clerk auth, DB engine factory, settings base, logging, error handlers.
- `pyproject.toml` — single Poetry project for the whole services workspace.

## Database

All services share the same Postgres instance (per Step 7 of the migration brief: "KEEP same database initially"). Cross-service writes still go through the same repo classes; the split is process-level only.
