# LangChain Cutover Runbook

## Purpose

This runbook covers the operational path from `shadow` mode to primary LangChain usage, including:

- corpus-wide parity validation
- Qdrant alias promotion and rollback
- feature-flag changes
- inter-worker concurrency protection
- the decision gate for a deeper move to native LangChain/Qdrant primitives

## Prerequisites

- `LANGCHAIN_ENABLED=true`
- `LANGCHAIN_SHADOW_MODE=true`
- `LANGCHAIN_COMPARE_OUTPUTS_ENABLED=true`
- `LANGCHAIN_PRIMARY_STACK=legacy`
- `LANGCHAIN_ALLOW_LEGACY_FALLBACK=true`
- Redis available through `REDIS_URL` or the Celery broker URL
- Qdrant healthy and reachable

## 1. Build a corpus-wide parity report

Run the campaign on recent completed analyses:

```bash
cd apps/backend
poetry run python ../../scripts/langchain_parity_report.py --limit 200 --since-days 14 --output ../../artifacts/langchain-parity.json
```

Review these fields in the JSON output:

- `aggregates.sample_size`
- `aggregates.pydantic_validity_rate`
- `aggregates.context_references_presence_rate`
- `aggregates.citation_overlap_median`
- `aggregates.critical_divergence_rate`
- `latency_ms.langchain_retrieval_p95_ms`
- `latency_ms.langchain_review_generation_p95_ms`
- `latency_ms.review_generation_regression_ratio`
- `decision.cutover_recommended`
- `decision.blocking_reasons`

The default cutover thresholds are controlled by settings:

- `LANGCHAIN_PARITY_MIN_SAMPLE_SIZE`
- `LANGCHAIN_PARITY_PYDANTIC_VALIDITY_MIN`
- `LANGCHAIN_PARITY_CONTEXT_REFERENCES_PRESENCE_MIN`
- `LANGCHAIN_PARITY_CITATION_OVERLAP_MIN`
- `LANGCHAIN_PARITY_CRITICAL_DIVERGENCE_MAX`
- `LANGCHAIN_PARITY_RETRIEVAL_P95_MAX_MS`
- `LANGCHAIN_PARITY_REVIEW_GENERATION_P95_MAX_MS`
- `LANGCHAIN_PARITY_GENERATION_P95_REGRESSION_RATIO_MAX`

Do not promote LangChain while `decision.cutover_recommended=false`.

## 2. Inspect current alias state

```bash
cd apps/backend
poetry run python ../../scripts/langchain_qdrant_aliases.py show
```

Expected state before promotion:

- `shadow_alias` targets the current LangChain physical collection
- `active_alias` may still point at the previous LangChain collection or be unset
- application traffic still uses `LANGCHAIN_PRIMARY_STACK=legacy`

## 3. Promote the active alias

If the parity report is green, point the active alias at the validated physical collection:

```bash
cd apps/backend
poetry run python ../../scripts/langchain_qdrant_aliases.py promote --collection repo_context_lc_v1_mxbai_embed_large
```

Then switch the application flags:

```env
LANGCHAIN_PRIMARY_STACK=langchain
LANGCHAIN_ALLOW_LEGACY_FALLBACK=true
```

Deploy the API and worker with those flags. Keep fallback enabled during the stabilization window.

## 4. Stabilization window

During the first production window after promotion:

- keep `LANGCHAIN_ALLOW_LEGACY_FALLBACK=true`
- watch the newest parity report after each batch of analyses
- confirm that `review_output.source` stays grounded where expected
- confirm that `decision.blocking_reasons` remains empty on the rolling corpus
- confirm that no Redis limiter saturation is starving workers

The runtime already applies:

- local process semaphores for embeddings and generations
- Redis-backed distributed slot limiting across workers when Redis is configured

Relevant settings:

- `LANGCHAIN_MAX_CONCURRENT_GENERATIONS`
- `LANGCHAIN_MAX_CONCURRENT_EMBEDDINGS`
- `LANGCHAIN_DISTRIBUTED_LIMITER_ENABLED`
- `LANGCHAIN_DISTRIBUTED_LIMITER_LEASE_SECONDS`
- `LANGCHAIN_DISTRIBUTED_LIMITER_POLL_SECONDS`

## 5. Rollback

Rollback is two-step and should be executed in this order.

Step 1: switch traffic back to legacy

```env
LANGCHAIN_PRIMARY_STACK=legacy
LANGCHAIN_ALLOW_LEGACY_FALLBACK=true
```

Redeploy API and worker first.

Step 2: restore the active alias if needed

```bash
cd apps/backend
poetry run python ../../scripts/langchain_qdrant_aliases.py rollback --collection <previous_langchain_collection>
```

Use the previous versioned LangChain collection, not the legacy hash-embedding collection.

Rollback triggers:

- `decision.cutover_recommended=false` on the fresh post-promotion corpus
- retrieval or generation `p95` breaches
- citation grounding regression
- repeated LangChain fallbacks or parser failures

## 6. Decision on deeper native LangChain/Qdrant porting

Do not deepen the migration to `QdrantVectorStore` or more native LangChain retrieval primitives before:

- corpus-wide parity passes
- primary cutover is stable
- operational rollback is proven

Current recommendation:

- keep the repo-aware wrappers as the primary retrieval composition layer
- revisit a deeper native port only if those wrappers become the performance or maintenance bottleneck

The parity campaign output already exposes `native_primitives_recommendation`:

- `defer`: keep the current wrappers
- `evaluate_post_cutover`: parity and cutover are healthy enough to revisit the question
