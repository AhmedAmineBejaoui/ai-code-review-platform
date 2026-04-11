from __future__ import annotations

import asyncio
from typing import Literal

from pydantic import BaseModel, Field, ValidationError, constr

from analysis.langGraph.models import DiffCodeFragment, LLMGeneratedFinding, LLMOutput, RetrievalResult
from app.core.langchain_runtime.output_parser import parse_pydantic_with_repair
from app.integrations.llm_providers.ollama_client import OllamaClient
from app.settings import settings


class _LLMFindingPayload(BaseModel):
    severity: Literal["INFO", "WARN", "BLOCKER"] = "WARN"
    category: constr(min_length=2, max_length=64) = "quality"
    message: constr(min_length=12, max_length=500)
    suggestion: constr(min_length=8, max_length=600) | None = None
    confidence: float = Field(default=0.7, ge=0.0, le=1.0)
    file_path: str | None = Field(default=None, max_length=500)
    line_start: int | None = Field(default=None, ge=1)
    line_end: int | None = Field(default=None, ge=1)
    references: list[constr(min_length=2, max_length=300)] = Field(default_factory=list, max_length=8)


class _LLMStrictOutput(BaseModel):
    summary: constr(min_length=8, max_length=1000) | None = None
    findings: list[_LLMFindingPayload] = Field(default_factory=list, max_length=12)


