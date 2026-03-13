from __future__ import annotations

import json
from typing import Literal, Protocol, TypeVar

from pydantic import BaseModel, Field, ValidationError, constr

from app.integrations.llm_providers.ollama_client import OllamaClient, OllamaResponse


class GroundedReviewLLMClient(Protocol):
    def generate(self, prompt: str) -> OllamaResponse: ...


class GroundedFinding(BaseModel):
    file_path: str | None = Field(default=None, max_length=500)
    line_start: int | None = Field(default=None, ge=1)
    line_end: int | None = Field(default=None, ge=1)
    severity: Literal["INFO", "WARN", "BLOCKER"] = "WARN"
    category: Literal["security", "perf", "quality", "style", "maintainability", "other"] = "quality"
    message: constr(min_length=12, max_length=500) = Field(...)
    suggestion: constr(min_length=8, max_length=500) | None = Field(default=None)
    confidence: float = Field(default=0.65, ge=0.0, le=1.0)
    kb_refs: list[constr(min_length=2, max_length=220)] = Field(default_factory=list, max_length=4)


class GroundedFindingOutput(BaseModel):
    findings: list[GroundedFinding] = Field(default_factory=list, max_length=8)


_ModelT = TypeVar("_ModelT", bound=BaseModel)


class GroundedReviewService:
    def __init__(self, llm_client: GroundedReviewLLMClient | None = None) -> None:
        self.llm: GroundedReviewLLMClient = llm_client or OllamaClient()

    def _build_prompt(
        self,
        *,
        repo: str,
        pr_number: int | None,
        diff_redacted: str,
        files_changed: list[str],
        knowledge_base_context: str,
        max_findings: int,
    ) -> str:
        pr_value = pr_number if pr_number is not None else "N/A"
        files_txt = "\n".join(f"- {item}" for item in files_changed[:40]) if files_changed else "- none"
        diff_excerpt = diff_redacted[:7000]
        kb_excerpt = knowledge_base_context[:5500]

        return f"""
You are a senior code reviewer. Produce grounded review findings from the pull request diff.
Rules:
- Use ONLY the provided diff and knowledge base context.
- Return at most {max_findings} findings.
- If nothing actionable is strongly supported, return {{"findings":[]}}.
- Every finding must be tied to a changed file when possible.
- Do NOT invent vulnerabilities, files, or line numbers.
- Prefer findings that reference repository rules, architecture, guardrails, or policies from the knowledge base.
- Output ONLY valid JSON, no markdown and no extra text.

Schema:
{{
  "findings": [
    {{
      "file_path": "string|null",
      "line_start": 1,
      "line_end": 1,
      "severity": "INFO|WARN|BLOCKER",
      "category": "security|perf|quality|style|maintainability|other",
      "message": "string",
      "suggestion": "string|null",
      "confidence": 0.0,
      "kb_refs": ["string"]
    }}
  ]
}}

Context:
repo: {repo}
pr_number: {pr_value}
changed_files:
{files_txt}

diff_excerpt:
{diff_excerpt}

knowledge_base_context:
{kb_excerpt}

Return JSON now:
""".strip()

    @staticmethod
    def _extract_json(text: str) -> str:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise ValueError("No JSON object found in LLM output")
        return text[start : end + 1]

    def _generate_structured_output(
        self,
        *,
        prompt: str,
        model_type: type[_ModelT],
        schema_hint: str,
    ) -> _ModelT:
        response = self.llm.generate(prompt)
        raw = response.text.strip()

        try:
            data = json.loads(self._extract_json(raw))
            return model_type(**data)
        except Exception:
            repair_prompt = f"""
Fix the following output to be valid JSON EXACTLY matching:
{schema_hint}
Return ONLY JSON, no extra text.

Bad output:
{raw}
""".strip()
            repaired = self.llm.generate(repair_prompt)
            repaired_raw = repaired.text.strip()
            repaired_json = json.loads(self._extract_json(repaired_raw))
            return model_type(**repaired_json)

    def generate_findings(
        self,
        *,
        repo: str,
        pr_number: int | None,
        diff_redacted: str,
        files_changed: list[str],
        knowledge_base_context: str,
        max_findings: int,
    ) -> GroundedFindingOutput:
        prompt = self._build_prompt(
            repo=repo,
            pr_number=pr_number,
            diff_redacted=diff_redacted,
            files_changed=files_changed,
            knowledge_base_context=knowledge_base_context,
            max_findings=max_findings,
        )
        output = self._generate_structured_output(
            prompt=prompt,
            model_type=GroundedFindingOutput,
            schema_hint=(
                '{"findings":[{"file_path":"string|null","line_start":1,"line_end":1,'
                '"severity":"WARN","category":"quality","message":"string","suggestion":"string|null",'
                '"confidence":0.0,"kb_refs":["string"]}]}'
            ),
        )
        return self._normalize_output(output=output, files_changed=files_changed, max_findings=max_findings)

    @staticmethod
    def _normalize_output(
        *,
        output: GroundedFindingOutput,
        files_changed: list[str],
        max_findings: int,
    ) -> GroundedFindingOutput:
        normalized_items: list[GroundedFinding] = []
        changed_files = {item for item in files_changed if item}
        dedupe_keys: set[tuple[str | None, int | None, str]] = set()

        for item in output.findings:
            file_path = item.file_path.strip() if isinstance(item.file_path, str) and item.file_path.strip() else None
            if changed_files and file_path and file_path not in changed_files:
                file_path = None

            line_start = item.line_start
            line_end = item.line_end
            if line_start is not None and line_end is not None and line_end < line_start:
                line_end = line_start

            message = " ".join(item.message.split()).strip()
            suggestion = " ".join(item.suggestion.split()).strip() if isinstance(item.suggestion, str) and item.suggestion.strip() else None
            kb_refs = [" ".join(ref.split()).strip() for ref in item.kb_refs if isinstance(ref, str) and ref.strip()][:4]
            dedupe_key = (file_path, line_start, message.lower())
            if dedupe_key in dedupe_keys:
                continue

            try:
                normalized = GroundedFinding(
                    file_path=file_path,
                    line_start=line_start,
                    line_end=line_end,
                    severity=item.severity,
                    category=item.category,
                    message=message,
                    suggestion=suggestion,
                    confidence=item.confidence,
                    kb_refs=kb_refs,
                )
            except ValidationError:
                continue

            dedupe_keys.add(dedupe_key)
            normalized_items.append(normalized)
            if len(normalized_items) >= max_findings:
                break

        return GroundedFindingOutput(findings=normalized_items)
