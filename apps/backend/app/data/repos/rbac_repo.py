from __future__ import annotations

from threading import Lock

from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.data.database import get_engine
from app.data.models.rbac import RBACUser


_RBAC_LOCK = Lock()


class RBACRepo:
    def __init__(self) -> None:
        self._engine: Engine = get_engine()

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
