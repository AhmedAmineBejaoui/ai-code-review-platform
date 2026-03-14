from __future__ import annotations

import json
from typing import Protocol, TypeVar

from pydantic import BaseModel

from app.integrations.llm_providers.ollama_client import OllamaClient, OllamaResponse


class ReviewLLMClient(Protocol):
    def generate(self, prompt: str) -> OllamaResponse: ...


_ModelT = TypeVar("_ModelT", bound=BaseModel)


class StructuredLLMHelper:
    def __init__(self, llm_client: ReviewLLMClient | None = None) -> None:
        self.llm: ReviewLLMClient = llm_client or OllamaClient()

    @staticmethod
    def extract_json(text: str) -> str:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise ValueError("No JSON object found in LLM output")
        return text[start : end + 1]

    def generate_structured_output(
        self,
        *,
        prompt: str,
        model_type: type[_ModelT],
        schema_hint: str,
    ) -> _ModelT:
        response = self.llm.generate(prompt)
        raw = response.text.strip()
        try:
            return model_type(**json.loads(self.extract_json(raw)))
        except Exception:
            repair_prompt = f"""
Fix the following output to be valid JSON EXACTLY matching:
{schema_hint}
Return ONLY JSON, no extra text.

Bad output:
{raw}
""".strip()
            repaired = self.llm.generate(repair_prompt)
            return model_type(**json.loads(self.extract_json(repaired.text.strip())))
