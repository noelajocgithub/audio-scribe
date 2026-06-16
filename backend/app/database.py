"""Database connection and migration management"""

import asyncpg
import os
from typing import Optional
import logging

logger = logging.getLogger(__name__)

_pool: Optional[asyncpg.Pool] = None


async def init_db() -> None:
    """Initialize database connection pool"""
    global _pool
    
    database_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/audio_scribe")
    database_url = database_url.replace("postgresql+asyncpg://", "postgresql://")
    
    try:
        _pool = await asyncpg.create_pool(
            database_url,
            min_size=5,
            max_size=20,
            command_timeout=60,
        )
        logger.info("✅ Database connection pool initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize database: {e}")
        raise


async def close_db() -> None:
    """Close database connection pool"""
    global _pool
    
    if _pool:
        await _pool.close()
        logger.info("✅ Database connection pool closed")


async def get_connection():
    """Get a connection from the pool"""
    global _pool
    
    if _pool is None:
        raise RuntimeError("Database pool not initialized. Call init_db() first.")
    
    return await _pool.acquire()


async def execute_query(query: str, *args):
    """Execute a query and return results"""
    conn = await get_connection()
    try:
        result = await conn.fetch(query, *args)
        return result
    finally:
        await _pool.release(conn)


async def execute_insert(query: str, *args):
    """Execute an insert query and return the inserted ID"""
    conn = await get_connection()
    try:
        result = await conn.fetchval(query, *args)
        return result
    finally:
        await _pool.release(conn)


async def execute_update(query: str, *args):
    """Execute an update query"""
    conn = await get_connection()
    try:
        await conn.execute(query, *args)
    finally:
        await _pool.release(conn)


async def run_migrations() -> None:
    """Run database migrations using the active connection pool.

    Must be awaited from within the running event loop — do not wrap in
    asyncio.run(), which would fail because the pool is bound to this loop.
    """
    migration_file = os.path.join(
        os.path.dirname(__file__),
        "..",
        "migrations",
        "001_initial_schema.sql"
    )

    if not os.path.exists(migration_file):
        logger.warning(f"⚠️ Migration file not found: {migration_file}")
        return

    with open(migration_file, 'r') as f:
        migration_sql = f.read()

    conn = await get_connection()
    try:
        await conn.execute(migration_sql)
        logger.info("✅ Database migrations completed")
    finally:
        await _pool.release(conn)
