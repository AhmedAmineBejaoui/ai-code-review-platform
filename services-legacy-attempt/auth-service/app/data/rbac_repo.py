"""
Auth Service — RBAC Repository
────────────────────────────────
MOVED FROM: apps/backend/app/data/repos/rbac_repo.py
LOGIC:      Identical. Only the import path for get_engine() differs.
"""
from __future__ import annotations

from functools import lru_cache

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from app.settings import settings


def _get_engine() -> Engine:
    url = settings.DATABASE_URL
    if not url:
        raise RuntimeError("DATABASE_URL is not set for auth-service")
    url = url.replace("postgres://", "postgresql+psycopg://", 1)
    return create_engine(url, pool_size=5, max_overflow=10, pool_recycle=1800)


@lru_cache(maxsize=1)
def _engine() -> Engine:
    return _get_engine()


class RBACUser:
    __slots__ = ("id", "email", "display_name", "is_active", "roles", "permissions")

    def __init__(self, id: str, email: str, display_name: str | None,
                 is_active: bool, roles: list[str], permissions: list[str]) -> None:
        self.id           = id
        self.email        = email
        self.display_name = display_name
        self.is_active    = is_active
        self.roles        = roles
        self.permissions  = permissions


# Role-code aliases to normalised DB code
_ROLE_ALIASES: dict[str, str] = {
    "admin": "admin",
    "reviewer": "reviewer",
    "reviewer_lead": "reviewer_lead",
    "reviewer_senior": "reviewer_senior",
    "reviewer_junior": "reviewer_junior",
    "developer": "developer",
    "viewer": "viewer",
}


class RBACRepo:
    # ── upsert ────────────────────────────────────────────────────────────────
    def upsert_clerk_user(
        self,
        user_id: str,
        email: str,
        display_name: str | None,
        clerk_role: str,
    ) -> None:
        """Insert or update user and sync their system role. Logic from original rbac_repo."""
        normalized_role = _ROLE_ALIASES.get(clerk_role.strip().lower(), "viewer")
        engine = _engine()
        with engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO users (id, email, display_name, is_active)
                    VALUES (:uid, :email, :dn, TRUE)
                    ON CONFLICT (id) DO UPDATE
                    SET email        = EXCLUDED.email,
                        display_name = COALESCE(EXCLUDED.display_name, users.display_name),
                        is_active    = TRUE
                """),
                {"uid": user_id, "email": email, "dn": display_name},
            )
            role_row = conn.execute(
                text("SELECT id FROM roles WHERE code = :code LIMIT 1"),
                {"code": normalized_role},
            ).mappings().first()
            if role_row:
                conn.execute(
                    text("""
                        DELETE FROM user_roles
                        WHERE user_id = :uid
                          AND role_id IN (SELECT id FROM roles WHERE is_system = TRUE)
                    """),
                    {"uid": user_id},
                )
                import uuid
                conn.execute(
                    text("""
                        INSERT INTO user_roles (id, user_id, role_id)
                        VALUES (:id, :uid, :rid)
                        ON CONFLICT (user_id, role_id) DO NOTHING
                    """),
                    {"id": f"ur_{uuid.uuid4().hex}", "uid": user_id, "rid": str(role_row["id"])},
                )

    # ── read ──────────────────────────────────────────────────────────────────
    def get_user(self, user_id: str) -> RBACUser | None:
        engine = _engine()
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT id, email, display_name, is_active FROM users WHERE id = :uid LIMIT 1"),
                {"uid": user_id},
            ).mappings().first()
            if row is None:
                return None
            roles = [r["code"] for r in conn.execute(
                text("SELECT r.code FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = :uid"),
                {"uid": user_id},
            ).mappings().all()]
            permissions = [p["code"] for p in conn.execute(
                text("""
                    SELECT DISTINCT p.code
                    FROM permissions p
                    JOIN role_permissions rp ON rp.permission_id = p.id
                    JOIN user_roles ur ON ur.role_id = rp.role_id
                    WHERE ur.user_id = :uid
                """),
                {"uid": user_id},
            ).mappings().all()]
        return RBACUser(
            id=row["id"], email=row["email"],
            display_name=row["display_name"], is_active=row["is_active"],
            roles=roles, permissions=permissions,
        )

    def list_users(self, limit: int = 250) -> list[RBACUser]:
        engine = _engine()
        with engine.connect() as conn:
            rows = conn.execute(
                text("SELECT id, email, display_name, is_active FROM users ORDER BY email ASC LIMIT :lim"),
                {"lim": limit},
            ).mappings().all()
            role_rows = conn.execute(
                text("SELECT ur.user_id, r.code FROM user_roles ur JOIN roles r ON r.id = ur.role_id ORDER BY ur.user_id"),
            ).mappings().all()
            perm_rows = conn.execute(
                text("""
                    SELECT DISTINCT ur.user_id, p.code
                    FROM user_roles ur
                    JOIN role_permissions rp ON rp.role_id = ur.role_id
                    JOIN permissions p ON p.id = rp.permission_id
                    ORDER BY ur.user_id
                """),
            ).mappings().all()
        roles_by  = {}
        perms_by  = {}
        for r in role_rows:
            roles_by.setdefault(r["user_id"], []).append(r["code"])
        for p in perm_rows:
            perms_by.setdefault(p["user_id"], []).append(p["code"])
        return [
            RBACUser(
                id=r["id"], email=r["email"],
                display_name=r["display_name"], is_active=r["is_active"],
                roles=roles_by.get(r["id"], []),
                permissions=perms_by.get(r["id"], []),
            )
            for r in rows
        ]

    def update_user_role(self, user_id: str, role_code: str) -> None:
        """Replace all system roles for a user with a single new role."""
        engine = _engine()
        import uuid
        with engine.begin() as conn:
            role_row = conn.execute(
                text("SELECT id FROM roles WHERE code = :code LIMIT 1"),
                {"code": role_code},
            ).mappings().first()
            if role_row is None:
                raise ValueError(f"Role '{role_code}' not found in DB")
            conn.execute(
                text("DELETE FROM user_roles WHERE user_id = :uid AND role_id IN (SELECT id FROM roles WHERE is_system = TRUE)"),
                {"uid": user_id},
            )
            conn.execute(
                text("INSERT INTO user_roles (id, user_id, role_id) VALUES (:id, :uid, :rid) ON CONFLICT DO NOTHING"),
                {"id": f"ur_{uuid.uuid4().hex}", "uid": user_id, "rid": str(role_row["id"])},
            )

    def update_user_active(self, user_id: str, is_active: bool) -> None:
        engine = _engine()
        with engine.begin() as conn:
            conn.execute(
                text("UPDATE users SET is_active = :active WHERE id = :uid"),
                {"active": is_active, "uid": user_id},
            )


@lru_cache(maxsize=1)
def get_rbac_repo() -> RBACRepo:
    return RBACRepo()
