# RepoContext Manual Setup (Beginner Friendly)

This guide explains exactly how to run the "first full repo understanding, then diff-only context" workflow.

## 1. Is your approach correct?

Yes. Correct strategy:

1. New repository (first time): do one full onboarding/indexing.
2. Next diffs/PRs: read diff first, then retrieve targeted context from index.
3. Keep index updated incrementally from changed files.
4. Full reindex only when structure changes massively.

## 2. External tools to install (outside code)

Minimum:

- Git
- Docker Desktop
- Python 3.11+
- VS Code

Recommended CLI tools:

- `rg` (ripgrep)
- `fd`
- `tree`
- `jq`

VS Code extensions:

- GitLens
- Python
- Pylance
- YAML
- Markdown All in One

## 3. Start local stack

From project root:

```bash
make build
make up
make migrate
```

Health check:

```bash
curl http://localhost:8000/healthz
```

Expected:

```json
{"status":"ok"}
```

## 4. Enable RepoContext in `.env`

Set:

```bash
QDRANT_ENABLED=true
QDRANT_URL=http://localhost:6333
QDRANT_REPO_CONTEXT_COLLECTION=repo_context
REPO_CONTEXT_VECTOR_SIZE=256
REPO_CONTEXT_CHUNK_SIZE=1400
REPO_CONTEXT_CHUNK_OVERLAP=200
REPO_CONTEXT_MAX_FILE_BYTES=250000
REPO_CONTEXT_MAX_FILES_PER_RUN=5000
REPO_CONTEXT_ALLOWED_ROOTS=
```

Optional hardening:

```bash
REPO_CONTEXT_ALLOWED_ROOTS=C:\Users\Ahmed Amin Bejoui\Desktop\ai-code-review-platform
```

## 5. First-time onboarding (full)

Endpoint:

- `POST /v1/kb/onboard`

If Clerk auth is enabled, send a valid bearer token in `Authorization: Bearer <token>`.

PowerShell example:

```powershell
$body = @{
  repo_id = "ai-code-review-platform"
  repo_path = "C:/Users/Ahmed Amin Bejoui/Desktop/ai-code-review-platform"
  source = "manual"
  force_full = $true
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://localhost:8000/v1/kb/onboard" -ContentType "application/json" -Body $body
```

If backend runs inside Docker compose, you can also index the mounted workspace path:

- `repo_path = "/workspace"` for whole project
- or `repo_path = "/workspace/apps/backend"` for backend only

## 6. Incremental update after new commits

Endpoint:

- `POST /v1/kb/update`

PowerShell example:

```powershell
$body = @{
  repo_id = "ai-code-review-platform"
  repo_path = "C:/Users/Ahmed Amin Bejoui/Desktop/ai-code-review-platform"
  base_ref = "HEAD~1"
  head_ref = "HEAD"
  source = "manual"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://localhost:8000/v1/kb/update" -ContentType "application/json" -Body $body
```

If `base_ref` is omitted, backend uses last indexed commit from repo profile.

## 7. Get context for a diff

Endpoint:

- `POST /v1/kb/context/diff`

PowerShell example:

```powershell
$diff = @"
diff --git a/apps/backend/app/main.py b/apps/backend/app/main.py
index 1234567..89abcde 100644
--- a/apps/backend/app/main.py
+++ b/apps/backend/app/main.py
@@ -1,4 +1,5 @@
 import logging
+from app.api.http import knowledge_base
 "@

$body = @{
  repo_id = "ai-code-review-platform"
  diff_text = $diff
  changed_files = @()
  limit = 8
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Method Post -Uri "http://localhost:8000/v1/kb/context/diff" -ContentType "application/json" -Body $body
```

## 8. Get context for a normal query

Endpoint:

- `POST /v1/kb/context/query`

```powershell
$body = @{
  repo_id = "ai-code-review-platform"
  query = "How authentication and role routing work in backend and dashboard?"
  changed_files = @()
  limit = 8
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Method Post -Uri "http://localhost:8000/v1/kb/context/query" -ContentType "application/json" -Body $body
```

## 9. Qdrant local then cloud

Yes, supported.

Local:

- `QDRANT_URL=http://localhost:6333`
- `QDRANT_API_KEY=` (empty)

Cloud:

- set cloud endpoint as `QDRANT_URL`
- set `QDRANT_API_KEY`
- keep same endpoints and workflow

Migration options:

1. Snapshot/restore
2. Qdrant migration tool

## 10. Typical troubleshooting

`FEATURE_NOT_AVAILABLE`:

- `QDRANT_ENABLED` is false
- or `qdrant-client` package is missing

`INVALID_REQUEST` path errors:

- wrong `repo_path`
- path outside `REPO_CONTEXT_ALLOWED_ROOTS`

Incremental update fails:

- invalid `base_ref`/`head_ref`
- repo path is not a git repository

No chunks returned:

- onboarding not executed
- or files were excluded (binary/too large/ignored)
