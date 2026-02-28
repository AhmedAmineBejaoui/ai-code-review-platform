from __future__ import annotations

import asyncio


class OpenAIClient:
    async def summarize_diff(self, diff_text: str, max_chars: int = 500) -> str:
        # Placeholder async I/O integration point for LLM calls.
        await asyncio.sleep(0)
        summary = diff_text.strip().replace("\n", " ")
        return summary[:max_chars]
