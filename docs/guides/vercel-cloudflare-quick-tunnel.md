# Vercel + Backend Local + Cloudflare Quick Tunnel

This deployment keeps the dashboard in the cloud while running the backend stack on the local Windows host.

Target topology:

- Vercel: `apps/dashboard`
- Clerk: production auth for the dashboard and backend JWT validation
- Windows host: FastAPI API, Celery worker, Ollama
- Docker Desktop: PostgreSQL, Redis, Qdrant
- Cloudflare Quick Tunnel: public HTTPS URL for the local backend on port `8000`

## 1. Prepare the local backend env

Required `.env` values at repo root:

```env
DATABASE_URL=postgresql+psycopg://postgres:simplepass@localhost:5432/ai_code_review_platform
REDIS_URL=redis://localhost:6380/0
CELERY_BROKER_URL=redis://localhost:6380/0
CELERY_RESULT_BACKEND=redis://localhost:6380/1
QDRANT_ENABLED=true
QDRANT_URL=http://localhost:6333
OLLAMA_BASE_URL=http://localhost:11434
CLERK_AUTH_ENABLED=true
CLERK_ISSUER_URL=https://<your-clerk-instance>.clerk.accounts.dev
RBAC_ENFORCEMENT_ENABLED=true
SECRETS_ENCRYPTION_KEY=<generated-key>
REPO_CONTEXT_ALLOWED_ROOTS=C:\Users\Ahmed Amin Bejoui\Desktop\ai-code-review-platform
```

Notes:

- Keep `api` and `worker` on the host so `OLLAMA_BASE_URL=http://localhost:11434` stays valid.
- Do not run the `api` or `worker` services from `infra/local/docker-compose.yml` in this mode.

## 2. Start only the core local infra

```bash
make infra-core-up
```

This starts:

- PostgreSQL
- Redis
- Qdrant

## 3. Run migrations on the host

```bash
make host-migrate
```

## 4. Start the API on the host

Development mode:

```bash
make host-api
```

More stable host mode:

```bash
make host-api-prod
```

## 5. Start the Celery worker on the host

```bash
make host-worker
```

The Windows host worker uses `-P solo`, which is the supported local mode for this project on Windows.

## 6. Ensure Ollama is running

The backend and worker expect Ollama at:

```env
OLLAMA_BASE_URL=http://localhost:11434
```

Start Ollama on the host before testing the dashboard flows that depend on local model inference.

## 7. Start a Cloudflare Quick Tunnel

Make sure `cloudflared` is installed and on `PATH`, then run:

```bash
make dev-backend-cloudflare
```

This helper:

- starts a Quick Tunnel to `http://127.0.0.1:8000`
- extracts the public `https://<random>.trycloudflare.com` URL
- updates `.env` with:
  - `BASE_URL`
  - `CLOUDFLARE_QUICK_TUNNEL_URL`
- prints the public URL so it can be copied into Vercel

Important:

- Quick Tunnel URLs are not stable
- if the tunnel restarts, the URL changes
- after every URL change, update Vercel and redeploy

## 8. Configure Vercel

Deploy `apps/dashboard` on Vercel with `Root Directory = apps/dashboard`.

Required Vercel env vars:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<clerk-publishable-key>
CLERK_SECRET_KEY=<clerk-secret-key>
BACKEND_API_URL=https://<random>.trycloudflare.com
NEXT_PUBLIC_BACKEND_URL=https://<random>.trycloudflare.com
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/auth/role-redirect
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/auth/role-redirect
```

If the tunnel URL changes:

1. update `BACKEND_API_URL`
2. update `NEXT_PUBLIC_BACKEND_URL`
3. redeploy the Vercel project

## 9. Configure Clerk production

In Clerk production:

- add the Vercel domain to the allowed origins / redirects
- keep:
  - sign in: `/sign-in`
  - sign up: `/sign-up`
  - after sign in: `/auth/role-redirect`
  - after sign up: `/auth/role-redirect`
- if private GitHub repos are needed in the dashboard, enable GitHub as a social provider

## 10. Acceptance checks

Local:

- `GET http://localhost:8000/healthz` returns `{"status":"ok"}`
- `docker compose -f infra/local/docker-compose.yml ps` shows `db`, `redis`, `qdrant` healthy

Public:

- `GET https://<random>.trycloudflare.com/healthz` returns `{"status":"ok"}`
- the Vercel dashboard loads
- Clerk sign-in works
- `/api/auth/sync` succeeds without degraded mode
- an analysis transitions `RECEIVED -> QUEUED -> RUNNING -> COMPLETED`
- the worker consumes queue `analyses`

## 11. Operational constraints

- The PC must stay on and awake
- Quick Tunnel is convenient but not production-stable
- A tunnel restart requires a Vercel env update and redeploy
- This mode is intentionally closer to the local project than to a fully managed cloud deployment
