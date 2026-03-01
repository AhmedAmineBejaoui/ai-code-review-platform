from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import requests

from app.settings import settings


class OllamaClientError(Exception):
    pass


@dataclass(frozen=True)
class OllamaResponse:
    text: str
    model: str
    total_duration_ms: int | None = None
    eval_count: int | None = None


class OllamaClient:
    def __init__(
        self,
        base_url: str | None = None,
        model: str | None = None,
        timeout_s: int | None = None,
    ) -> None:
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model = model or settings.OLLAMA_MODEL
        self.timeout_s = timeout_s or settings.OLLAMA_TIMEOUT_SECONDS

    def generate(self, prompt: str) -> OllamaResponse:
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": settings.OLLAMA_TEMPERATURE,
                "num_predict": settings.OLLAMA_NUM_PREDICT,
            },
        }

        try:
            response = requests.post(url, json=payload, timeout=self.timeout_s)
            response.raise_for_status()
        except requests.RequestException as exc:
            raise OllamaClientError(f"Ollama request failed: {exc}") from exc

        try:
            data: dict[str, Any] = response.json()
        except ValueError as exc:
            raise OllamaClientError("Ollama returned invalid JSON payload") from exc

        total_duration = data.get("total_duration")
        total_duration_ms = (int(total_duration) // 1_000_000) if total_duration is not None else None
        eval_count = data.get("eval_count")

        return OllamaResponse(
            text=str(data.get("response", "")),
            model=str(data.get("model", self.model)),
            total_duration_ms=total_duration_ms,
            eval_count=(int(eval_count) if eval_count is not None else None),
        )
