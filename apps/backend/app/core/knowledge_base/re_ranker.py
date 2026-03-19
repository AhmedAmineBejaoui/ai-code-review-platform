from __future__ import annotations

import re
from threading import Lock

from app.core.knowledge_base.retrieval_models import QueryRoute, RetrievalCandidate
from app.settings import settings

_MODEL_LOCK = Lock()


class ReRanker:
    def __init__(self) -> None:
        self._enabled = settings.KB_RERANK_ENABLED
        self._model_name = settings.KB_CROSS_ENCODER_MODEL
        self._model: object | None = None
        self._model_load_attempted = False

    def rank(
        self,
        *,
        query: str,
        candidates: list[RetrievalCandidate],
        route: QueryRoute,
        limit: int,
    ) -> list[RetrievalCandidate]:
        if not candidates:
            return []

        deduped = self._dedup_candidates(candidates)
        normalized_scores = self._normalize_scores(deduped)
        model = self._get_model()
        if model is not None:
            try:
                return self._rank_with_model(
                    query=query,
                    candidates=deduped,
                    normalized_scores=normalized_scores,
                    model=model,
                    limit=limit,
                )
            except Exception:
                pass

        rescored = [
            candidate.with_score(
                self._heuristic_score(
                    query=query,
                    candidate=candidate,
                    route=route,
                    normalized_score=normalized_scores.get(id(candidate), candidate.score),
                )
            )
            for candidate in deduped
        ]
        rescored.sort(key=lambda item: item.score, reverse=True)
        return rescored[:limit]

    def _get_model(self) -> object | None:
        if not self._enabled:
            return None
        with _MODEL_LOCK:
            if self._model_load_attempted:
                return self._model
            self._model_load_attempted = True
            try:
                from sentence_transformers.cross_encoder import CrossEncoder  # type: ignore[import]

                self._model = CrossEncoder(self._model_name)
            except Exception:
                self._model = None
            return self._model

    def _rank_with_model(
        self,
        *,
        query: str,
        candidates: list[RetrievalCandidate],
        normalized_scores: dict[int, float],
        model: object,
        limit: int,
    ) -> list[RetrievalCandidate]:
        pairs = [(query, candidate.chunk.content[:4000]) for candidate in candidates]
        predictions = model.predict(pairs, show_progress_bar=False)  # type: ignore[attr-defined]
        rescored = [
            candidate.with_score(float(prediction) + normalized_scores.get(id(candidate), candidate.score))
            for candidate, prediction in zip(candidates, predictions, strict=False)
        ]
        rescored.sort(key=lambda item: item.score, reverse=True)
        return rescored[:limit]

    def _dedup_candidates(self, candidates: list[RetrievalCandidate]) -> list[RetrievalCandidate]:
        deduped: dict[tuple[str, ...], RetrievalCandidate] = {}
        for candidate in candidates:
            key = _identity_key(candidate)
            previous = deduped.get(key)
            if previous is None or candidate.score > previous.score:
                deduped[key] = candidate
        return list(deduped.values())

    def _normalize_scores(self, candidates: list[RetrievalCandidate]) -> dict[int, float]:
        per_channel: dict[str, list[float]] = {}
        per_bucket: dict[str, list[float]] = {}
        for candidate in candidates:
            per_channel.setdefault(candidate.channel, []).append(candidate.score)
            per_bucket.setdefault(_source_bucket(candidate), []).append(candidate.score)

        normalized: dict[int, float] = {}
        for candidate in candidates:
            channel_norm = _min_max(candidate.score, per_channel.get(candidate.channel, [candidate.score]))
            bucket_norm = _min_max(candidate.score, per_bucket.get(_source_bucket(candidate), [candidate.score]))
            raw_norm = max(0.0, min(1.0, float(candidate.score)))
            normalized[id(candidate)] = (channel_norm * 0.45) + (bucket_norm * 0.35) + (raw_norm * 0.20)
        return normalized

    def _heuristic_score(
        self,
        *,
        query: str,
        candidate: RetrievalCandidate,
        route: QueryRoute,
        normalized_score: float,
    ) -> float:
        tokens = _tokenize(query)
        content_tokens = _tokenize(candidate.chunk.content)
        overlap = len(tokens.intersection(content_tokens))
        token_bonus = overlap / max(len(tokens), 1)

        path_bonus = 0.0
        lower_path = candidate.chunk.path.lower()
        if any(token in lower_path for token in tokens):
            path_bonus += 0.3
        if candidate.chunk.symbol_name and candidate.chunk.symbol_name.lower() in tokens:
            path_bonus += 0.4

        channel_bonus = {
            "file_exact": 1.4,
            "symbol_exact": 1.2,
            "test_related": 0.7,
            "lexical_code": 0.9,
            "lexical_document": 0.8,
            "lexical_global_document": 0.72,
            "semantic_code": 0.75,
            "semantic_document": 0.7,
            "semantic_global_document": 0.64,
            "repo_bootstrap": 0.6,
        }.get(candidate.channel, 0.5)

        route_bonus = 0.0
        if route == QueryRoute.DIFF_REVIEW and candidate.chunk.file_type == "test":
            route_bonus += 0.3
        if route == QueryRoute.POLICY_QUERY and (
            candidate.chunk.source_type == "policy" or "policy" in {tag.lower() for tag in candidate.chunk.tags}
        ):
            route_bonus += 0.6
        if route == QueryRoute.DOCUMENT_QUERY and candidate.chunk.chunk_type == "document_chunk":
            route_bonus += 0.4
        if route == QueryRoute.MULTI_SOURCE_QUERY:
            route_bonus += {
                "code": 0.35,
                "pdf": 0.25,
                "web": 0.24,
                "markdown": 0.23,
                "sql": 0.26,
                "policy": 0.22,
                "test": 0.15,
            }.get(_source_bucket(candidate), 0.1)
        if route == QueryRoute.SQL_QUERY and _source_bucket(candidate) == "sql":
            route_bonus += 0.5
        if route == QueryRoute.WEB_QUERY and _source_bucket(candidate) == "web":
            route_bonus += 0.45
        if route == QueryRoute.MARKDOWN_QUERY and _source_bucket(candidate) == "markdown":
            route_bonus += 0.45
        if route == QueryRoute.PDF_QUERY and _source_bucket(candidate) == "pdf":
            route_bonus += 0.45
        if route in {QueryRoute.REPO_QUERY, QueryRoute.CODE_QUERY} and _source_bucket(candidate) == "code":
            route_bonus += 0.45

        return normalized_score + token_bonus + path_bonus + channel_bonus + route_bonus


