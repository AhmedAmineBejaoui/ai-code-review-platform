# Architecture

## High-Level Overview

```
                         ┌─────────────────────────────────────────────┐
                         │              EXTERNAL CLIENTS                │
                         │                                              │
                         │  GitHub Webhooks    REST API Consumers       │
                         │  (HMAC-SHA256)      (JWT / API Key)          │
                         └──────────────────┬──────────────────────────┘
                                            │ HTTPS
                                            ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           LOCAL DOCKER NETWORK (ai-review-net)                │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                     FastAPI (port 8000)                               │    │
│  │                                                                       │    │
│  │  POST /webhooks/github   →  validate HMAC → enqueue Celery task      │    │
│  │  POST /analyses          →  auth middleware → enqueue Celery task     │    │
│  │  GET  /analyses/{id}     →  auth middleware → query PostgreSQL        │    │
│  │  GET  /metrics           →  Prometheus exposition (prom-instrumentator)│   │
│  │  GET  /healthz           →  liveness probe                            │    │
│  │                                                                       │    │
│  │  Middleware stack:                                                     │    │
│  │    CORS → Request-ID → Auth (JWT/GitHub JWT) → RBAC (optional)       │    │
│  └───────────────────────────────┬───────────────────────────────────────┘   │
│                                  │ enqueue                                    │
│                                  ▼                                            │
│  ┌─────────────────┐    ┌─────────────────────────────────────────────────┐  │
│  │   Redis :6379   │◄──►│            Celery Worker (port n/a)             │  │
│  │  (broker DB0)   │    │                                                  │  │
│  │  (result DB1)   │    │  analyze_pr task                                 │  │
│  └─────────────────┘    │    1. Fetch diff  (GitHub App JWT)               │  │
│         ▲               │    2. Secret scan (entropy + regex)              │  │
│         │               │    3. Static analysis (Ruff + Semgrep)           │  │
│  ┌──────┴──────┐        │    4. LLM summarize (OpenAI ──► optional)        │  │
│  │  Flower     │        │    5. Vector search (Qdrant ──► optional)        │  │
│  │  :5555      │        │    6. Persist results → PostgreSQL               │  │
│  └─────────────┘        │    7. Store artifacts → MinIO (optional)        │  │
│                         └──────────────────────────┬────────────────────────┘│
│                                                     │                         │
│            ┌────────────────────┬───────────────────┴──────────────────────┐ │
│            ▼                    ▼                   ▼                       │ │
│  ┌──────────────────┐  ┌─────────────────┐  ┌──────────────────────────┐  │ │
│  │  PostgreSQL :5432 │  │  Qdrant  :6333  │  │  MinIO   :9000 / :9001  │  │ │
│  │  (18 tables,      │  │  (vector store, │  │  (S3-compat object store │  │ │
│  │   Alembic ORM)    │  │   KB embeddings)│  │   analysis artifacts)    │  │ │
│  └──────────────────┘  └─────────────────┘  └──────────────────────────┘  │ │
│            │                                                                  │
│  ┌─────────┴──────────────────────────────────────────┐                      │
│  │            OBSERVABILITY STACK                      │                      │
│  │                                                     │                      │
│  │  Prometheus :9090  ←  scrape /metrics (fastapi)     │                      │
│  │                    ←  scrape :5555/metrics (flower) │                      │
│  │                    ←  scrape :9121 (redis-exporter) │                      │
│  │                    ←  scrape :9187 (pg-exporter)    │                      │
│  │                    ←  scrape :9000/minio/v2/metrics │                      │
│  │                                                     │                      │
│  │  Grafana   :3000   →  4 dashboards (FastAPI,        │                      │
│  │                        Redis, Celery, PostgreSQL)   │                      │
│  │                                                     │                      │
│  │  Adminer   :8080   →  PostgreSQL web UI             │                      │
│  └─────────────────────────────────────────────────────┘                      │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Analysis Pipeline (per PR)

```
GitHub Webhook
      │
      ▼
  [FastAPI] validate HMAC-SHA256
      │
      ▼
  Redis broker ──► Celery Worker
                        │
              ┌─────────┼──────────────────────┐
              ▼         ▼                       ▼
        Fetch diff   Secret scan           Static analysis
        (GitHub App   entropy > 3.8         Ruff (linting)
         JWT auth)    + regex patterns      Semgrep (SAST)
              │
              ▼
        LLM Summary  ◄── OpenAI gpt-4o-mini (optional, LLM_ENABLED)
              │
              ▼
        Vector Search ◄── Qdrant KB rules (optional, QDRANT_ENABLED)
              │
              ▼
        Persist ──► PostgreSQL (analyses + findings tables)
              │
              ▼
        Artifacts ──► MinIO / S3 (optional, OBJECT_STORAGE_ENABLED)
```

---

## Security Model

```
Authentication
  ├── GitHub App JWT (RS256)         — webhook + diff fetch
  ├── API Key (header X-API-Key)     — external consumers
  └── JWT Bearer (HS256)             — internal services

Authorisation
  └── RBAC (optional RBAC_ENFORCEMENT_ENABLED)
      ├── admin    → full access
      ├── reviewer → read + write analyses
      └── viewer   → read-only

Secrets at rest
  └── Fernet AES-128 encryption (SECRETS_ENCRYPTION_KEY)

Diff safety
  ├── MAX_DIFF_BYTES=2MB cap
  ├── PURGE_RAW_DIFF_AFTER_REDACTION
  └── ALLOW_UNSAFE_DIFF_API=false
```

---

## CI/CD & Cloud

```
Developer
    │  git push / PR
    ▼
GitHub Actions
    ├── CI  (every PR)
    │     lint (ruff)  →  pytest  →  docker build smoke
    │
    └── CD  (merge to main)
          build image  →  push GHCR
               │
               ├── fly deploy ai-review-api    (Fly.io, scale-to-zero)
               └── fly deploy ai-review-worker (Fly.io, scale-to-zero)

Cloud services (100% free tier)
  ┌────────────────┬────────────────────────────────────────────┐
  │ Component      │ Service                                    │
  ├────────────────┼────────────────────────────────────────────┤
  │ PostgreSQL     │ Supabase (500 MB, no CC required)          │
  │ Redis          │ Upstash  (10 000 cmd/day, 256 MB)          │
  │ Compute API    │ Fly.io   (3 shared VMs, 160 GB/month)      │
  │ Compute Worker │ Fly.io   (same allowance)                  │
  │ Docker images  │ GHCR     (unlimited, public repo)          │
  └────────────────┴────────────────────────────────────────────┘
```

---

## Port Reference (local dev)

| Port | Service           | URL / Note                        |
|------|-------------------|-----------------------------------|
| 8000 | FastAPI API       | http://localhost:8000/docs        |
| 8000 | Prometheus metrics| http://localhost:8000/metrics     |
| 5555 | Flower            | http://localhost:5555             |
| 9090 | Prometheus        | http://localhost:9090             |
| 3000 | Grafana           | http://localhost:3000 (admin/admin)|
| 8080 | Adminer           | http://localhost:8080             |
| 5432 | PostgreSQL        | (direct TCP)                      |
| 6380 | Redis             | redis://localhost:6380            |
| 6333 | Qdrant REST       | http://localhost:6333/dashboard   |
| 6334 | Qdrant gRPC       | (grpc://localhost:6334)           |
| 9000 | MinIO S3 API      | http://localhost:9000             |
| 9001 | MinIO Console     | http://localhost:9001 (minioadmin/minioadmin)|
| 9121 | redis-exporter    | http://localhost:9121/metrics     |
| 9187 | postgres-exporter | http://localhost:9187/metrics     |
