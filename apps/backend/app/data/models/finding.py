from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class Finding:
    id: str
    analysis_id: str
    source: str
    file_path: str | None
    line_start: int | None
    line_end: int | None
    severity: str
    category: str
    message: str
    suggestion: str | None
    confidence: float | None
    issue_type: str | None
    rule_id: str | None
    evidence_json: str
    fingerprint: str
    created_at: str

    @property
    def evidence(self) -> dict[str, Any]:
        try:
            return json.loads(self.evidence_json)
        except Exception:
            return {}
