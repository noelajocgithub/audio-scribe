"""AI generation record management."""

import logging
from uuid import UUID
from typing import Optional

from app.database import execute_query, execute_insert, execute_update

logger = logging.getLogger(__name__)


def _serialize_row(row: dict) -> dict:
    result = dict(row)
    for key, val in result.items():
        if isinstance(val, UUID):
            result[key] = str(val)
    return result


class GenerationService:

    @staticmethod
    async def create(
        user_id: int,
        transcription_id: Optional[int],
        prompt_template_id: Optional[str],
        custom_prompt: Optional[str],
        ollama_model: str,
        context_snapshot: str,
    ) -> str:
        result = await execute_insert(
            "INSERT INTO ai_generations "
            "(user_id, transcription_id, prompt_template_id, custom_prompt, "
            "ollama_model, context_snapshot, status) "
            "VALUES ($1, $2, $3, $4, $5, $6, 'streaming') RETURNING id",
            user_id,
            transcription_id,
            prompt_template_id,
            custom_prompt,
            ollama_model,
            context_snapshot,
        )
        return str(result)

    @staticmethod
    async def update_completed(generation_id: str, output: str) -> None:
        await execute_update(
            "UPDATE ai_generations SET status = 'completed', output = $1, completed_at = NOW() WHERE id = $2",
            output, generation_id,
        )

    @staticmethod
    async def update_failed(generation_id: str, error_message: str) -> None:
        await execute_update(
            "UPDATE ai_generations SET status = 'failed', error_message = $1 WHERE id = $2",
            error_message, generation_id,
        )

    @staticmethod
    async def get_by_id(generation_id: str, user_id: int) -> Optional[dict]:
        rows = await execute_query(
            "SELECT id, user_id, transcription_id, prompt_template_id, custom_prompt, "
            "ollama_model, context_snapshot, output, status, error_message, is_saved, "
            "document_title, saved_at, created_at, updated_at "
            "FROM ai_generations WHERE id = $1 AND user_id = $2",
            generation_id, user_id,
        )
        return _serialize_row(rows[0]) if rows else None

    @staticmethod
    async def list_for_user(user_id: int) -> list[dict]:
        rows = await execute_query(
            "SELECT id, transcription_id, prompt_template_id, ollama_model, "
            "output, status, error_message, is_saved, document_title, saved_at, created_at "
            "FROM ai_generations WHERE user_id = $1 ORDER BY created_at DESC",
            user_id,
        )
        return [_serialize_row(r) for r in rows]

    @staticmethod
    async def mark_saved(generation_id: str, user_id: int, document_title: str) -> bool:
        rows = await execute_query(
            "SELECT id FROM ai_generations WHERE id = $1 AND user_id = $2 AND status = 'completed'",
            generation_id, user_id,
        )
        if not rows:
            return False
        await execute_update(
            "UPDATE ai_generations SET is_saved = TRUE, document_title = $1, saved_at = NOW() WHERE id = $2",
            document_title, generation_id,
        )
        return True

    @staticmethod
    async def mark_unsaved(generation_id: str, user_id: int) -> bool:
        rows = await execute_query(
            "SELECT id FROM ai_generations WHERE id = $1 AND user_id = $2",
            generation_id, user_id,
        )
        if not rows:
            return False
        await execute_update(
            "UPDATE ai_generations SET is_saved = FALSE, document_title = NULL, saved_at = NULL WHERE id = $1",
            generation_id,
        )
        return True

    @staticmethod
    async def list_saved(user_id: int, limit: int = 20, offset: int = 0) -> list[dict]:
        rows = await execute_query(
            "SELECT id, document_title, ollama_model, prompt_template_id, saved_at, transcription_id "
            "FROM ai_generations WHERE user_id = $1 AND is_saved = TRUE "
            "ORDER BY saved_at DESC LIMIT $2 OFFSET $3",
            user_id, limit, offset,
        )
        return [_serialize_row(r) for r in rows]
