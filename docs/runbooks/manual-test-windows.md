# Manual Test (Windows, PowerShell)

## 1) Start infra and app (Docker)

```powershell
cd "C:\Users\Ahmed Amin Bejoui\Desktop\ai-code-review-platform\infra\local"
docker compose up -d db redis api worker
```

## 2) Apply migrations

```powershell
cd "C:\Users\Ahmed Amin Bejoui\Desktop\ai-code-review-platform\apps\backend"
python -m alembic upgrade head
```

## 3) Health check

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/healthz" -Method Get
```

## 4) Submit an analysis

```powershell
$suffix = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$repo = "owner/t6-manual-$suffix"

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
  repo = $repo
  pr_number = 999
  commit_sha = "abc123"
  diff_text = $diff
  metadata = @{ actor = "manual-test" }
} | ConvertTo-Json -Depth 10

$create = Invoke-RestMethod -Uri "http://localhost:8000/v1/analyze" -Method Post -ContentType "application/json" -Body $payload
$analysisId = $create.analysis_id
$analysisId
```

## 5) Poll status until completion

```powershell
$result = $null
for ($i=1; $i -le 40; $i++) {
  $result = Invoke-RestMethod -Uri "http://localhost:8000/v1/analyses/$analysisId" -Method Get
  Write-Host "[$i] status=$($result.status)"
  if ($result.status -in @("COMPLETED","FAILED")) { break }
  Start-Sleep -Seconds 2
}
```

## 6) Verify static analysis output

```powershell
$result.static_stats | ConvertTo-Json -Depth 10
$result.static_findings | Select-Object source,rule_id,severity,category,file_path,line_start,message | Format-Table -AutoSize
```

## Important

- Use PowerShell syntax in PowerShell (`$env:...`, `Invoke-RestMethod`).
- Use Bash syntax in Git Bash (`export`, `curl`).
- Do not mix both in the same terminal session.
- The worker now tries Git checkout for static analysis when `STATIC_ANALYSIS_AUTO_CHECKOUT_ENABLED=true`.
- For local/manual tests with fake repos, keep short `commit_sha` (example `abc123`) so it safely falls back to `STATIC_ANALYSIS_WORKSPACE_PATH`.
