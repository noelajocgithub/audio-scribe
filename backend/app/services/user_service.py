"""Database operations for users / RBAC."""

import logging
from datetime import datetime
from typing import Optional

from app.database import execute_query, execute_insert, execute_update

logger = logging.getLogger(__name__)

# Columns safe to return to clients (never includes password_hash).
PUBLIC_COLUMNS = "id, email, username, role, status, approved_by, approved_at, created_at, updated_at"


class UserService:
    @staticmethod
    async def create_user(
        email: str,
        username: str,
        password_hash: str,
        role: str = "user",
        status: str = "pending",
    ) -> int:
        query = """
            INSERT INTO users (email, username, password_hash, role, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $6)
            RETURNING id
        """
        return await execute_insert(
            query, email.lower().strip(), username.strip(), password_hash, role, status, datetime.utcnow()
        )

    @staticmethod
    async def get_by_email(email: str) -> Optional[dict]:
        """Includes password_hash — for authentication only, never return to clients."""
        rows = await execute_query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", email.strip())
        return dict(rows[0]) if rows else None

    @staticmethod
    async def get_by_identifier(identifier: str) -> Optional[dict]:
        """Look up a user by username OR email (for login). Includes password_hash."""
        rows = await execute_query(
            "SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)",
            identifier.strip(),
        )
        return dict(rows[0]) if rows else None

    @staticmethod
    async def get_by_id(user_id: int) -> Optional[dict]:
        rows = await execute_query(f"SELECT {PUBLIC_COLUMNS} FROM users WHERE id = $1", user_id)
        return dict(rows[0]) if rows else None

    @staticmethod
    async def email_or_username_taken(email: str, username: str) -> bool:
        rows = await execute_query(
            "SELECT 1 FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2) LIMIT 1",
            email.strip(), username.strip(),
        )
        return bool(rows)

    @staticmethod
    async def count_users() -> int:
        rows = await execute_query("SELECT COUNT(*) AS c FROM users")
        return rows[0]["c"] if rows else 0

    @staticmethod
    async def list_users() -> list[dict]:
        rows = await execute_query(f"SELECT {PUBLIC_COLUMNS} FROM users ORDER BY created_at DESC")
        return [dict(r) for r in rows]

    @staticmethod
    async def list_pending() -> list[dict]:
        rows = await execute_query(
            f"SELECT {PUBLIC_COLUMNS} FROM users WHERE status = 'pending' ORDER BY created_at ASC"
        )
        return [dict(r) for r in rows]

    @staticmethod
    async def approve_user(user_id: int, approver_id: int) -> None:
        await execute_update(
            """
            UPDATE users
            SET status = 'active', approved_by = $1, approved_at = $2, updated_at = $2
            WHERE id = $3 AND status = 'pending'
            """,
            approver_id, datetime.utcnow(), user_id,
        )

    @staticmethod
    async def set_role(user_id: int, role: str) -> None:
        await execute_update(
            "UPDATE users SET role = $1, updated_at = $2 WHERE id = $3",
            role, datetime.utcnow(), user_id,
        )

    @staticmethod
    async def set_status(user_id: int, status: str) -> None:
        await execute_update(
            "UPDATE users SET status = $1, updated_at = $2 WHERE id = $3",
            status, datetime.utcnow(), user_id,
        )

    @staticmethod
    async def delete_user(user_id: int) -> None:
        await execute_update("DELETE FROM users WHERE id = $1", user_id)
