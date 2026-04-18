# PowerShell script to run uvicorn with proper argument handling
$env:WATCHFILES_FORCE_POLLING = if ($env:WATCHFILES_FORCE_POLLING) { $env:WATCHFILES_FORCE_POLLING } else { "true" }

# Build arguments array to prevent wildcard expansion
$uvicornArgs = @(
  'app.main:app',
  '--reload',
  '--reload-dir', 'app',
  '--reload-dir', 'alembic',
  '--reload-exclude', '__pycache__/*',
  '--reload-exclude', '*.py[cod]',
  '--reload-exclude', '*.log',
  '--reload-exclude', '.ruff_cache/*',
  '--reload-exclude', '.pytest_cache/*',
  '--reload-exclude', '.venv/*',
  '--reload-delay', '0.75',
  '--port', '8000'
)

poetry run uvicorn @uvicornArgs
