from __future__ import annotations

from threading import Lock

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from app.settings import settings


class DatabaseUnavailableError(Exception):
    pass


_ENGINE: Engine | None = None
_SESSION_MAKER: sessionmaker[Session] | None = None
_DB_LOCK = Lock()


def _resolve_database_url(database_url: str | None) -> str:
    if not database_url:
        raise DatabaseUnavailableError("DATABASE_URL is required for PostgreSQL runtime")

    normalized = database_url.strip()
    if normalized.startswith("postgres://"):
        normalized = "postgresql://" + normalized.removeprefix("postgres://")

    if normalized.startswith("postgresql://"):
        normalized = "postgresql+psycopg://" + normalized.removeprefix("postgresql://")

    if not normalized.startswith("postgresql+psycopg://"):
        raise DatabaseUnavailableError(
            "DATABASE_URL must be a PostgreSQL URL (example: postgresql+psycopg://postgres:example@localhost:5432/ai_code_review_platform)"
        )

    return normalized


def get_engine() -> Engine:
    global _ENGINE, _SESSION_MAKER

    with _DB_LOCK:
        if _ENGINE is None:
            database_url = _resolve_database_url(settings.DATABASE_URL)
            _ENGINE = create_engine(
                database_url,
                pool_pre_ping=True,
                pool_size=10,
                max_overflow=20,
                future=True,
            )
            _SESSION_MAKER = sessionmaker(bind=_ENGINE, autoflush=False, autocommit=False, expire_on_commit=False)

        return _ENGINE


def get_session() -> Session:
    global _SESSION_MAKER
    if _SESSION_MAKER is None:
        get_engine()
    assert _SESSION_MAKER is not None
    return _SESSION_MAKER()


