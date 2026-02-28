# AI Code Review Platform

Automated code review platform — FastAPI + Celery pipeline with secret scanning, static analysis (Ruff + Semgrep), LLM summarization, vector search (Qdrant), and S3 object storage (MinIO).

---

## Table of Contents

1. [Repository Structure](#1-repository-structure)
2. [Architecture](#2-architecture)
3. [Requirements](#3-requirements)
4. [Getting Started](#4-getting-started)
5. [Services & Ports](#5-services--ports)
6. [Environment Variables](#6-environment-variables)
7. [Make Commands](#7-make-commands)
8. [Running Tests](#8-running-tests)
9. [Manual End-to-End Test](#9-manual-end-to-end-test)
10. [Database Migrations](#10-database-migrations)
11. [Webhook Local Testing](#11-webhook-local-testing)
12. [Local Process Mode (no Docker for API/worker)](#12-local-process-mode-no-docker-for-apiworker)
13. [CI/CD & Cloud Deployment](#13-cicd--cloud-deployment)
14. [Common Errors & Fixes](#14-common-errors--fixes)
15. [Security Notes](#15-security-notes)

---

## 1. Repository Structure

```text
ai-code-review-platform/
  apps/
    backend/          # FastAPI + Celery + Alembic + analysis pipeline
  infra/
    local/            # docker-compose.yml  (full local stack)
    observability/    # Prometheus config + Grafana provisioning + dashboards
    cloud/            # Fly.io TOML configs + cloud deployment guide
  docs/
    architecture.md   # Full architecture diagram
  .github/
    workflows/
      ci.yml          # Lint + test + Docker smoke test
      cd.yml          # Build → GHCR → Fly.io deploy
  Makefile            # All dev commands (make help)
  .env.example        # Environment variable template
```

---

## 2. Architecture

See [`docs/architecture.md`](docs/architecture.md) for the full diagram.

**Short summary:**

```
GitHub Webhook / REST client
        │
        ▼
  FastAPI :8000  →  Redis (broker)  →  Celery Worker
                                             │
                         ┌───────────────────┼──────────────────┐
                         ▼                   ▼                  ▼
                    PostgreSQL            Qdrant             MinIO
                    (results)         (vector search)    (artifacts)
                                             │
                                         OpenAI (optional)
```

Observability: Prometheus scrapes FastAPI, Flower, Redis, PostgreSQL, MinIO → Grafana (4 dashboards).

---

## 3. Requirements

| Tool | Version | Notes |
|------|---------|-------|
| Docker Desktop | latest | Must be running |
| Git | any | |
| Make | any | Windows: `choco install make` or use `winget install GnuWin32.Make` |
| Python | 3.11+ | Only needed for local process mode / tests without Docker |

---

## 4. Getting Started

### Step 1 — Clone

```bash
git clone https://github.com/<your-username>/ai-code-review-platform.git
cd ai-code-review-platform
```

### Step 2 — Create `.env`

```bash
# Linux / macOS / Git Bash
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Minimum required values for local dev (rest can stay as-is):

```env
GITHUB_WEBHOOK_SECRET=local-dev-secret
CELERY_WORKER_POOL=solo        # Windows host only; leave empty on Linux/macOS
```

Generate a Fernet encryption key (optional for dev):

```bash
make generate-fernet-key
# → paste the output into SECRETS_ENCRYPTION_KEY= in .env
```

### Step 3 — Build & start all services

```bash
make build
make up
```

### Step 4 — Apply database migrations

```bash
make migrate
```

### Step 5 — Verify

```bash
curl http://localhost:8000/healthz
# → {"status":"ok"}
```

Open the API docs in your browser: http://localhost:8000/docs

---

## 5. Services & Ports

After `make up`, all services are available at:

| Port | Service | URL |
|------|---------|-----|
| 8000 | FastAPI API | http://localhost:8000/docs |
| 8000 | Prometheus metrics | http://localhost:8000/metrics |
| 3000 | Grafana | http://localhost:3000 `admin / admin` |
| 9090 | Prometheus | http://localhost:9090 |
| 5555 | Flower (Celery UI) | http://localhost:5555 |
| 8080 | Adminer (DB UI) | http://localhost:8080 |
| 5432 | PostgreSQL | direct TCP |
| 6380 | Redis | `redis://localhost:6380` |
| 6333 | Qdrant REST + Dashboard | http://localhost:6333/dashboard |
| 6334 | Qdrant gRPC | `grpc://localhost:6334` |
| 9000 | MinIO S3 API | http://localhost:9000 |
| 9001 | MinIO Console | http://localhost:9001 `minioadmin / minioadmin` |
| 9121 | redis-exporter metrics | http://localhost:9121/metrics |
| 9187 | postgres-exporter metrics | http://localhost:9187/metrics |

---

## 6. Environment Variables

Copy `.env.example` to `.env`. Key variables:

### Core
| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+psycopg://...` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6380/0` | Redis URL (host port is 6380) |
| `CELERY_WORKER_POOL` | _(empty)_ | Set `solo` on Windows host, leave empty in Docker |

### GitHub Integration
| Variable | Description |
|----------|-------------|
| `GITHUB_WEBHOOK_SECRET` | HMAC secret for webhook validation |
| `GITHUB_APP_ID` | GitHub App ID |
| `GITHUB_APP_INSTALLATION_ID` | Installation ID |
| `GITHUB_APP_PRIVATE_KEY_PEM` | RSA private key (PEM format) |

### Optional Services
| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_ENABLED` | `false` | Enable OpenAI LLM summarization |
| `OPENAI_API_KEY` | _(empty)_ | OpenAI API key |
| `QDRANT_ENABLED` | `false` | Enable Qdrant vector search |
| `OBJECT_STORAGE_ENABLED` | `false` | Enable MinIO artifact storage |

### Security
| Variable | Default | Description |
|----------|---------|-------------|
| `SECRETS_ENCRYPTION_KEY` | _(empty)_ | Fernet key for encrypting secrets at rest |
| `RBAC_ENFORCEMENT_ENABLED` | `false` | Enable role-based access control |

---

## 7. Make Commands

```bash
make help               # Show all available commands
```

### Stack control
```bash
make build              # Build Docker images (with cache)
make build-no-cache     # Build Docker images (no cache)
make up                 # Start all services (detached)
make down               # Stop and remove containers
make ps                 # Show running service status
make clean              # Remove volumes + containers (DESTRUCTIVE)
```

### Database
```bash
make migrate            # Run: alembic upgrade head
make migrate-history    # Show Alembic migration history
make migrate-create m=<name>   # Create a new autogenerated migration
```

### Logs & shells
```bash
make logs               # Tail all container logs
make logs-api           # Tail API logs only
make logs-worker        # Tail worker logs only
make api-shell          # Open bash in API container
make worker-shell       # Open bash in worker container
make db-shell           # Open psql in DB container
```

### Testing
```bash
make test               # Run pytest (local Poetry env)
```

### Security
```bash
make generate-fernet-key   # Generate a SECRETS_ENCRYPTION_KEY value
```

---

## 8. Running Tests

```bash
# Via Makefile (recommended)
make test

# Directly with Poetry
cd apps/backend
poetry run pytest tests/ -v --tb=short

# One file
poetry run pytest tests/test_analyses.py -v
poetry run pytest tests/unit/test_static_analysis.py -v
```

Linting:
```bash
cd apps/backend
poetry run ruff check app tests
poetry run ruff format --check app tests
```

---

## 9. Manual End-to-End Test

### PowerShell
```powershell
$diff = @"
diff --git a/demo.py b/demo.py
index 1111111..2222222 100644
--- a/demo.py
+++ b/demo.py
@@ -0,0 +1,6 @@
+import os
+import subprocess
+
+def run(cmd: str):
+    return eval(cmd)
+
+def run2(cmd: str):
+    return subprocess.run(cmd, shell=True)
"@

$payload = @{
  source     = "manual"
  repo       = "owner/test-repo"
  pr_number  = 1
  commit_sha = "abc123"
  diff_text  = $diff
} | ConvertTo-Json -Depth 10

$r = Invoke-RestMethod -Uri "http://localhost:8000/v1/analyze" -Method Post `
     -ContentType "application/json" -Body $payload

$id = $r.analysis_id
Write-Host "Created analysis: $id"

for ($i = 1; $i -le 30; $i++) {
  $r = Invoke-RestMethod -Uri "http://localhost:8000/v1/analyses/$id"
  Write-Host "[$i] status=$($r.status)"
  if ($r.status -in @("COMPLETED", "FAILED")) { break }
  Start-Sleep -Seconds 2
}

$r.static_findings | Select-Object source, rule_id, severity, file_path, message | Format-Table -AutoSize
```

---

## 10. Database Migrations

```bash
# Apply all pending migrations
make migrate

# Show history
make migrate-history

# Create a new migration
make migrate-create m=add_new_table

# Run directly (from apps/backend)
cd apps/backend
poetry run alembic upgrade head
poetry run alembic current
poetry run alembic history
```

---

## 11. Webhook Local Testing

1. Start the stack: `make up && make migrate`
2. Expose the API with ngrok:
   ```bash
   ngrok http 8000
   ```
3. Set GitHub App webhook URL to `https://<ngrok-id>.ngrok-free.app/webhooks/github`
4. Set the same `GITHUB_WEBHOOK_SECRET` in your `.env` and GitHub App settings
5. Use **GitHub → App → Advanced → Redeliver** to replay events

---

## 12. Local Process Mode (no Docker for API/worker)

Use Docker only for infrastructure (DB + Redis), run API and worker directly on host.

```bash
# Start only core infra
docker compose -f infra/local/docker-compose.yml up -d db redis

# Apply migrations
cd apps/backend
poetry run alembic upgrade head

# Start API (terminal 1)
poetry run uvicorn app.main:app --reload --port 8000

# Start worker (terminal 2) — Windows
python -m celery -A app.workers.celery_app.celery_app worker \
  --loglevel=info -Q analyses -P solo

# Start worker (terminal 2) — Linux/macOS
poetry run celery -A app.workers.celery_app.celery_app worker \
  --loglevel=info -Q analyses
```

---

## 13. CI/CD & Cloud Deployment

### CI (GitHub Actions)

Runs automatically on every PR and push to `main`:
- `ruff check` + `ruff format --check`
- `pytest` (with PostgreSQL + Redis services)
- Docker build smoke test

### CD (GitHub Actions → Fly.io)

Runs on merge to `main`:
1. Build Docker image → push to GHCR
2. Deploy API to Fly.io (`ai-review-api`)
3. Deploy Worker to Fly.io (`ai-review-worker`)

**Cloud services used (100% free):**

| Component | Service | Free limit |
|-----------|---------|------------|
| PostgreSQL | Supabase | 500 MB, no CC |
| Redis | Upstash | 10 000 cmd/day |
| Compute | Fly.io | 3 VMs, scale-to-zero |
| Docker images | GHCR | Unlimited (public) |

See [`infra/cloud/README.md`](infra/cloud/README.md) for the full deployment guide.

**GitHub Actions secrets to configure** (Settings → Secrets → Actions):

| Secret | Description |
|--------|-------------|
| `FLY_API_TOKEN` | `flyctl auth token` |
| `PROD_DATABASE_URL` | Supabase connection string |
| `PROD_REDIS_URL` | Upstash Redis URL |
| `PROD_CELERY_RESULT_BACKEND` | Upstash Redis URL (db 1) |
| `PROD_GITHUB_WEBHOOK_SECRET` | Production webhook secret |
| `PROD_GITHUB_APP_ID` | GitHub App ID |
| `PROD_GITHUB_APP_PRIVATE_KEY_PEM` | RSA private key (PEM) |
| `PROD_SECRETS_ENCRYPTION_KEY` | Fernet key |

---

## 14. Common Errors & Fixes

### `No 'script_location' key found in configuration`
Run Alembic from the correct directory:
```bash
cd apps/backend
poetry run alembic upgrade head
```

### `cd ... positional parameter cannot be found` (Windows paths with spaces)
Quote the path:
```powershell
cd "C:\Users\Ahmed Amin Bejoui\Desktop\ai-code-review-platform\apps\backend"
```

### `celery: command not found`
Use the module form:
```bash
python -m celery -A app.workers.celery_app.celery_app worker --loglevel=info -Q analyses -P solo
```

### Status stuck at `QUEUED`
- Worker process is running
- `REDIS_URL` / `CELERY_BROKER_URL` point to the right host/port
- Worker is subscribed to the correct queue: `-Q analyses`
- `ANALYSIS_QUEUE_NAME=analyses` in `.env`

### Redis port conflict (`Bind 6379 failed`)
The compose file maps Redis to `6380:6379` on the host.
Use `REDIS_URL=redis://localhost:6380/0` in your host `.env`.

---

## 15. Security Notes

- Never commit `.env` with real secrets — it is in `.gitignore`.
- Rotate all tokens/keys immediately after any public exposure.
- API responses return `diff_redacted`, never the raw diff.
- `SECRETS_ENCRYPTION_KEY` uses Fernet (AES-128-CBC). Generate with `make generate-fernet-key`.
- `RBAC_ENFORCEMENT_ENABLED=false` by default — enable in production.
- `ALLOW_UNSAFE_DIFF_API=false` — never set to `true` in production.
