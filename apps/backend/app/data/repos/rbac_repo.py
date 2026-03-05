from __future__ import annotations

from threading import Lock

from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError

from app.data.database import get_engine
from app.data.models.rbac import RBACUser


_RBAC_LOCK = Lock()
_CLERK_ROLE_TO_DB_ROLE: dict[str, str] = {
    "admin": "admin",
    "reviewer": "reviewer",
    "developer": "viewer",
}


class RBACRepo:
    def __init__(self) -> None:
        self._engine: Engine = get_engine()

    @staticmethod
    def _normalize_email(user_id: str, email: str) -> str:
        cleaned = email.strip().lower()
        if "@" in cleaned:
            return cleaned
        return f"{user_id}@clerk.local"

    @staticmethod
    def _role_for_db(clerk_role: str) -> str:
        return _CLERK_ROLE_TO_DB_ROLE.get(clerk_role.strip().lower(), "viewer")

    def upsert_clerk_user(self, user_id: str, email: str, display_name: str | None, clerk_role: str) -> None:
        normalized_email = self._normalize_email(user_id=user_id, email=email)
        normalized_role = self._role_for_db(clerk_role)

        with _RBAC_LOCK:
            with self._engine.begin() as conn:
                try:
                    conn.execute(
                        text(
                            """
                            INSERT INTO users (id, email, display_name, is_active)
                            VALUES (:user_id, :email, :display_name, TRUE)
                            ON CONFLICT (id) DO UPDATE
                            SET email = CASE
                                    WHEN EXCLUDED.email LIKE '%@clerk.local'
                                         AND users.email IS NOT NULL
                                         AND users.email NOT LIKE '%@clerk.local'
                                    THEN users.email
                                    ELSE EXCLUDED.email
                                END,
                                display_name = COALESCE(EXCLUDED.display_name, users.display_name),
                                is_active = TRUE
                            """
                        ),
                        {"user_id": user_id, "email": normalized_email, "display_name": display_name},
                    )
                except IntegrityError:
                    # If email uniqueness conflicts with pre-existing local data, keep the local email,
                    # but still make sure the Clerk user is active and display_name is refreshed.
                    conn.execute(
                        text(
                            """
                            INSERT INTO users (id, email, display_name, is_active)
                            VALUES (:user_id, :fallback_email, :display_name, TRUE)
                            ON CONFLICT (id) DO UPDATE
                            SET display_name = COALESCE(EXCLUDED.display_name, users.display_name),
                                is_active = TRUE
                            """
                        ),
                        {
                            "user_id": user_id,
                            "fallback_email": f"{user_id}@clerk.local",
                            "display_name": display_name,
                        },
                    )

                role_row = (
                    conn.execute(
                        text(
                            """
                            SELECT id
                            FROM roles
                            WHERE code = :role_code
                            LIMIT 1
                            """
                        ),
                        {"role_code": normalized_role},
                    )
                    .mappings()
                    .first()
                )
                if role_row is None:
                    role_row = (
                        conn.execute(
                            text(
                                """
                                SELECT id
                                FROM roles
                                WHERE code = 'viewer'
                                LIMIT 1
                                """
                            )
                        )
                        .mappings()
                        .first()
                    )

                if role_row is None:
                    return

                current_roles_count = int(
                    conn.execute(
                        text(
                            """
                            SELECT COUNT(*) AS count
                            FROM user_roles
                            WHERE user_id = :user_id
                            """
                        ),
                        {"user_id": user_id},
                    )
                    .mappings()
                    .first()["count"]
                )

                if current_roles_count == 0:
                    role_id = str(role_row["id"])
                    conn.execute(
                        text(
                            """
                            INSERT INTO user_roles (id, user_id, role_id)
                            VALUES (:id, :user_id, :role_id)
                            ON CONFLICT (user_id, role_id) DO NOTHING
                            """
                        ),
                        {
                            "id": f"ur_{user_id}_{role_id}",
                            "user_id": user_id,
                            "role_id": role_id,
                        },
                    )

    def get_user(self, user_id: str) -> RBACUser | None:
        with _RBAC_LOCK:
            with self._engine.connect() as conn:
                user_row = (
                    conn.execute(
                        text(
                            """
                            SELECT id, email, display_name, is_active
                            FROM users
                            WHERE id = :user_id
                            LIMIT 1
                            """
                        ),
                        {"user_id": user_id},
                    )
                    .mappings()
                    .first()
                )
                if user_row is None:
                    return None

                role_rows = (
                    conn.execute(
                        text(
                            """
                            SELECT r.code
                            FROM roles r
                            JOIN user_roles ur ON ur.role_id = r.id
                            WHERE ur.user_id = :user_id
                            ORDER BY r.code ASC
                            """
                        ),
                        {"user_id": user_id},
                    )
                    .mappings()
                    .all()
                )
                permission_rows = (
                    conn.execute(
                        text(
                            """
                            SELECT DISTINCT p.code
                            FROM permissions p
                            JOIN role_permissions rp ON rp.permission_id = p.id
                            JOIN user_roles ur ON ur.role_id = rp.role_id
                            WHERE ur.user_id = :user_id
                            ORDER BY p.code ASC
                            """
                        ),
                        {"user_id": user_id},
                    )
                    .mappings()
                    .all()
                )

        return RBACUser(
            id=str(user_row["id"]),
            email=str(user_row["email"]),
            display_name=user_row.get("display_name"),
            is_active=bool(user_row.get("is_active", False)),
            roles=[str(row["code"]) for row in role_rows],
            permissions=[str(row["code"]) for row in permission_rows],
        )