def init_db() -> None:
    # Runtime bootstrap: ensure DB is reachable and table exists if migration hasn't run yet.
    # Alembic remains the source of truth for schema evolution.
    engine = get_engine()

    with engine.begin() as conn:
        conn.execute(text("SELECT 1"))
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS analyses (
                    id TEXT PRIMARY KEY,
                    repo TEXT NOT NULL,
                    provider TEXT NOT NULL DEFAULT 'github',
                    pr_number INTEGER NULL CHECK (pr_number IS NULL OR pr_number > 0),
                    commit_sha TEXT NULL,
                    source TEXT NOT NULL,
                    status TEXT NOT NULL CHECK (status IN ('RECEIVED', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED')),
                    stage TEXT NULL,
                    progress INTEGER NULL DEFAULT 0 CHECK (progress IS NULL OR (progress >= 0 AND progress <= 100)),
                    nb_files_changed INTEGER NULL DEFAULT 0 CHECK (nb_files_changed IS NULL OR nb_files_changed >= 0),
                    additions_total INTEGER NULL DEFAULT 0 CHECK (additions_total IS NULL OR additions_total >= 0),
                    deletions_total INTEGER NULL DEFAULT 0 CHECK (deletions_total IS NULL OR deletions_total >= 0),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    diff_hash TEXT NOT NULL,
                    diff_raw TEXT NOT NULL,
                    diff_text TEXT NOT NULL,
                    diff_redacted TEXT NULL,
                    has_secrets BOOLEAN NOT NULL DEFAULT FALSE,
                    redaction_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
                    static_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
                    error_code TEXT NULL,
                    error_message TEXT NULL,
                    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
                    UNIQUE(repo, diff_hash)
                )
                """
            )
        )
        conn.execute(text("ALTER TABLE analyses ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'github'"))
        conn.execute(text("ALTER TABLE analyses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"))
        conn.execute(text("ALTER TABLE analyses ADD COLUMN IF NOT EXISTS stage TEXT"))
        conn.execute(text("ALTER TABLE analyses ADD COLUMN IF NOT EXISTS progress INTEGER"))
        conn.execute(text("ALTER TABLE analyses ADD COLUMN IF NOT EXISTS nb_files_changed INTEGER"))
        conn.execute(text("ALTER TABLE analyses ADD COLUMN IF NOT EXISTS additions_total INTEGER"))
        conn.execute(text("ALTER TABLE analyses ADD COLUMN IF NOT EXISTS deletions_total INTEGER"))
        conn.execute(text("ALTER TABLE analyses ADD COLUMN IF NOT EXISTS diff_raw TEXT"))
        conn.execute(text("ALTER TABLE analyses ADD COLUMN IF NOT EXISTS diff_text TEXT"))
        conn.execute(text("ALTER TABLE analyses ADD COLUMN IF NOT EXISTS diff_redacted TEXT"))
        conn.execute(text("ALTER TABLE analyses ADD COLUMN IF NOT EXISTS has_secrets BOOLEAN NOT NULL DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE analyses ADD COLUMN IF NOT EXISTS redaction_stats JSONB NOT NULL DEFAULT '{}'::jsonb"))
        conn.execute(text("ALTER TABLE analyses ADD COLUMN IF NOT EXISTS static_stats JSONB NOT NULL DEFAULT '{}'::jsonb"))
        conn.execute(text("ALTER TABLE analyses ADD COLUMN IF NOT EXISTS error_code TEXT"))
        conn.execute(text("ALTER TABLE analyses ADD COLUMN IF NOT EXISTS error_message TEXT"))
        conn.execute(text("UPDATE analyses SET diff_raw = COALESCE(diff_raw, diff_text, '') WHERE diff_raw IS NULL"))
        conn.execute(text("UPDATE analyses SET diff_text = COALESCE(diff_text, diff_raw, '') WHERE diff_text IS NULL"))
        conn.execute(text("UPDATE analyses SET updated_at = COALESCE(updated_at, created_at, NOW())"))
        conn.execute(text("UPDATE analyses SET stage = COALESCE(stage, status)"))
        conn.execute(text("UPDATE analyses SET progress = COALESCE(progress, 0)"))
        conn.execute(text("UPDATE analyses SET nb_files_changed = COALESCE(nb_files_changed, 0)"))
        conn.execute(text("UPDATE analyses SET additions_total = COALESCE(additions_total, 0)"))
        conn.execute(text("UPDATE analyses SET deletions_total = COALESCE(deletions_total, 0)"))
        conn.execute(text("UPDATE analyses SET has_secrets = COALESCE(has_secrets, FALSE)"))
        conn.execute(text("UPDATE analyses SET redaction_stats = COALESCE(redaction_stats, '{}'::jsonb)"))
        conn.execute(text("UPDATE analyses SET static_stats = COALESCE(static_stats, '{}'::jsonb)"))
        conn.execute(text("ALTER TABLE analyses ALTER COLUMN diff_raw SET NOT NULL"))
        conn.execute(text("ALTER TABLE analyses ALTER COLUMN diff_text SET NOT NULL"))
        conn.execute(text("ALTER TABLE analyses ALTER COLUMN progress SET DEFAULT 0"))
        conn.execute(text("ALTER TABLE analyses ALTER COLUMN nb_files_changed SET DEFAULT 0"))
        conn.execute(text("ALTER TABLE analyses ALTER COLUMN additions_total SET DEFAULT 0"))
        conn.execute(text("ALTER TABLE analyses ALTER COLUMN deletions_total SET DEFAULT 0"))
        conn.execute(text("ALTER TABLE analyses ALTER COLUMN has_secrets SET DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE analyses ALTER COLUMN redaction_stats SET DEFAULT '{}'::jsonb"))
        conn.execute(text("ALTER TABLE analyses ALTER COLUMN static_stats SET DEFAULT '{}'::jsonb"))
        conn.execute(text("ALTER TABLE analyses DROP CONSTRAINT IF EXISTS ck_analyses_status"))
        conn.execute(text("ALTER TABLE analyses DROP CONSTRAINT IF EXISTS analyses_status_check"))
        conn.execute(text("ALTER TABLE analyses DROP CONSTRAINT IF EXISTS ck_analyses_progress_range"))
        conn.execute(text("ALTER TABLE analyses DROP CONSTRAINT IF EXISTS analyses_progress_check"))
        conn.execute(text("ALTER TABLE analyses DROP CONSTRAINT IF EXISTS ck_analyses_nb_files_changed"))
        conn.execute(text("ALTER TABLE analyses DROP CONSTRAINT IF EXISTS ck_analyses_additions_total"))
        conn.execute(text("ALTER TABLE analyses DROP CONSTRAINT IF EXISTS ck_analyses_deletions_total"))
        conn.execute(
            text(
                """
                ALTER TABLE analyses
                ADD CONSTRAINT ck_analyses_status
                CHECK (status IN ('RECEIVED', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED'))
                """
            )
        )
        conn.execute(
            text(
                """
                ALTER TABLE analyses
                ADD CONSTRAINT ck_analyses_progress_range
                CHECK (progress IS NULL OR (progress >= 0 AND progress <= 100))
                """
            )
        )
        conn.execute(
            text(
                """
                ALTER TABLE analyses
                ADD CONSTRAINT ck_analyses_nb_files_changed
                CHECK (nb_files_changed IS NULL OR nb_files_changed >= 0)
                """
            )
        )
        conn.execute(
            text(
                """
                ALTER TABLE analyses
                ADD CONSTRAINT ck_analyses_additions_total
                CHECK (additions_total IS NULL OR additions_total >= 0)
                """
            )
        )
        conn.execute(
            text(
                """
                ALTER TABLE analyses
                ADD CONSTRAINT ck_analyses_deletions_total
                CHECK (deletions_total IS NULL OR deletions_total >= 0)
                """
            )
        )

        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_analyses_repo_pr ON analyses(repo, pr_number)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_analyses_repo_pr_sha ON analyses(repo, pr_number, commit_sha)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_analyses_diff_hash ON analyses(diff_hash)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_analyses_has_secrets ON analyses(has_secrets)"))

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS encrypted_secrets (
                    id TEXT PRIMARY KEY,
                    namespace TEXT NOT NULL,
                    secret_key TEXT NOT NULL,
                    ciphertext TEXT NOT NULL,
                    meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE(namespace, secret_key)
                )
                """
            )
        )
        conn.execute(
            text("CREATE INDEX IF NOT EXISTS idx_encrypted_secrets_namespace ON encrypted_secrets(namespace)")
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_encrypted_secrets_namespace_key ON encrypted_secrets(namespace, secret_key)"
            )
        )

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT NOT NULL UNIQUE,
                    display_name TEXT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)"))

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS roles (
                    id TEXT PRIMARY KEY,
                    code TEXT NOT NULL UNIQUE,
                    label TEXT NOT NULL,
                    is_system BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_roles_code ON roles(code)"))

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS permissions (
                    id TEXT PRIMARY KEY,
                    code TEXT NOT NULL UNIQUE,
                    description TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code)"))

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS user_roles (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE(user_id, role_id)
                )
                """
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id)"))

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS role_permissions (
                    id TEXT PRIMARY KEY,
                    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
                    permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE(role_id, permission_id)
                )
                """
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id)"))

        conn.execute(
            text(
                """
                INSERT INTO roles (id, code, label, is_system)
                VALUES
                    ('role_admin', 'admin', 'Administrator', TRUE),
                    ('role_reviewer', 'reviewer', 'Reviewer', TRUE),
                    ('role_viewer', 'viewer', 'Viewer', TRUE)
                ON CONFLICT (code) DO NOTHING
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO permissions (id, code, description)
                VALUES
                    ('perm_analyses_read', 'analyses.read', 'Read analyses and findings'),
                    ('perm_analyses_create', 'analyses.create', 'Create analyses'),
                    ('perm_analyses_write', 'analyses.write', 'Update analyses and findings'),
                    ('perm_secrets_manage', 'secrets.manage', 'Manage encrypted secret material')
                ON CONFLICT (code) DO NOTHING
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO role_permissions (id, role_id, permission_id)
                VALUES
                    ('rp_admin_read', 'role_admin', 'perm_analyses_read'),
                    ('rp_admin_create', 'role_admin', 'perm_analyses_create'),
                    ('rp_admin_write', 'role_admin', 'perm_analyses_write'),
                    ('rp_admin_secrets', 'role_admin', 'perm_secrets_manage'),
                    ('rp_reviewer_read', 'role_reviewer', 'perm_analyses_read'),
                    ('rp_reviewer_create', 'role_reviewer', 'perm_analyses_create'),
                    ('rp_reviewer_write', 'role_reviewer', 'perm_analyses_write'),
                    ('rp_viewer_read', 'role_viewer', 'perm_analyses_read')
                ON CONFLICT (role_id, permission_id) DO NOTHING
                """
            )
        )

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS files_changed (
                    id TEXT PRIMARY KEY,
                    analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
                    file_path TEXT NOT NULL,
                    change_type TEXT NOT NULL CHECK (change_type IN ('modified', 'added', 'deleted', 'renamed')),
                    old_path TEXT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_files_changed_analysis_id ON files_changed(analysis_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_files_changed_analysis_path ON files_changed(analysis_id, file_path)"))

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS analysis_files (
                    id TEXT PRIMARY KEY,
                    analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
                    path_old TEXT NULL,
                    path_new TEXT NOT NULL,
                    change_type TEXT NOT NULL CHECK (change_type IN ('modified', 'added', 'deleted', 'renamed')),
                    is_binary BOOLEAN NOT NULL DEFAULT FALSE,
                    additions_count INTEGER NOT NULL DEFAULT 0,
                    deletions_count INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_analysis_files_analysis_id ON analysis_files(analysis_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_analysis_files_path_new ON analysis_files(analysis_id, path_new)"))

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS analysis_hunks (
                    id TEXT PRIMARY KEY,
                    analysis_file_id TEXT NOT NULL REFERENCES analysis_files(id) ON DELETE CASCADE,
                    old_start INTEGER NOT NULL,
                    old_lines INTEGER NOT NULL,
                    new_start INTEGER NOT NULL,
                    new_lines INTEGER NOT NULL,
                    header TEXT NULL,
                    raw_text TEXT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_analysis_hunks_analysis_file_id ON analysis_hunks(analysis_file_id)"))
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_analysis_hunks_ranges ON analysis_hunks(analysis_file_id, new_start, new_lines)"
            )
        )

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS analysis_hunk_lines (
                    id TEXT PRIMARY KEY,
                    hunk_id TEXT NOT NULL REFERENCES analysis_hunks(id) ON DELETE CASCADE,
                    line_type TEXT NOT NULL CHECK (line_type IN ('context', 'add', 'remove')),
                    content TEXT NOT NULL,
                    old_line_no INTEGER NULL,
                    new_line_no INTEGER NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_analysis_hunk_lines_hunk_id ON analysis_hunk_lines(hunk_id)"))
        conn.execute(
            text("CREATE INDEX IF NOT EXISTS idx_analysis_hunk_lines_new_line ON analysis_hunk_lines(hunk_id, new_line_no)")
        )

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS findings (
                    id TEXT PRIMARY KEY,
                    analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
                    source TEXT NOT NULL,
                    file_path TEXT NULL,
                    line_start INTEGER NULL,
                    line_end INTEGER NULL,
                    severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARN', 'BLOCKER')),
                    category TEXT NOT NULL CHECK (category IN ('security', 'perf', 'quality', 'style', 'maintainability', 'other')),
                    message TEXT NOT NULL,
                    suggestion TEXT NULL,
                    confidence DOUBLE PRECISION NULL CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
                    issue_type TEXT NULL,
                    rule_id TEXT NULL,
                    evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
                    fingerprint TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE(analysis_id, fingerprint)
                )
                """
            )
        )
        conn.execute(text("ALTER TABLE findings ADD COLUMN IF NOT EXISTS issue_type TEXT"))
        conn.execute(text("ALTER TABLE findings ADD COLUMN IF NOT EXISTS rule_id TEXT"))
        conn.execute(text("ALTER TABLE findings ADD COLUMN IF NOT EXISTS evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb"))
        conn.execute(text("UPDATE findings SET evidence_json = COALESCE(evidence_json, '{}'::jsonb)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_findings_analysis_severity ON findings(analysis_id, severity)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_findings_analysis_category ON findings(analysis_id, category)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_findings_issue_type ON findings(issue_type)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_findings_rule_id ON findings(rule_id)"))

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS tool_runs (
                    id TEXT PRIMARY KEY,
                    analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
                    tool_name TEXT NOT NULL,
                    status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'SKIPPED')),
                    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    finished_at TIMESTAMPTZ NULL,
                    duration_ms INTEGER NOT NULL DEFAULT 0 CHECK (duration_ms >= 0),
                    exit_code INTEGER NULL,
                    findings_count INTEGER NOT NULL DEFAULT 0 CHECK (findings_count >= 0),
                    scanned_files INTEGER NOT NULL DEFAULT 0 CHECK (scanned_files >= 0),
                    version TEXT NULL,
                    warning TEXT NULL,
                    command TEXT NULL,
                    workspace_path TEXT NULL,
                    stdout_snippet TEXT NULL,
                    stderr_snippet TEXT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_tool_runs_analysis_id ON tool_runs(analysis_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_tool_runs_analysis_tool ON tool_runs(analysis_id, tool_name)"))

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS kb_documents (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    source_type TEXT NOT NULL,
                    path_or_url TEXT NULL,
                    tags_json JSONB NOT NULL DEFAULT '{}'::jsonb,
                    doc_version INTEGER NOT NULL DEFAULT 1,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS citations (
                    id TEXT PRIMARY KEY,
                    finding_id TEXT NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
                    doc_id TEXT NULL REFERENCES kb_documents(id) ON DELETE SET NULL,
                    source TEXT NOT NULL,
                    excerpt TEXT NOT NULL,
                    score DOUBLE PRECISION NOT NULL DEFAULT 0,
                    meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_citations_finding_id ON citations(finding_id)"))

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS policies (
                    id TEXT PRIMARY KEY,
                    repo TEXT NOT NULL,
                    version INTEGER NOT NULL,
                    blocking_enabled BOOLEAN NOT NULL DEFAULT FALSE,
                    rules_json JSONB NOT NULL DEFAULT '{}'::jsonb,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE(repo, version)
                )
                """
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_policies_repo_version ON policies(repo, version DESC)"))

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS kb_chunks (
                    id TEXT PRIMARY KEY,
                    doc_id TEXT NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
                    chunk_index INTEGER NOT NULL,
                    text TEXT NOT NULL,
                    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
                    embedding_id TEXT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE(doc_id, chunk_index)
                )
                """
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_kb_chunks_doc_id ON kb_chunks(doc_id)"))

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id TEXT PRIMARY KEY,
                    actor TEXT NOT NULL,
                    action TEXT NOT NULL,
                    target_type TEXT NOT NULL,
                    target_id TEXT NOT NULL,
                    meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)"))


def close_db() -> None:
    global _ENGINE, _SESSION_MAKER

    with _DB_LOCK:
        if _ENGINE is not None:
            try:
                _ENGINE.dispose()
            except SQLAlchemyError:
                pass
            _ENGINE = None
            _SESSION_MAKER = None
