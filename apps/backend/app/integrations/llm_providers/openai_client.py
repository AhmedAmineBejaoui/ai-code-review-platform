from __future__ import annotations

import asyncio
import logging

from app.settings import settings

logger = logging.getLogger(__name__)


class OpenAIClient:
    """Thin async wrapper around the OpenAI Chat Completions API.

    When LLM_ENABLED=false (default) every call falls back to a simple
    truncated-diff summary so the rest of the pipeline is unaffected.
    """

    def __init__(self) -> None:
        self._enabled = settings.LLM_ENABLED
        self._api_key = settings.OPENAI_API_KEY
        self._model = settings.OPENAI_MODEL
        self._max_tokens = settings.OPENAI_MAX_TOKENS
        self._aclient: object | None = None  # openai.AsyncOpenAI

    def _get_client(self) -> object:
        if self._aclient is None:
            try:
                import openai  # type: ignore[import]

                self._aclient = openai.AsyncOpenAI(api_key=self._api_key)
            except ImportError:
                logger.warning(
                    "openai package not installed. "
                    "Install it with: pip install openai"
                )
                raise
        return self._aclient

    @staticmethod
    def _fallback_text(text: str, max_chars: int) -> str:
        fallback = text.strip().replace("\n", " ")
        return fallback[:max_chars]

    async def complete_text(self, *, system_prompt: str, user_prompt: str, max_chars: int = 500) -> str:
        if not self._enabled or not self._api_key:
            await asyncio.sleep(0)
            return self._fallback_text(user_prompt, max_chars=max_chars)

        try:
            client = self._get_client()
            response = await client.chat.completions.create(  # type: ignore[attr-defined]
                model=self._model,
                max_tokens=self._max_tokens,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt[:12000]},
                ],
            )
            content = response.choices[0].message.content or ""
            if content.strip():
                return content
            return self._fallback_text(user_prompt, max_chars=max_chars)
        except Exception as exc:  # noqa: BLE001
            logger.warning("OpenAI complete_text failed: %s", exc)
            return self._fallback_text(user_prompt, max_chars=max_chars)

    async def summarize_diff(self, diff_text: str, max_chars: int = 500) -> str:
        """Return a human-readable summary of *diff_text*.

        Falls back to a truncated plain-text summary when LLM is disabled or
        the API call fails.
        """
        return await self.complete_text(
            system_prompt=(
                "You are a senior code reviewer. "
                "Summarize the following git diff in 2-3 sentences, "
                "highlighting the most important changes."
            ),
            user_prompt=diff_text,
            max_chars=max_chars,
        )
