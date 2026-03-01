from __future__ import annotations

import json
import re
from typing import Protocol

from pydantic import BaseModel, Field, ValidationError, constr

from app.integrations.llm_providers.ollama_client import OllamaClient, OllamaResponse


class SummaryLLMClient(Protocol):
    def generate(self, prompt: str) -> OllamaResponse: ...


class SummaryOutput(BaseModel):
    summary: constr(min_length=10, max_length=1500) = Field(...)


class SummaryService:
    def __init__(self, llm_client: SummaryLLMClient | None = None) -> None:
        self.llm: SummaryLLMClient = llm_client or OllamaClient()

    def _build_prompt(
        self,
        *,
        repo: str,
        pr_number: int | None,
        change_type: str | None,
        diff_redacted: str,
        files_changed: list[str],
    ) -> str:
        max_chars = 6000
        diff_excerpt = diff_redacted[:max_chars]
        files_txt = "\n".join(f"- {path}" for path in files_changed[:30]) if files_changed else "- none"
        change_type_value = change_type or "unknown"
        pr_number_value = pr_number if pr_number is not None else "N/A"

        return f"""
You are a senior software engineer. Your task: summarize a pull request.
Rules:
- Do NOT invent changes not present in the diff.
- Be concise and clear.
- Output ONLY valid JSON (no markdown, no extra text).
Schema:
{{"summary":"string"}}

Context:
repo: {repo}
pr_number: {pr_number_value}
change_type: {change_type_value}
files_changed:
{files_txt}

diff_excerpt:
{diff_excerpt}

Return JSON now:
""".strip()

    def _extract_json(self, text: str) -> str:
        match = re.search(r"\{.*?\}", text, re.DOTALL)
        if not match:
            raise ValueError("No JSON object found in LLM output")
        return match.group(0)

    def generate_summary(
        self,
        *,
        repo: str,
        pr_number: int | None,
        change_type: str | None,
        diff_redacted: str,
        files_changed: list[str],
    ) -> SummaryOutput:
        prompt = self._build_prompt(
            repo=repo,
            pr_number=pr_number,
            change_type=change_type,
            diff_redacted=diff_redacted,
            files_changed=files_changed,
        )

        response = self.llm.generate(prompt)
        raw = response.text.strip()

        try:
            json_str = self._extract_json(raw)
            data = json.loads(json_str)
            return SummaryOutput(**data)
        except Exception:
            repair_prompt = f"""
Fix the following output to be valid JSON EXACTLY matching:
{{"summary":"string"}}
Return ONLY JSON, no extra text.

Bad output:
{raw}
""".strip()

            repaired = self.llm.generate(repair_prompt)
            raw_repaired = repaired.text.strip()
            json_str_repaired = self._extract_json(raw_repaired)
            data_repaired = json.loads(json_str_repaired)
            return SummaryOutput(**data_repaired)

    @staticmethod
    def fallback_summary(
        *,
        files_count: int,
        additions_total: int,
        deletions_total: int,
        change_type: str | None,
        files_changed: list[str],
    ) -> str:
        change_type_value = change_type or "mixed"
        preview_files = files_changed[:3]
        lead = (
            f"This PR updates {files_count} files (+{additions_total}/-{deletions_total}) "
            f"and is categorized as {change_type_value}."
        )
        if not preview_files:
            return lead
        return f"{lead} Main touched files: {', '.join(preview_files)}."

    @staticmethod
    def validate_summary_text(text: str) -> str | None:
        normalized = re.sub(r"\s+", " ", text).strip()
        if not normalized:
            return None
        try:
            parsed = SummaryOutput(summary=normalized)
        except ValidationError:
            return None
        return parsed.summary
