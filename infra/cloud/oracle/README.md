# Oracle + Vercel Deployment (0$ strict)

This guide deploys:
- `apps/dashboard` on Vercel Hobby (free)
- FastAPI API + Celery worker on Oracle Cloud Always Free
- PostgreSQL on Supabase Free
- Redis on Upstash Free
- HTTPS on backend with DuckDNS + Caddy

---

## 1. Create cloud resources

1. Create accounts: Vercel, Clerk, Supabase, Upstash, Oracle Cloud, DuckDNS.
2. Supabase: create a project and copy database URI.
3. Upstash: create a Redis database and copy TLS URL (`rediss://...`).
4. DuckDNS: create a subdomain (example: `ai-review-prod.duckdns.org`).

---

## 2. Prepare production values

Generate secrets locally:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
python -c "import secrets; print(secrets.token_hex(32))"
```

Then prepare env file:

```bash
cp infra/cloud/oracle/.env.prod.example infra/cloud/oracle/.env.prod
```

Edit `.env.prod` with real values:
- `BACKEND_DOMAIN=<your-subdomain>.duckdns.org`
- `DATABASE_URL=postgresql+psycopg://...` (Supabase)
- `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` (Upstash TLS)
- `CLERK_ISSUER_URL=https://<instance>.clerk.accounts.dev`
- `CLERK_AUTH_ENABLED=true`
- `CLERK_ORGANIZATIONS_ENFORCED=false`

---

## 3. Provision Oracle VM

Create an Ubuntu VM in Oracle Always Free (Ampere or AMD).

Open inbound ports in Security List/NSG:
- `22/tcp` (SSH)
- `80/tcp` (HTTP for Let's Encrypt challenge)
- `443/tcp` (HTTPS)

SSH into VM:

```bash
ssh ubuntu@<PUBLIC_IP>
```

Install Git first (if not already available):

```bash
sudo apt-get update && sudo apt-get install -y git
```

---

## 4. Clone and configure on VM

```bash
git clone <YOUR_REPO_URL>
cd ai-code-review-platform
sudo bash infra/cloud/oracle/install-docker-ubuntu.sh
sudo usermod -aG docker $USER
newgrp docker
cp infra/cloud/oracle/.env.prod.example infra/cloud/oracle/.env.prod
nano infra/cloud/oracle/.env.prod
```

Point DuckDNS subdomain to VM public IP from DuckDNS dashboard.

Check DNS resolution:

```bash
nslookup <your-subdomain>.duckdns.org
```

---

## 5. Start backend stack on Oracle

Build:

```bash
docker compose -f infra/cloud/oracle/docker-compose.prod.yml --env-file infra/cloud/oracle/.env.prod build
```

Run DB migrations:

```bash
docker compose -f infra/cloud/oracle/docker-compose.prod.yml --env-file infra/cloud/oracle/.env.prod run --rm api alembic -c /app/alembic.ini upgrade head
```

Start services:

```bash
docker compose -f infra/cloud/oracle/docker-compose.prod.yml --env-file infra/cloud/oracle/.env.prod up -d
```

Verify:

```bash
curl https://<your-subdomain>.duckdns.org/healthz
docker compose -f infra/cloud/oracle/docker-compose.prod.yml ps
docker compose -f infra/cloud/oracle/docker-compose.prod.yml logs -f api
docker compose -f infra/cloud/oracle/docker-compose.prod.yml logs -f worker
```

Expected health response:

```json
{"status":"ok"}
```

---

## 6. Deploy dashboard to Vercel

In Vercel:
1. Import GitHub repo.
2. Set **Root Directory** to `apps/dashboard`.
3. Framework preset: Next.js.
4. Add production env vars:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
BACKEND_API_URL=https://<your-subdomain>.duckdns.org
NEXT_PUBLIC_BACKEND_URL=https://<your-subdomain>.duckdns.org
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/auth/role-redirect
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/auth/role-redirect
```

Deploy and note URL: `https://<project>.vercel.app`.

---

## 7. Configure Clerk production

In Clerk Dashboard (Production instance):
1. Add Vercel domain (`https://<project>.vercel.app`) in allowed origins/redirects.
2. Ensure application paths are:
- Sign in: `/sign-in`
- Sign up: `/sign-up`
- After sign in: `/auth/role-redirect`
- After sign up: `/auth/role-redirect`
3. Organization settings:
- **Membership optional**
- Disable auto-create first organization if you want personal accounts by default.
4. Use production keys in Vercel (not development keys).

---

## 8. Acceptance checks

1. `GET https://<api-domain>/healthz` returns `{"status":"ok"}`.
2. Vercel dashboard opens without runtime error.
3. Sign up/sign in works in production.
4. `POST /api/auth/sync` from dashboard succeeds (no Clerk JWT error).
5. Creating an analysis moves status `RECEIVED -> QUEUED -> RUNNING -> COMPLETED`.
6. Worker logs show queue consumption on `analyses`.
7. Personal account works when user has no organization.

---

## 9. Troubleshooting

- TLS certificate not issued:
  - verify DNS points to Oracle VM public IP
  - verify ports 80 and 443 are open in Oracle Security List/NSG
- Backend cannot reach Supabase:
  - ensure `DATABASE_URL` uses `postgresql+psycopg://`
- Redis errors with Upstash:
  - ensure `rediss://` URL is used for all Redis/Celery vars
- Clerk token validation error:
  - verify `CLERK_ISSUER_URL` in backend `.env.prod`
  - verify Production keys are used in Vercel