class RagGraphLLMService:
    """LLM generation with strict JSON contract and safe fallback modes."""

    def __init__(self, llm_client: OllamaClient | None = None) -> None:
        self._llm_client = llm_client or OllamaClient(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_MODEL,
            timeout_s=settings.OLLAMA_TIMEOUT_SECONDS,
        )

    async def generate(
        self,
        *,
        repo_id: str,
        pr_number: int | None,
        diff_text: str,
        fragments: list[DiffCodeFragment],
        retrieval: RetrievalResult,
        changed_files: list[str],
        max_findings: int = 6,
    ) -> LLMOutput:
        if not settings.LLM_REVIEW_FINDINGS_ENABLED:
            return LLMOutput(status="skipped", summary=None, findings=[], fallback_reason="llm_disabled")
        if not retrieval.context_text:
            return LLMOutput(status="fallback", summary=None, findings=[], fallback_reason="missing_retrieval_context")

        prompt = self._build_prompt(
            repo_id=repo_id,
            pr_number=pr_number,
            diff_text=diff_text,
            fragments=fragments,
            retrieval=retrieval,
            changed_files=changed_files,
            max_findings=max_findings,
        )

        try:
            response = await asyncio.to_thread(self._llm_client.generate, prompt)
        except Exception as exc:
            return LLMOutput(
                status="unavailable",
                summary=None,
                findings=[],
                fallback_reason=str(exc),
                prompt=prompt,
            )

        try:
            parsed = parse_pydantic_with_repair(
                raw_text=response.text.strip(),
                model_type=_LLMStrictOutput,
                schema_hint=(
                    '{"summary":"string|null","findings":[{"severity":"WARN","category":"quality",'
                    '"message":"string","suggestion":"string|null","confidence":0.75,'
                    '"file_path":"src/file.py","line_start":1,"line_end":1,'
                    '"references":["path:line"]}]}'
                ),
                llm_client=self._llm_client,
            )
        except ValidationError as exc:
            return LLMOutput(
                status="failed",
                summary=None,
                findings=[],
                fallback_reason=str(exc),
                prompt=prompt,
                raw_response=response.text,
            )
        except Exception as exc:
            return LLMOutput(
                status="failed",
                summary=None,
                findings=[],
                fallback_reason=str(exc),
                prompt=prompt,
                raw_response=response.text,
            )

        return LLMOutput(
            status="completed",
            summary=parsed.summary,
            findings=self._normalize_findings(parsed.findings, changed_files=changed_files, max_findings=max_findings),
            prompt=prompt,
            raw_response=response.text,
        )

    @staticmethod
    def _normalize_findings(
        findings: list[_LLMFindingPayload],
        *,
        changed_files: list[str],
        max_findings: int,
    ) -> list[LLMGeneratedFinding]:
        changed_paths = {item.strip() for item in changed_files if item.strip()}
        output: list[LLMGeneratedFinding] = []
        seen: set[tuple[str | None, int | None, str]] = set()

        for finding in findings:
            if finding.confidence < settings.LANGGRAPH_MIN_FINDING_CONFIDENCE:
                continue

            file_path = finding.file_path.strip() if isinstance(finding.file_path, str) and finding.file_path.strip() else None
            if file_path and changed_paths and file_path not in changed_paths:
                file_path = None

            line_start = finding.line_start
            line_end = finding.line_end
            if line_start and line_end and line_end < line_start:
                line_end = line_start

            normalized_message = " ".join(finding.message.split()).strip()
            dedupe_key = (file_path, line_start, normalized_message.lower())
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)

            suggestion = finding.suggestion.strip() if isinstance(finding.suggestion, str) and finding.suggestion.strip() else None
            output.append(
                LLMGeneratedFinding(
                    severity=finding.severity,
                    category=finding.category.strip().lower(),
                    message=normalized_message,
                    suggestion=suggestion,
                    confidence=float(finding.confidence),
                    file_path=file_path,
                    line_start=line_start,
                    line_end=line_end,
                    references=tuple(item.strip() for item in finding.references if item.strip()),
                )
            )
            if len(output) >= max_findings:
                break
        return output

    @staticmethod
    def _build_prompt(
        *,
        repo_id: str,
        pr_number: int | None,
        diff_text: str,
        fragments: list[DiffCodeFragment],
        retrieval: RetrievalResult,
        changed_files: list[str],
        max_findings: int,
    ) -> str:
        changed_files_block = "\n".join(f"- {item}" for item in changed_files[:60]) or "- none"
        fragments_block = "\n".join(
            f"- {item.file_path} | lang={item.language} | module={item.module} | class={item.class_name} | function={item.function_name}"
            for item in fragments[:30]
        ) or "- none"
        context_block = "\n\n".join(
            f"[{ref.path}] ({ref.source}) score={ref.score:.3f}\n{ref.content[:1200]}"
            for ref in retrieval.references[:12]
        )

        return f"""[SYSTEM]
Tu es un moteur d'analyse de code strictement ancre dans le contexte fourni.
Interdictions:
- Pas d'hallucination.
- Pas de chemins de fichiers inventes.
- Pas de texte hors JSON.

[USER]
Repository: {repo_id}
PR Number: {pr_number if pr_number is not None else "N/A"}
Changed files:
{changed_files_block}

Diff fragments:
{fragments_block}

Diff raw excerpt:
{diff_text[:8000]}

RAG context:
{context_block[:12000]}

Retourne UNIQUEMENT un JSON valide au format:
{{
  "summary": "string|null",
  "findings": [
    {{
      "severity": "INFO|WARN|BLOCKER",
      "category": "security|perf|quality|style|maintainability|other",
      "message": "string",
      "suggestion": "string|null",
      "confidence": 0.0,
      "file_path": "string|null",
      "line_start": 1,
      "line_end": 1,
      "references": ["string"]
    }}
  ]
}}

Contraintes:
- Maximum {max_findings} findings.
- Si aucun probleme solide: {{"summary": null, "findings": []}}.
- Chaque finding doit etre justifie par le contexte RAG ou le diff.
""".strip()


class LLMService(RagGraphLLMService):
    """Backward-compatible alias."""

    async def generate(
        self,
        *,
        repo: str,
        pr_number: int | None,
        diff_redacted: str,
        files_changed: list[str],
        knowledge_base_context: str,
        max_findings: int = 6,
    ) -> list[dict[str, object]]:
        retrieval = RetrievalResult(
            context_text=knowledge_base_context,
            references=[],
            vector_hits=0,
            graph_hits=0,
            hyde_hits=0,
            reranked_count=0,
            retrieval_mode="legacy",
            retrieval_trace={},
        )
        output = await super().generate(
            repo_id=repo,
            pr_number=pr_number,
            diff_text=diff_redacted,
            fragments=[],
            retrieval=retrieval,
            changed_files=files_changed,
            max_findings=max_findings,
        )
        return [item.to_dict() for item in output.findings]
