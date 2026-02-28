# AI Code Review Platform

Backend-first monorepo for an automated code review platform:
- FastAPI API
- Celery worker pipeline
- PostgreSQL persistence
- Redis queue
- Diff parsing (unified diff)
- Secret detection + redaction
- Static analysis (Ruff + Semgrep)

This README is a complete operational guide with detailed commands.

## 1) Repository Structure

```text
ai-code-review-platform/
  apps/
    backend/        # FastAPI + Celery + Alembic + core pipeline
    dashboard/      # Frontend placeholder
    cli/            # CLI placeholder
  infra/
    local/          # docker-compose for local stack
    cloud/          # cloud infra placeholders
    observability/  # observability placeholders
  docs/
    manual-test-windows.md
    architecture.md
  t6_manual/
    demo.py         # manual static-analysis sample file
```

## 2) Implemented Features (Current State)

- T1: `/v1/analyze` intake endpoint + validations + DB insert + 202 response
- T2: relational schema with Alembic migrations
- T3: async worker pipeline (RECEIVED -> QUEUED -> RUNNING -> COMPLETED/FAILED)
- T4: unified diff parser with files/hunks/line mapping
- T5: secret scanning + redaction + security findings
- T6: static analysis with Ruff + Semgrep + changed-line filtering
- Tool run tracking: `tool_runs` table (status, duration, exit code, snippets, etc.)
- Optional workspace checkout for static analysis using repo + commit SHA

## 3) Core API Endpoints

- `GET /healthz`
- `POST /v1/analyze`
- `GET /v1/analyses/{analysis_id}`
- `GET /v1/analyses?page=1&size=20`
- `POST /v1/analyses/{analysis_id}/status`
- `POST /v1/analyses/{analysis_id}/findings`
- `POST /webhooks/github`
- `GET /__routes`

## 4) Requirements

- Python 3.11+
- Docker + Docker Compose (recommended for local infra)
- Git (required by static auto-checkout feature)

Backend dependencies are managed in `apps/backend/pyproject.toml` (Poetry format).

## 5) Environment Variables

Use root `.env.example` as base:

```powershell
Copy-Item .env.example .env
```

Most important keys:
- `DATABASE_URL=postgresql+psycopg://...`
- `REDIS_URL=redis://...`
- `CELERY_BROKER_URL=...`
- `CELERY_RESULT_BACKEND=...`
- `GITHUB_WEBHOOK_SECRET=...`
- `MAX_DIFF_BYTES=2000000`
- `SECRET_SCAN_*`
- `STATIC_ANALYSIS_*`
- `STATIC_ANALYSIS_WORKSPACE_PATH=.` (local fallback workspace)
- `STATIC_ANALYSIS_AUTO_CHECKOUT_ENABLED=true`
- `STATIC_ANALYSIS_REPO_HOST=github.com`
- `STATIC_ANALYSIS_GIT_TOKEN=` (optional token for private repo checkout)

## 6) Quick Start (Recommended: Docker)

### 6.1 Start infrastructure and app containers

From repo root:

```powershell
cd infra/local
docker compose up -d db redis api worker
```

### 6.2 Run migrations

```powershell
cd ../../apps/backend
python -m alembic upgrade head
python -m alembic current
```

### 6.3 Verify health

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/healthz" -Method Get
```

## 7) Quick Start (Local Process Mode, without API/worker Docker)

Use Docker only for DB + Redis, run API and worker directly on host.

### 7.1 Start DB and Redis

```powershell
cd infra/local
docker compose up -d db redis
```

### 7.2 Run migrations

```powershell
cd ../../apps/backend
python -m alembic upgrade head
```

### 7.3 Start API

```powershell
cd apps/backend
uvicorn app.main:app --reload --port 8000
```

### 7.4 Start worker (Windows-safe)

```powershell
cd apps/backend
python -m celery -A app.workers.celery_app.celery_app worker --loglevel=info -Q analyses -P solo
```

Linux/macOS:

```bash
cd apps/backend
celery -A app.workers.celery_app.celery_app worker --loglevel=info -Q analyses
```

## 8) Manual End-to-End Test

### 8.1 Quick script test

```powershell
cd apps/backend
python t6_manual/run_t6_test.py
```

Expected:
- status goes to `COMPLETED`
- `static_stats` has tool counters
- `static_findings` may contain Ruff/Semgrep findings

### 8.2 Manual API test (PowerShell)

```powershell
$diff = @"
diff --git a/t6_manual/demo.py b/t6_manual/demo.py
index 1111111..2222222 100644
--- a/t6_manual/demo.py
+++ b/t6_manual/demo.py
@@ -0,0 +1,8 @@
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
  source = "manual"
  repo = "owner/t6-manual-" + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  pr_number = 999
  commit_sha = "abc123"
  diff_text = $diff
  metadata = @{ actor = "manual-test" }
} | ConvertTo-Json -Depth 10

$create = Invoke-RestMethod -Uri "http://localhost:8000/v1/analyze" -Method Post -ContentType "application/json" -Body $payload
$analysisId = $create.analysis_id

