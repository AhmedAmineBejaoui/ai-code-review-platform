# Cloud Deployment Guide

100% free deployment using **Fly.io** (compute) + **Supabase** (PostgreSQL) + **Upstash** (Redis).

## Free Tier Limits

| Resource | Limit | Impact |
|---|---|---|
| Fly.io VMs | 3 shared-cpu-1x (160GB outbound/month) | 2 VMs used (api + worker) — 1 spare |
| Supabase DB | 500MB storage | ~1M analyses with typical diff sizes |
| Upstash Redis | 10,000 commands/day | ~1,600 tasks/day max |
| GitHub Actions | 2,000 min/month (private repo) | ~40 deploys/month |
| GHCR | 500MB/month (private repo) | Use public repo for unlimited |

---

## Prerequisites

| Tool | Install |
|------|---------|
| flyctl | https://fly.io/docs/hands-on/install-flyctl/ |
| Git | Already installed |
| Python + poetry | Already installed |

---

## Step 1: Create Free Accounts

### Supabase (PostgreSQL)

1. Go to https://supabase.com and sign up (GitHub login works)
2. Create organisation → New project → choose a region
3. Go to Settings → Database → **Connection string** (URI mode)
4. Copy the connection string (looks like `postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres`)
5. Replace `postgresql://` with `postgresql+psycopg://` for psycopg3 compatibility

### Upstash (Redis)

1. Go to https://upstash.com and sign up (GitHub login works)
2. Create Database → choose same region as Fly.io app
3. Copy the **Redis URL** (TLS format): `rediss://:password@xxx.upstash.io:6380`
4. Use this URL for `REDIS_URL` and `CELERY_BROKER_URL` (db 0)
5. For `CELERY_RESULT_BACKEND`, append `/1` to the URL (db 1)

### Fly.io

```bash
# Install flyctl and sign up (GitHub login, no credit card required)
flyctl auth signup
```

---

## Step 2: Generate Production Secrets

```bash
# 1. Fernet encryption key for secrets at rest (SECRETS_ENCRYPTION_KEY)
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# 2. Webhook secret (GITHUB_WEBHOOK_SECRET)
python -c "import secrets; print(secrets.token_hex(32))"
```

Or use the Makefile shortcut:

```bash
make generate-fernet-key
```

---

## Step 3: Create Fly.io Apps

Run these **once** — they create the apps without deploying yet:

```bash
flyctl apps create ai-review-api --machines
flyctl apps create ai-review-worker --machines
```

---

## Step 4: Set Production Secrets on Fly.io

Replace all `[PLACEHOLDER]` values with your actual credentials:

```bash
# ─── API app secrets ──────────────────────────────────────────────────────────
flyctl secrets set \
  DATABASE_URL="postgresql+psycopg://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres" \
  REDIS_URL="rediss://:password@xxx.upstash.io:6380/0" \
  CELERY_BROKER_URL="rediss://:password@xxx.upstash.io:6380/0" \
  CELERY_RESULT_BACKEND="rediss://:password@xxx.upstash.io:6380/1" \
  GITHUB_WEBHOOK_SECRET="[YOUR-WEBHOOK-SECRET]" \
  GITHUB_APP_ID="[YOUR-GITHUB-APP-ID]" \
  GITHUB_APP_PRIVATE_KEY_PEM="$(cat /path/to/private-key.pem)" \
  SECRETS_ENCRYPTION_KEY="[YOUR-FERNET-KEY]" \
  --app ai-review-api

# ─── Worker app secrets (same values, no webhook secret) ─────────────────────
flyctl secrets set \
  DATABASE_URL="postgresql+psycopg://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres" \
  REDIS_URL="rediss://:password@xxx.upstash.io:6380/0" \
  CELERY_BROKER_URL="rediss://:password@xxx.upstash.io:6380/0" \
  CELERY_RESULT_BACKEND="rediss://:password@xxx.upstash.io:6380/1" \
  GITHUB_APP_ID="[YOUR-GITHUB-APP-ID]" \
  GITHUB_APP_PRIVATE_KEY_PEM="$(cat /path/to/private-key.pem)" \
  SECRETS_ENCRYPTION_KEY="[YOUR-FERNET-KEY]" \
  --app ai-review-worker
```

---

## Step 5: Set GitHub Actions Secrets

In your GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Value |
|---|---|
| `FLY_API_TOKEN` | Output of `flyctl auth token` |
| `PROD_DATABASE_URL` | Full psycopg connection string from Supabase |
| `PROD_REDIS_URL` | Upstash Redis URL (db 0) |
| `PROD_CELERY_RESULT_BACKEND` | Upstash Redis URL (db 1, append `/1`) |
| `PROD_GITHUB_WEBHOOK_SECRET` | Your webhook secret |
| `PROD_GITHUB_APP_ID` | GitHub App ID |
| `PROD_GITHUB_APP_PRIVATE_KEY_PEM` | Full PEM content (multiline is OK) |
| `PROD_SECRETS_ENCRYPTION_KEY` | Fernet key from Step 2 |

---

## Step 6: Run Database Migrations

Run migrations once against Supabase before the first deploy:

```bash
# From the apps/backend directory
cd apps/backend

DATABASE_URL="postgresql+psycopg://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres" \
  poetry run alembic upgrade head
```

---

## Step 7: First Deploy

Push to `main` — the CD workflow triggers automatically and deploys both API and Worker.

Or deploy manually:

```bash
# Deploy API
flyctl deploy --config infra/cloud/fly/fly-api.toml

# Deploy Worker
flyctl deploy --config infra/cloud/fly/fly-worker.toml
```

---

## Verification

```bash
# Check API health
curl https://ai-review-api.fly.dev/healthz
# Expected: {"status":"ok"}

# Open API docs
# https://ai-review-api.fly.dev/docs

# Tail API logs
flyctl logs --app ai-review-api

# Tail worker logs
flyctl logs --app ai-review-worker

# View machine status
flyctl status --app ai-review-api
flyctl status --app ai-review-worker

# List secrets (keys only, not values)
flyctl secrets list --app ai-review-api
```

---

## GitHub Actions CD Workflow

After setup, every push to `main` will:

1. Build the Docker image from `apps/backend/Dockerfile`
2. Push it to `ghcr.io/<owner>/<repo>/backend:latest` and `:<sha>`
3. Set secrets on Fly.io (staged with the deploy, atomic)
4. Deploy API → wait for health check → Deploy Worker

No manual intervention needed after the initial setup.

---

## Upgrading from Free Tier

When you outgrow free limits:

| Component | Upgrade Path |
|-----------|-------------|
| Redis | Upstash pay-as-you-go ($0.20/100k commands) |
| PostgreSQL | Supabase Pro ($25/month, 8GB + PITR) |
| Compute | Fly.io pay-as-you-go (dedicated-cpu-1x ~$5/month per VM) |
| Images | Already unlimited on public repos via GHCR |
