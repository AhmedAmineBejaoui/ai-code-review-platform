"""
Shared database module for all microservices.
Uses SQLAlchemy with async support.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, sessionmaker


class Base(DeclarativeBase):
    """Base class for all database models."""
    pass


_engine = None
_async_engine = None
_session_factory = None
_async_session_factory = None


def get_engine(database_url: str):
    """Get synchronous database engine."""
    global _engine
    if _engine is None:
        # Convert async URL to sync if needed
        sync_url = database_url.replace("+asyncpg", "+psycopg").replace("postgresql://", "postgresql+psycopg://")
        _engine = create_engine(sync_url, pool_pre_ping=True, pool_size=5, max_overflow=10)
    return _engine


def get_async_engine(database_url: str):
    """Get async database engine."""
    global _async_engine
    if _async_engine is None:
        # Convert sync URL to async if needed
        async_url = database_url.replace("+psycopg", "+asyncpg").replace("postgresql://", "postgresql+asyncpg://")
        _async_engine = create_async_engine(async_url, pool_pre_ping=True, pool_size=5, max_overflow=10)
    return _async_engine


def get_session_factory(database_url: str):
    """Get synchronous session factory."""
    global _session_factory
    if _session_factory is None:
        engine = get_engine(database_url)
        _session_factory = sessionmaker(bind=engine, expire_on_commit=False)
    return _session_factory


def get_async_session_factory(database_url: str):
    """Get async session factory."""
    global _async_session_factory
    if _async_session_factory is None:
        engine = get_async_engine(database_url)
        _async_session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)
    return _async_session_factory


@asynccontextmanager
async def get_db_session(database_url: str) -> AsyncGenerator[AsyncSession, None]:
    """Get async database session as context manager."""
    factory = get_async_session_factory(database_url)
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def check_db_health(database_url: str) -> bool:
    """Check database connectivity."""
    try:
        engine = get_async_engine(database_url)
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