for ($i=1; $i -le 40; $i++) {
  $r = Invoke-RestMethod -Uri "http://localhost:8000/v1/analyses/$analysisId" -Method Get
  Write-Host "[$i] status=$($r.status)"
  if ($r.status -in @("COMPLETED","FAILED")) { break }
  Start-Sleep -Seconds 2
}

$r.static_stats | ConvertTo-Json -Depth 10
$r.static_findings | Select-Object source,rule_id,severity,category,file_path,line_start,message | Format-Table -AutoSize
$r.tool_runs | Select-Object tool_name,status,duration_ms,exit_code,findings_count,warning | Format-Table -AutoSize
```

## 9) Static Analysis Checkout Behavior

Current behavior in worker static stage:

1. If `STATIC_ANALYSIS_AUTO_CHECKOUT_ENABLED=true` and valid `repo` + long enough `commit_sha`:
   - clone `https://<host>/<repo>.git`
   - fetch and checkout `commit_sha`
   - run Ruff/Semgrep in that checked-out workspace
2. Otherwise:
   - fallback to `STATIC_ANALYSIS_WORKSPACE_PATH`

For fake/manual repos, use short `commit_sha` like `abc123` to force safe local fallback.

## 10) Database Migrations

Run from `apps/backend` only:

```powershell
python -m alembic upgrade head
python -m alembic current
python -m alembic history
```

Create a new migration:

```powershell
python -m alembic revision -m "description"
```

## 11) Test Commands

From `apps/backend`:

```powershell
python -m pytest -q
```

Run one test file:

```powershell
python -m pytest tests/test_analyses.py -q
python -m pytest tests/unit/test_static_analysis.py -q
```

Optional tool checks:

```powershell
ruff check app tests
semgrep scan --config=auto --json --quiet .
```

## 12) Useful Operational Commands

### Docker

```powershell
cd infra/local
docker compose up -d
docker compose ps
docker compose logs -f api
docker compose logs -f worker
docker compose down
```

### PostgreSQL check

```powershell
docker exec -it ai-review-postgres psql -U postgres -d ai_code_review_platform
```

Inside psql:

```sql
\dt
SELECT id, status, created_at FROM analyses ORDER BY created_at DESC LIMIT 10;
SELECT tool_name, status, findings_count, duration_ms FROM tool_runs ORDER BY created_at DESC LIMIT 10;
```

### Redis check

```powershell
docker exec -it ai-review-redis redis-cli ping
```

## 13) Main Tables (Backend)

- `analyses`
- `files_changed`
- `analysis_files`
- `analysis_hunks`
- `analysis_hunk_lines`
- `findings`
- `tool_runs`
- `citations`
- `kb_documents`
- `kb_chunks`
- `policies`
- `audit_logs`

## 14) Common Errors and Fixes

### Error: `No 'script_location' key found in configuration`
Cause: running Alembic from wrong directory.
Fix:

```powershell
cd apps/backend
python -m alembic upgrade head
```

### Error: `cd ... A positional parameter cannot be found that accepts argument 'Amin'`
Cause: path has spaces and is not quoted.
Fix:

```powershell
cd "C:\Users\Ahmed Amin Bejoui\Desktop\ai-code-review-platform\apps\backend"
```

### Error: `celery: command not found`
Fix:
- Use module form:

```powershell
python -m celery -A app.workers.celery_app.celery_app worker --loglevel=info -Q analyses -P solo
```

### Status stuck at `QUEUED`
Checklist:
- worker process is running
- Redis broker URL is correct
- queue name matches `ANALYSIS_QUEUE_NAME=analyses`
- worker subscribed to queue `-Q analyses`

### Redis port conflict (`Bind ... 6379 failed`)
Your compose maps Redis to `6380:6379`.
Use `REDIS_URL=redis://localhost:6380/0` in host environment.

## 15) Webhook Local Testing (GitHub + ngrok)

1. Start API at `http://localhost:8000`
2. Expose with ngrok:

```bash
ngrok http 8000
```

3. Set GitHub App webhook URL:
`https://<ngrok-id>.ngrok-free.app/webhooks/github`
4. Configure same `GITHUB_WEBHOOK_SECRET` in GitHub App and `.env`
5. Use GitHub "Ping" or "Redeliver" to test.

## 16) Security Notes

- Never commit `.env` with real secrets.
- Rotate tokens/keys after public exposure.
- API output returns redacted diff (`diff_redacted`), not raw diff.
- Avoid logging raw secrets in worker/API logs.

## 17) Current Placeholders

- `apps/dashboard` is minimal placeholder.
- `apps/cli` is minimal placeholder.
- `apps/backend/app/api/http/knowledge_base.py` is currently empty.

## 18) Fast Command Cheat Sheet

```powershell
# 1) Infra up
cd infra/local
docker compose up -d db redis

# 2) Migrate
cd ../../apps/backend
python -m alembic upgrade head

# 3) Run API
uvicorn app.main:app --reload --port 8000

# 4) Run worker (new terminal)
python -m celery -A app.workers.celery_app.celery_app worker --loglevel=info -Q analyses -P solo

# 5) Run tests
python -m pytest -q
```
