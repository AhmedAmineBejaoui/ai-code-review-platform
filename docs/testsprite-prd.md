# TestSprite PRD

## Product Summary

This project is an AI-assisted code review platform with:

- A public marketing site and authenticated dashboard in `apps/dashboard` (Next.js, port `3001`)
- A backend API in `apps/backend` (FastAPI, port `8000`)
- Optional async processing with Celery + Redis
- Core capabilities around code analysis, diff review, reports, knowledge base, and admin operations

Primary user goals:

1. Visit the landing page and understand the product
2. Sign up or sign in with Clerk
3. Reach the correct dashboard based on role
4. Submit or inspect code analyses
5. Review reports, diffs, history, and knowledge-base results
6. For admins, manage users, organizations, policies, observability, and integrations

## System Under Test

Frontend:

- Base URL: `http://localhost:3001`
- App type: Next.js App Router
- Public routes:
  - `/`
  - `/sign-in`
  - `/sign-up`
  - `/auth`
  - marketing slugs handled by `app/[slug]/page.tsx`
- Protected routes:
  - `/dashboard`
  - `/dashboard/analyses`
  - `/dashboard/report/:id`
  - `/dashboard/diff/:id`
  - `/dashboard/history/:id`
  - `/dashboard/rag/:id`
  - `/dashboard/organization`
  - `/dashboard/admin/*`

Authentication:

- Frontend protection is enforced for `/dashboard(.*)` and `/auth/role-redirect(.*)` via Clerk middleware.
- A valid Clerk test account is required to cover authenticated flows.
- Admin coverage requires signing in with an email allowed by the local admin email configuration.

Backend:

- Base URL: `http://localhost:8000`
- Public endpoint:
  - `GET /healthz`
- Analysis endpoints:
  - `POST /v1/analyze`
  - `GET /v1/analyses/{analysis_id}`
  - `GET /v1/analyses`
- Knowledge-base endpoints exist under `/v1/kb/*`
- Admin endpoints exist under `/v1/admin/*`

Backend auth note:

- In local development, analysis endpoints are testable without auth when RBAC and Clerk backend auth are disabled.
- If backend auth is enabled later, API tests must include the expected auth headers or bearer token.

## Recommended Local Setup For TestSprite

Use a stable local setup instead of a temporary tunnel whenever possible.

Recommended URLs:

- Frontend: `http://localhost:3001`
- Backend: `http://localhost:8000`

Frontend start:

```bash
cd apps/dashboard
npm run dev
```

Backend minimal start:

```bash
docker compose -f infra/local/docker-compose.yml up -d db redis
cd apps/backend
poetry install --no-interaction
poetry run alembic -c alembic.ini upgrade head
poetry run uvicorn app.main:app --reload --port 8000
```

If using the existing VS Code workspace automation, the project already contains startup tasks in `.vscode/tasks.json`.

Important:

- The current frontend env may point to a temporary tunnel backend. For reliable TestSprite runs, prefer a stable local backend URL.
- Do not use production credentials or real customer data.

## Main User Flows To Test

### Public Web Flows

1. Open `/`
2. Verify hero content, primary CTA, secondary CTA, pricing section, and footer links render without obvious layout issues
3. Open mobile navigation and verify it can open and close cleanly
4. Navigate to `/sign-in` and `/sign-up`
5. Visit `/auth` while signed out and verify redirect to `/sign-in`

### Authenticated Dashboard Flows

Prerequisite: valid Clerk test account

1. Sign in
2. Verify redirect reaches `/auth/role-redirect`
3. Verify role-based routing works
4. For developer role, verify `/dashboard` loads and exposes analyses navigation
5. Open `/dashboard/analyses`
6. Open an analysis report page if data exists
7. Open diff, history, and RAG-related pages if linked data exists

### Admin Flows

Prerequisite: signed in with an admin-capable email in local configuration

1. Open `/dashboard/admin`
2. Validate navigation to:
   - knowledge base
   - policies
   - users
   - organizations
   - observability
   - integrations
3. Verify pages load without authorization regressions or obvious client errors

### Backend API Flows

1. Call `GET /healthz`
2. Submit a manual analysis with `POST /v1/analyze`
3. Poll `GET /v1/analyses/{analysis_id}`
4. Verify the analysis reaches a terminal state and returns structured data

## Suggested Initial TestSprite Scope

Start with this phased approach:

1. Frontend smoke test on public pages
2. Auth smoke test with a Clerk test account
3. Dashboard smoke test for developer role
4. Backend API smoke test for `healthz` and `analyze`
5. Admin dashboard smoke only after the main flows are stable

This order reduces noise and isolates auth issues from product issues.

## Backend Sample Payload

Use this payload for the first API-driven analysis test:

```json
{
  "source": "manual",
  "repo": "owner/manual-test",
  "pr_number": 1,
  "commit_sha": "abc123",
  "diff_text": "diff --git a/demo.py b/demo.py\nindex 1111111..2222222 100644\n--- a/demo.py\n+++ b/demo.py\n@@ -0,0 +1,8 @@\n+import os\n+import subprocess\n+\n+def run(cmd: str):\n+    return eval(cmd)\n+\n+def run2(cmd: str):\n+    return subprocess.run(cmd, shell=True)\n"
}
```

Expected outcome:

- Request accepted
- `analysis_id` returned
- Follow-up fetch returns analysis status and findings payload

## Known Constraints

- Frontend dashboard routes depend on Clerk auth.
- Admin pages depend on both auth and effective role resolution.
- Backend async flows may depend on Redis, Celery, and database availability.
- If the backend URL used by the frontend is a temporary tunnel, tests may fail for infrastructure reasons unrelated to UI correctness.

## Suggested Prompt For TestSprite

Use this prompt in your IDE chat after the MCP server is running:

```text
Help me test this project with TestSprite.
Use docs/testsprite-prd.md as the product requirements document.
Start with public frontend smoke coverage on http://localhost:3001.
Then test auth and dashboard flows if a Clerk test account is available.
Also test the backend smoke flow on http://localhost:8000 using GET /healthz and POST /v1/analyze.
```
