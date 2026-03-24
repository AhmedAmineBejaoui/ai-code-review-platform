"""Documentation RAG Agent.

Retrieves and processes documentation-related context.
Specializes in:
- PDF documents
- Markdown files
- API documentation
- Technical guides
"""

from __future__ import annotations

import logging
import time
from typing import Any

from app.core.rag_agents.base_agent import (
    AgentContext,
    AgentResult,
    AgentStatus,
    AgentType,
    BaseRAGAgent,
    RetrievedChunk,
)
from app.settings import settings

logger = logging.getLogger(__name__)


class DocumentationAgent(BaseRAGAgent):
    """Agent specialized in retrieving and processing documentation.

    This agent:
    1. Retrieves documentation chunks from kb_documents collection
    2. Provides context from technical documentation
    3. Helps understand project requirements and standards
    """

    agent_type = AgentType.DOCUMENTATION

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._collection = settings.QDRANT_COLLECTION_KB_DOCUMENTS
        self._enabled = settings.RAG_AGENT_DOCUMENTATION_ENABLED

    def should_run(self, context: AgentContext) -> bool:
        """Run for documentation-related queries."""
        if not self._enabled:
            return False

        if context.query:
            # Check if query seems documentation-related
            doc_keywords = {
                "documentation", "docs", "guide", "tutorial", "how to",
                "example", "api", "spec", "specification", "requirement",
                "standard", "best practice", "pattern"
            }
            query_lower = context.query.lower()
            return any(kw in query_lower for kw in doc_keywords)

        # Also run if we have documentation in project profile
        if context.project_profile:
            return context.project_profile.get("has_documentation", False)

        return True  # Default to running for comprehensive review

    async def retrieve(self, context: AgentContext) -> list[RetrievedChunk]:
        """Retrieve documentation chunks relevant to the context."""
        if not self.qdrant_client or not self.qdrant_client.enabled:
            return []

        chunks: list[RetrievedChunk] = []

        try:
            queries = self._build_doc_queries(context)

            for query_text in queries[:3]:
                results = await self._search_qdrant(
                    query_text=query_text,
                    org_id=context.org_id,
                    limit=context.max_chunks,
                )

                for hit in results:
                    payload = hit.get("payload", {})
                    chunk = RetrievedChunk(
                        id=str(hit.get("id", "")),
                        content=payload.get("content", ""),
                        score=hit.get("score", 0.0),
                        source="documentation",
                        metadata={
                            "title": payload.get("title"),
                            "source_type": payload.get("source_type"),
                            "source_uri": payload.get("source_uri"),
                            "section_title": payload.get("section_title"),
                            "page": payload.get("page"),
                            "category": payload.get("category"),
                        },
                    )
                    if chunk.id not in {c.id for c in chunks}:
                        chunks.append(chunk)

            chunks.sort(key=lambda c: c.score, reverse=True)
            return self._truncate_chunks(chunks, context.max_chunks)

        except Exception as e:
            logger.error(f"Documentation retrieval failed: {e}")
            return []

    async def process(self, context: AgentContext) -> AgentResult:
        """Process documentation context."""
        start_time = time.time()

        if not self.should_run(context):
            return self._create_skipped_result("Documentation context not needed")

        try:
            chunks = await self.retrieve(context)

            if not chunks:
                return AgentResult(
                    agent_type=self.agent_type,
                    status=AgentStatus.COMPLETED,
                    content="No relevant documentation found.",
                    chunks_retrieved=0,
                    confidence=0.3,
                )

            relevant_chunks = self._filter_by_relevance(
                chunks, context.min_relevance_score
            )

            context_text = self._build_context_text(relevant_chunks)

            analysis_content = self._summarize_documentation(relevant_chunks)

            duration_ms = int((time.time() - start_time) * 1000)

            return AgentResult(
                agent_type=self.agent_type,
                status=AgentStatus.COMPLETED,
                content=analysis_content,
                citations=relevant_chunks,
                duration_ms=duration_ms,
                chunks_retrieved=len(chunks),
                chunks_used=len(relevant_chunks),
                confidence=self._calculate_confidence(relevant_chunks),
                relevance_score=(
                    sum(c.score for c in relevant_chunks) / len(relevant_chunks)
                    if relevant_chunks else 0.0
                ),
            )

        except Exception as e:
            logger.error(f"Documentation processing failed: {e}")
            return self._create_error_result(str(e))

    def _build_doc_queries(self, context: AgentContext) -> list[str]:
        """Build documentation search queries."""
        queries = []

        if context.query:
            queries.append(context.query)

        # Add queries based on changed files
        if context.changed_files:
            file_types = set()
            for f in context.changed_files:
                if f.endswith(".py"):
                    file_types.add("python api documentation")
                elif f.endswith((".ts", ".tsx", ".js", ".jsx")):
                    file_types.add("javascript typescript documentation")
                elif f.endswith(".sql"):
                    file_types.add("database sql documentation")

            queries.extend(list(file_types)[:2])

        return queries if queries else ["project documentation"]

    async def _search_qdrant(
        self,
        query_text: str,
        org_id: str | None,
        limit: int,
    ) -> list[dict[str, Any]]:
        """Search Qdrant for documentation chunks."""
        if not self.qdrant_client:
            return []

        try:
            from app.core.knowledge_base.embeddings import hash_embed_text

            vector = hash_embed_text(query_text)

            filter_payload = {}
            if org_id:
                filter_payload["org_id"] = org_id

            results = await self.qdrant_client.search(
                collection_name=self._collection,
                query_vector=list(vector),
                limit=limit,
                filter_payload=filter_payload if filter_payload else None,
            )

            return [
                {
                    "id": hit.id,
                    "score": hit.score,
                    "payload": hit.payload,
                }
                for hit in results
            ]
        except Exception as e:
            logger.warning(f"Qdrant search failed: {e}")
            return []

    def _summarize_documentation(self, chunks: list[RetrievedChunk]) -> str:
        """Summarize retrieved documentation."""
        if not chunks:
            return "No documentation available."

        sources = {}
        for chunk in chunks:
            source = chunk.metadata.get("title") or chunk.metadata.get("source_uri") or "Unknown"
            if source not in sources:
                sources[source] = []
            section = chunk.metadata.get("section_title")
            if section:
                sources[source].append(section)

        summary_parts = [f"Found {len(chunks)} relevant documentation sections:"]

        for source, sections in list(sources.items())[:5]:
            if sections:
                summary_parts.append(f"- {source}: {', '.join(sections[:3])}")
            else:
                summary_parts.append(f"- {source}")

        return "\n".join(summary_parts)

    def _calculate_confidence(self, chunks: list[RetrievedChunk]) -> float:
        """Calculate confidence based on documentation coverage."""
        if not chunks:
            return 0.0

        avg_score = sum(c.score for c in chunks) / len(chunks)
        coverage_factor = min(1.0, len(chunks) / 5)

        return min(1.0, avg_score * 0.6 + coverage_factor * 0.4)
