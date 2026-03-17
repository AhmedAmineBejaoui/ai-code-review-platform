from __future__ import annotations

import time
from dataclasses import dataclass
from threading import BoundedSemaphore

from app.integrations.llm_providers.ollama_client import OllamaResponse
from app.settings import settings

try:
    from langchain_core.output_parsers import StrOutputParser
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_ollama import ChatOllama
except Exception:  # pragma: no cover - handled at runtime when LangChain is unavailable
    StrOutputParser = None
    ChatPromptTemplate = None
    ChatOllama = None


class LangChainUnavailableError(RuntimeError):
    pass


@dataclass(frozen=True)
class _LangChainModelConfig:
    model: str
    timeout_s: int


_GENERATION_SEMAPHORE = BoundedSemaphore(max(1, settings.LANGCHAIN_MAX_CONCURRENT_GENERATIONS))


class LangChainOllamaClient:
    def __init__(
        self,
        *,
        base_url: str | None = None,
        model: str | None = None,
        fallback_model: str | None = None,
        timeout_s: int | None = None,
    ) -> None:
        self._base_url = (base_url or settings.langchain_ollama_base_url).rstrip("/")
        self._primary_model = model or settings.LANGCHAIN_OLLAMA_CHAT_MODEL_PRIMARY
        self._fallback_model = fallback_model or settings.LANGCHAIN_OLLAMA_CHAT_MODEL_FALLBACK
        self._timeout_s = timeout_s or settings.LANGCHAIN_RAG_TIMEOUT_SECONDS

    @property
    def available(self) -> bool:
        return ChatOllama is not None and ChatPromptTemplate is not None and StrOutputParser is not None

    def generate(self, prompt: str) -> OllamaResponse:
        last_error: Exception | None = None
        for candidate in self._iter_models():
            try:
                return self._invoke_with_model(prompt=prompt, config=candidate)
            except Exception as exc:  # noqa: BLE001
                last_error = exc
        if last_error is None:
            raise LangChainUnavailableError("LangChain Ollama client is unavailable")
        raise LangChainUnavailableError(f"LangChain Ollama invocation failed: {last_error}") from last_error

    def _iter_models(self) -> list[_LangChainModelConfig]:
        configs = [_LangChainModelConfig(model=self._primary_model, timeout_s=self._timeout_s)]
        fallback = (self._fallback_model or "").strip()
        if fallback and fallback != self._primary_model:
            configs.append(_LangChainModelConfig(model=fallback, timeout_s=self._timeout_s))
        return configs

    def _invoke_with_model(self, *, prompt: str, config: _LangChainModelConfig) -> OllamaResponse:
        if not self.available:
            raise LangChainUnavailableError(
                "LangChain packages are not installed. Add langchain-core, langchain-ollama, and related dependencies."
            )

        assert ChatOllama is not None
        assert ChatPromptTemplate is not None
        assert StrOutputParser is not None

        chain = (
            ChatPromptTemplate.from_messages([("human", "{prompt}")])
            | ChatOllama(
                base_url=self._base_url,
                model=config.model,
                temperature=settings.OLLAMA_TEMPERATURE,
                num_predict=settings.OLLAMA_NUM_PREDICT,
                timeout=self._timeout_s,
            )
            | StrOutputParser()
        )
        started = time.perf_counter()
        with _GENERATION_SEMAPHORE:
            text = chain.invoke({"prompt": prompt})
        duration_ms = int((time.perf_counter() - started) * 1000)
        return OllamaResponse(
            text=str(text),
            model=config.model,
            total_duration_ms=duration_ms,
            eval_count=None,
        )
