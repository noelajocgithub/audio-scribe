"""CRUD operations for AI prompt templates."""

import logging
from uuid import UUID
from typing import Optional

from app.database import execute_query, execute_insert, execute_update

logger = logging.getLogger(__name__)


def _serialize_row(row: dict) -> dict:
    """Convert UUID fields to strings for Pydantic serialization."""
    result = dict(row)
    for key, val in result.items():
        if isinstance(val, UUID):
            result[key] = str(val)
    return result


class PromptService:

    @staticmethod
    async def list_active() -> list[dict]:
        rows = await execute_query(
            "SELECT id, title, description, category FROM prompt_templates "
            "WHERE is_active = TRUE ORDER BY title"
        )
        return [_serialize_row(r) for r in rows]

    @staticmethod
    async def list_all() -> list[dict]:
        rows = await execute_query(
            "SELECT id, title, description, template, category, is_active, "
            "created_by, created_at, updated_at "
            "FROM prompt_templates ORDER BY created_at DESC"
        )
        return [_serialize_row(r) for r in rows]

    @staticmethod
    async def get_by_id(template_id: str) -> Optional[dict]:
        rows = await execute_query(
            "SELECT id, title, description, template, category, is_active, "
            "created_by, created_at, updated_at "
            "FROM prompt_templates WHERE id = $1",
            template_id,
        )
        return _serialize_row(rows[0]) if rows else None

    @staticmethod
    async def create(
        title: str,
        description: Optional[str],
        template: str,
        category: str,
        created_by: int,
    ) -> str:
        result = await execute_insert(
            "INSERT INTO prompt_templates (title, description, template, category, created_by) "
            "VALUES ($1, $2, $3, $4, $5) RETURNING id",
            title, description, template, category, created_by,
        )
        return str(result)

    @staticmethod
    async def update(template_id: str, **fields) -> None:
        allowed = {"title", "description", "template", "category", "is_active"}
        updates = {k: v for k, v in fields.items() if k in allowed and v is not None}
        if not updates:
            return

        set_parts = []
        values = []
        for i, (key, val) in enumerate(updates.items(), start=1):
            set_parts.append(f"{key} = ${i}")
            values.append(val)

        values.append(template_id)
        query = (
            f"UPDATE prompt_templates SET {', '.join(set_parts)} "
            f"WHERE id = ${len(values)}"
        )
        await execute_update(query, *values)

    @staticmethod
    async def soft_delete(template_id: str) -> None:
        await execute_update(
            "UPDATE prompt_templates SET is_active = FALSE WHERE id = $1",
            template_id,
        )
