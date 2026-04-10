# AGENTS.md

## Objective
This repository powers a real-time, AI-driven code review and collaboration platform. The interface must function as a true code editor (like VS Code), with all actions (editing, file/folder ops, PRs, reviews) directly synchronized to the connected GitHub repository. No mock or local-only changes are allowed. All features must be extended, not removed.

## Core Platform Requirements

### 1. Real Code Editor (Fully Functional)
- The interface must behave as a real code editor (like VS Code).
- Support:
  - File creation, deletion, renaming
  - Folder creation and management
  - Real-time code editing (write, update, delete)
  - Syntax highlighting
  - Multi-file navigation
- All actions must modify actual repository content (not mock or temporary data).

### 2. Direct GitHub Integration (Mandatory)
- All changes MUST be applied directly to the connected GitHub repository.
- No local-only or simulated changes are allowed.
- Every action should trigger real GitHub operations:
  - Commit changes
  - Push updates
  - Create/update branches

### 3. Team & Authentication Constraint
- Repository access is ONLY via GitHub account authentication.
- All operations must be scoped within a team context.
- Users cannot interact with repositories outside their team context.

### 4. Real PR & Review Workflow
- Implement a complete real GitHub workflow:
  - Create Pull Requests (PR)
  - Add comments and discussions
  - Perform code reviews
  - Approve / request changes
  - Merge PR
- Every action must be synchronized with GitHub in real time.
- No fake data, no mock workflows.

### 5. Code Review Corrections
- Any code correction done inside the platform MUST:
  - Modify the real file
  - Create a commit
  - Be reflected instantly on GitHub

### 6. System Consistency
- Preserve all existing features (dashboard, analytics, RAG, etc.)
- Only extend functionality, do NOT remove or break current behavior

### 7. Error Handling
- Handle GitHub API errors properly
- Show clear feedback for:
  - Failed commits
  - Merge conflicts
  - Permission issues

## Build, Lint, and Test Commands

### Backend (Python, FastAPI, Celery)
- **Install dependencies:**
  ```bash
  cd apps/backend
  poetry install
  ```
- **Run API server (dev):**
  ```bash
  poetry run uvicorn app.main:app --reload
  ```
- **Run Celery worker:**
  ```bash
  poetry run celery -A app.workers.tasks worker --pool=solo --loglevel=info
  ```
- **Run all tests:**
  ```bash
  make test  # poetry run pytest tests/ -v --tb=short
  ```
- **Run a single test file:**
  ```bash
  cd apps/backend && poetry run pytest tests/unit/test_foo.py -v
  ```
- **Lint (Python):**
  ```bash
  poetry run ruff check .
  ```
- **Static analysis:**
  - Ruff, Semgrep, SQLFluff, Stylelint, ESLint (see static_analysis/)

### Frontend (Next.js, TypeScript)
- **Install dependencies:**
  ```bash
  cd apps/dashboard
  npm install
  ```
- **Run dev server:**
  ```bash
  npm run dev
  ```
- **Build:**
  ```bash
  npm run build
  ```
- **Lint:**
  ```bash
  npm run lint
  ```
- **Run all tests:**
  (Add test command if/when tests exist)

### Docker
- **Start all services:**
  ```bash
  make up
  ```
- **Apply DB migrations:**
  ```bash
  make migrate
  ```

## Code Style Guidelines

### Python (Backend)
- **Imports:**
  - Use absolute imports within the app (e.g., `from app.core.module import ...`).
  - Group: stdlib, third-party, local imports. No unused imports.
- **Formatting:**
  - Use Black-compatible formatting (4-space indent, 88-char lines).
  - Ruff enforces style and linting.
- **Types:**
  - Use type hints everywhere (PEP 484/PEP 604). Prefer explicit types for function signatures and variables.
- **Naming:**
  - snake_case for variables/functions, PascalCase for classes, UPPER_SNAKE_CASE for constants.
- **Error Handling:**
  - Always catch and log exceptions at API boundaries. Use custom exceptions for domain errors. Return clear error messages and status codes.
- **Testing:**
  - Place tests in `tests/` with `test_*.py` naming. Use pytest. Isolate side effects.
- **Static Analysis:**
  - Run Ruff, Semgrep, SQLFluff regularly. Fix all critical findings.

### TypeScript/JavaScript (Frontend)
- **Imports:**
  - Use ES6 imports. Absolute imports preferred for top-level modules. No unused imports.
- **Formatting:**
  - Use Prettier defaults (2-space indent, single quotes, trailing commas). Run `npm run lint` before commit.
- **Types:**
  - Use TypeScript types and interfaces everywhere. Prefer explicit types for props, state, and function returns.
- **Naming:**
  - camelCase for variables/functions, PascalCase for components/types, UPPER_SNAKE_CASE for constants.
- **Error Handling:**
  - Always handle async errors (try/catch or .catch). Show user-friendly error messages. Log errors to console and/or backend.
- **Testing:**
  - (Add test conventions if/when tests exist)
- **Static Analysis:**
  - ESLint enforced via `npm run lint`. Fix all errors before PR.

### General
- **File/Folder Operations:**
  - All file/folder changes must be real (not simulated) and committed to GitHub.
- **GitHub Integration:**
  - All edits, PRs, reviews, merges, and comments must be real GitHub operations. No mock data.
  - All users must authenticate via GitHub and operate within their team context.
- **Pull Requests & Reviews:**
  - PRs must be created for all changes. Use GitHub review/approval/merge flow. All review comments and corrections must be committed and pushed.
- **System Consistency:**
  - Never remove or break existing features (dashboard, analytics, RAG, etc.). Only extend.
- **Error Handling:**
  - Handle all GitHub API errors gracefully. Show clear feedback for failed commits, merge conflicts, and permission issues.
- **Security:**
  - Never expose secrets. Use environment variables for sensitive config. Validate all user input.

## Editor/Tooling
- **EditorConfig:**
  - (Add .editorconfig if present)
- **ESLint:**
  - Uses Next.js core-web-vitals config (`extends: ["next/core-web-vitals"]`).
- **Ruff:**
  - Configured in `pyproject.toml`.
- **Prettier:**
  - (Add .prettierrc if present)

## Cursor/Copilot Rules
- No .cursor/rules/ or .github/copilot-instructions.md found. If added, summarize and enforce their rules here.

## References
- See `README.md`, `CLAUDE.md`, and `docs/architecture/architecture.md` for architecture and workflow details.
- For new API endpoints, follow the proxy pattern described in CLAUDE.md.

---

**All agentic actions must be real, traceable, and synchronized with GitHub.**
