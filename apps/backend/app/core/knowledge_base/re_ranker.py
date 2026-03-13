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
        model = self._get_model()
        if model is not None:
            try:
                return self._rank_with_model(query=query, candidates=deduped, model=model, limit=limit)
            except Exception:
                pass

        rescored = [candidate.with_score(self._heuristic_score(query=query, candidate=candidate, route=route)) for candidate in deduped]
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
        model: object,
        limit: int,
    ) -> list[RetrievalCandidate]:
        pairs = [(query, candidate.chunk.content[:4000]) for candidate in candidates]
        predictions = model.predict(pairs, show_progress_bar=False)  # type: ignore[attr-defined]
        rescored = [
            candidate.with_score(float(prediction) + candidate.score)
            for candidate, prediction in zip(candidates, predictions, strict=False)
        ]
        rescored.sort(key=lambda item: item.score, reverse=True)
        return rescored[:limit]

    def _dedup_candidates(self, candidates: list[RetrievalCandidate]) -> list[RetrievalCandidate]:
        deduped: dict[tuple[str, int, str], RetrievalCandidate] = {}
        for candidate in candidates:
            key = (candidate.chunk.path, candidate.chunk.chunk_index, candidate.channel)
            previous = deduped.get(key)
            if previous is None or candidate.score > previous.score:
                deduped[key] = candidate
        return list(deduped.values())

    def _heuristic_score(self, *, query: str, candidate: RetrievalCandidate, route: QueryRoute) -> float:
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
            "semantic_code": 0.75,
            "semantic_document": 0.7,
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

        return candidate.raw_score + token_bonus + path_bonus + channel_bonus + route_bonus


def _tokenize(value: str) -> set[str]:
    return {token for token in re.findall(r"[a-z0-9_./-]+", value.lower()) if token}
