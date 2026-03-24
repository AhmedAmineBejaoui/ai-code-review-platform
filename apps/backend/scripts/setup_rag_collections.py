#!/usr/bin/env python3
"""Initialize Qdrant collections for the RAG system.

This script creates all required Qdrant collections with their schemas and indexes.
Run this script after deploying Qdrant and before using the RAG features.

Usage:
    python scripts/setup_rag_collections.py

Environment variables required:
    - QDRANT_ENABLED=true
    - QDRANT_URL=http://localhost:6333
    - QDRANT_API_KEY (optional, for Qdrant Cloud)
"""
from __future__ import annotations

import asyncio
import logging
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.integrations.vector_store.qdrant_client import QdrantClient, setup_rag_collections
from app.settings import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


async def main() -> int:
    """Initialize all RAG collections."""
    logger.info("Starting RAG collections setup...")
    logger.info("Qdrant URL: %s", settings.QDRANT_URL)
    logger.info("Qdrant Enabled: %s", settings.QDRANT_ENABLED)

    if not settings.QDRANT_ENABLED:
        logger.error("QDRANT_ENABLED is false. Set QDRANT_ENABLED=true to proceed.")
        return 1

    client = QdrantClient()

    try:
        results = await setup_rag_collections(client)

        # Print summary
        logger.info("\n=== Collection Setup Summary ===")
        all_success = True
        for collection_name, success in results.items():
            status = "✓ OK" if success else "✗ FAILED"
            logger.info("  %s: %s", collection_name, status)
            if not success:
                all_success = False

        if all_success:
            logger.info("\nAll collections created successfully!")
            return 0
        else:
            logger.error("\nSome collections failed to create. Check logs above.")
            return 1

    except Exception as exc:
        logger.exception("Failed to setup RAG collections: %s", exc)
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
