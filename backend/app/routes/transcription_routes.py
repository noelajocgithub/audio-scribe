"""Transcription job management routes"""

from fastapi import APIRouter, HTTPException
import logging
from arq import create_pool
from arq.connections import RedisSettings
import os

from app.models import TranscribeResponse, StatusResponse, TranscriptionUpdate
from app.services.transcription_service import TranscriptionService

logger = logging.getLogger(__name__)

router = APIRouter()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")


@router.post("/transcribe/{audio_id}", response_model=TranscribeResponse)
async def transcribe_audio(audio_id: int):
    try:
        audio_file = await TranscriptionService.get_audio_file(audio_id)
        
        if not audio_file:
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        await TranscriptionService.update_transcription_status(audio_id, "Processing")
        
        try:
            redis = await create_pool(RedisSettings.from_dsn(REDIS_URL))
            try:
                job = await redis.enqueue_job('transcribe_audio', audio_id)
                logger.info(f"✅ Transcription job enqueued: job_id={job.job_id}, audio_id={audio_id}")
            finally:
                await redis.close()

        except Exception as e:
            logger.error(f"❌ Failed to enqueue job: {e}")
            await TranscriptionService.update_transcription_status(
                audio_id,
                "Failed",
                error_message=str(e)
            )
            raise HTTPException(status_code=500, detail="Failed to enqueue transcription job")
        
        return TranscribeResponse(
            job_id=job.job_id,
            audio_id=audio_id,
            status="Processing",
            message="Transcription job enqueued"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Transcription request failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@router.post("/transcribe/{audio_id}/cancel")
async def cancel_transcription(audio_id: int):
    """Request cancellation of an in-progress transcription.

    Flags the job; the worker stops at its next window boundary and marks the
    transcription 'Cancelled' (keeping any text decoded so far).
    """
    try:
        transcription = await TranscriptionService.get_transcription(audio_id)

        if not transcription:
            raise HTTPException(status_code=404, detail="Transcription not found")

        if transcription['status'] != 'Processing':
            raise HTTPException(
                status_code=409,
                detail=f"Cannot cancel: transcription is '{transcription['status']}'"
            )

        await TranscriptionService.request_cancel(audio_id)
        logger.info(f"🛑 Cancellation requested: audio_id={audio_id}")

        return {"message": "Cancellation requested", "audio_id": audio_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to request cancellation: {e}")
        raise HTTPException(status_code=500, detail="Failed to request cancellation")


@router.get("/status/{audio_id}", response_model=StatusResponse)
async def get_transcription_status(audio_id: int):
    try:
        transcription = await TranscriptionService.get_transcription(audio_id)
        
        if not transcription:
            raise HTTPException(status_code=404, detail="Transcription not found")
        
        return StatusResponse(
            audio_id=audio_id,
            status=transcription['status'],
            progress=transcription.get('progress', 0) or 0,
            transcription_text=transcription['transcription_text'],
            error_message=transcription['error_message'],
            started_at=transcription['started_at'],
            completed_at=transcription['completed_at']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get transcription status")


@router.post("/files/{audio_id}/text")
async def save_transcription_text(audio_id: int, update: TranscriptionUpdate):
    try:
        if not update.transcription_text:
            raise HTTPException(status_code=400, detail="Transcription text is required")
        
        await TranscriptionService.update_transcription_status(
            audio_id,
            status="Completed",
            transcription_text=update.transcription_text
        )
        
        logger.info(f"✅ Transcription text saved: audio_id={audio_id}")
        
        return {"message": "Transcription text saved successfully", "audio_id": audio_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to save transcription: {e}")
        raise HTTPException(status_code=500, detail="Failed to save transcription")
