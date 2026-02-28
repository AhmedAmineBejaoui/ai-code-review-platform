from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class RBACUser:
    id: str
    email: str
    display_name: str | None
    is_active: bool
    roles: list[str] = field(default_factory=list)
    permissions: list[str] = field(default_factory=list)
