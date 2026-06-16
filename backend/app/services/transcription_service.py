"""Transcription orchestration service"""

import os
import logging
from datetime import datetime
from app.database import execute_insert, execute_update, execute_query

logger = logging.getLogger(__name__)


class TranscriptionService:
    """Service for managing transcription workflow"""
    
    @staticmethod
    async def create_transcription_record(audio_file_id: int) -> int:
        try:
            query = """
                INSERT INTO transcriptions (audio_file_id, status, created_at, updated_at)
                VALUES ($1, $2, $3, $3)
                RETURNING id
            """
            
            transcription_id = await execute_insert(
                query,
                audio_file_id,
                'Pending',
                datetime.utcnow()
            )
            
            logger.info(f"✅ Created transcription record: ID {transcription_id}")
            return transcription_id
            
        except Exception as e:
            logger.error(f"❌ Failed to create transcription record: {e}")
            raise
    
    @staticmethod
    async def get_transcription(audio_file_id: int):
        try:
            query = """
                SELECT id, audio_file_id, status, transcription_text, progress,
                       cancel_requested, started_at, completed_at, error_message,
                       created_at, updated_at
                FROM transcriptions
                WHERE audio_file_id = $1
            """
            
            result = await execute_query(query, audio_file_id)
            
            if result:
                return dict(result[0])
            return None
            
        except Exception as e:
            logger.error(f"❌ Failed to fetch transcription: {e}")
            raise
    
    @staticmethod
    async def update_transcription_status(
        audio_file_id: int,
        status: str,
        transcription_text: str = None,
        error_message: str = None
    ) -> None:
        try:
            if status == 'Processing':
                # Starting (or retrying): reset progress and clear any stale cancel flag.
                query = """
                    UPDATE transcriptions
                    SET status = $1, started_at = $2, updated_at = $2,
                        progress = 0, cancel_requested = FALSE,
                        error_message = NULL, completed_at = NULL
                    WHERE audio_file_id = $3
                """
                await execute_update(query, status, datetime.utcnow(), audio_file_id)

            elif status == 'Completed':
                query = """
                    UPDATE transcriptions
                    SET status = $1, transcription_text = COALESCE($2, transcription_text),
                        progress = 100, completed_at = $3, updated_at = $3
                    WHERE audio_file_id = $4
                """
                await execute_update(query, status, transcription_text, datetime.utcnow(), audio_file_id)

            elif status == 'Failed':
                query = """
                    UPDATE transcriptions
                    SET status = $1, error_message = $2, completed_at = $3, updated_at = $3
                    WHERE audio_file_id = $4
                """
                await execute_update(query, status, error_message, datetime.utcnow(), audio_file_id)

            elif status == 'Cancelled':
                # Preserve any partial text decoded before the stop request.
                query = """
                    UPDATE transcriptions
                    SET status = $1,
                        transcription_text = COALESCE($2, transcription_text),
                        cancel_requested = FALSE, completed_at = $3, updated_at = $3
                    WHERE audio_file_id = $4
                """
                await execute_update(query, status, transcription_text, datetime.utcnow(), audio_file_id)

            else:
                raise ValueError(f"Invalid status: {status}")
            
            logger.info(f"✅ Updated transcription status: audio_file_id={audio_file_id}, status={status}")
            
        except Exception as e:
            logger.error(f"❌ Failed to update transcription status: {e}")
            raise
    
    @staticmethod
    async def update_title(audio_file_id: int, title: str) -> None:
        """Set a friendly display title for an audio file."""
        query = """
            UPDATE audio_files
            SET title = $1, updated_at = $2
            WHERE id = $3
        """
        await execute_update(query, title, datetime.utcnow(), audio_file_id)

    @staticmethod
    async def delete_audio_file(audio_file_id: int) -> None:
        """Delete an audio file row. The transcription row is removed via ON DELETE CASCADE."""
        query = "DELETE FROM audio_files WHERE id = $1"
        await execute_update(query, audio_file_id)

    @staticmethod
    async def update_progress(audio_file_id: int, progress: int) -> None:
        """Persist transcription progress (0-100) for status polling."""
        progress = max(0, min(100, int(progress)))
        query = """
            UPDATE transcriptions
            SET progress = $1, updated_at = $2
            WHERE audio_file_id = $3
        """
        await execute_update(query, progress, datetime.utcnow(), audio_file_id)

    @staticmethod
    async def request_cancel(audio_file_id: int) -> None:
        """Flag a transcription for cancellation; the worker stops at the next checkpoint."""
        query = """
            UPDATE transcriptions
            SET cancel_requested = TRUE, updated_at = $1
            WHERE audio_file_id = $2
        """
        await execute_update(query, datetime.utcnow(), audio_file_id)

    @staticmethod
    async def is_cancel_requested(audio_file_id: int) -> bool:
        """Check whether a stop has been requested for this transcription."""
        query = "SELECT cancel_requested FROM transcriptions WHERE audio_file_id = $1"
        result = await execute_query(query, audio_file_id)
        if result:
            return bool(result[0]['cancel_requested'])
        return False

    @staticmethod
    async def get_audio_file(audio_file_id: int):
        try:
            query = """
                SELECT id, original_filename, title, file_format, duration_seconds,
                       storage_key, file_size_bytes, upload_timestamp, updated_at
                FROM audio_files
                WHERE id = $1
            """
            
            result = await execute_query(query, audio_file_id)
            
            if result:
                return dict(result[0])
            return None
            
        except Exception as e:
            logger.error(f"❌ Failed to fetch audio file: {e}")
            raise
    
    @staticmethod
    async def list_files_with_transcriptions():
        try:
            query = """
                SELECT
                    af.id, af.original_filename, af.title, af.file_format, af.duration_seconds,
                    af.file_size_bytes, af.storage_key, af.upload_timestamp,
                    t.status, t.transcription_text, t.progress, t.error_message, t.completed_at
                FROM audio_files af
                LEFT JOIN transcriptions t ON af.id = t.audio_file_id
                ORDER BY af.upload_timestamp DESC
            """
            
            result = await execute_query(query)
            
            if result:
                return [dict(row) for row in result]
            return []
            
        except Exception as e:
            logger.error(f"❌ Failed to list files: {e}")
            raise