def _tokenize(value: str) -> set[str]:
    return {token for token in re.findall(r"[a-z0-9_./-]+", value.lower()) if token}


def _identity_key(candidate: RetrievalCandidate) -> tuple[str, ...]:
    chunk = candidate.chunk
    if chunk.chunk_id:
        return ("chunk_id", chunk.chunk_id)
    if chunk.source_id:
        return ("source_id", chunk.source_id, str(chunk.page or ""), str(chunk.entity_name or ""))
    if chunk.document_id:
        return ("document", chunk.document_id, str(chunk.page or ""), str(chunk.chunk_index))
    return ("path", chunk.path, str(chunk.chunk_index), str(chunk.page or ""), str(chunk.entity_name or ""))


def _source_bucket(candidate: RetrievalCandidate) -> str:
    chunk = candidate.chunk
    if chunk.file_type == "test" or chunk.chunk_type in {"test_case", "test_block"}:
        return "test"
    if chunk.source_type in {"pdf", "web", "markdown", "sql", "policy"}:
        return chunk.source_type
    tags = {tag.lower() for tag in chunk.tags}
    if tags.intersection({"policy", "security", "compliance"}):
        return "policy"
    return "code"


def _min_max(value: float, values: list[float]) -> float:
    if not values:
        return max(0.0, min(1.0, value))
    minimum = min(values)
    maximum = max(values)
    if maximum <= minimum:
        return max(0.0, min(1.0, value))
    return (value - minimum) / (maximum - minimum)
