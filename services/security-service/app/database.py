"""
Security Service database configuration.
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from .config import get_settings

_engine = None
_session_factory = None


def get_engine():
    """Get the database engine (singleton)."""
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )
    return _engine


def get_session_factory():
    """Get session factory (singleton)."""
    global _session_factory
    if _session_factory is None:
        engine = get_engine()
        _session_factory = sessionmaker(bind=engine, expire_on_commit=False)
    return _session_factory


def check_database_health() -> bool:
    """Check database connectivity."""
    try:
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
