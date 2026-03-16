from __future__ import annotations

import uuid

_QDRANT_POINT_NAMESPACE = uuid.UUID("8db3e122-54da-46fb-bbe0-9a0563a094cb")


def build_document_chunk_point_id(*, repo_id: str, doc_id: str, chunk_index: int) -> str:
    return str(uuid.uuid5(_QDRANT_POINT_NAMESPACE, f"doc:{repo_id}:{doc_id}:{chunk_index}"))


def build_repo_chunk_point_id(
    *,
    repo_id: str,
    relative_path: str,
    chunk_index: int,
    chunk_type: str,
    symbol_name: str | None,
) -> str:
    normalized_symbol = (symbol_name or "").strip()
    return str(
        uuid.uuid5(
            _QDRANT_POINT_NAMESPACE,
            f"repo_chunk:{repo_id}:{relative_path}:{chunk_index}:{chunk_type}:{normalized_symbol}",
        )
    )


def build_repo_profile_point_id(*, repo_id: str) -> str:
    return str(uuid.uuid5(_QDRANT_POINT_NAMESPACE, f"repo_profile:{repo_id}"))
