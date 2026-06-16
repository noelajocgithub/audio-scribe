"""Audio file management routes"""

from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
import os
import logging
from datetime import datetime

from app.models import AudioFileResponse, UploadResponse, RenameRequest
from app.services.audio_processor import validate_audio_format, get_audio_duration
from app.services.storage_service import get_storage_service, StorageService
from app.services.transcription_service import TranscriptionService
from app.database import execute_insert, execute_query

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_UPLOAD_SIZE = 500 * 1024 * 1024  # 500MB
TEMP_DIR = "/tmp/audio-scribe-uploads"


@router.post("/upload", response_model=UploadResponse)
async def upload_audio(file: UploadFile = File(...)):
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="Filename is required")
        
        if not validate_audio_format(file.filename):
            raise HTTPException(
                status_code=400,
                detail="Unsupported audio format. Supported: mp3, wav, aiff, pcm, aac, m4a, ogg"
            )
        
        os.makedirs(TEMP_DIR, exist_ok=True)
        temp_path = os.path.join(TEMP_DIR, file.filename)
        
        file_size = 0
        with open(temp_path, 'wb') as f:
            while True:
                chunk = await file.read(8192)
                if not chunk:
                    break
                file_size += len(chunk)
                
                if file_size > MAX_UPLOAD_SIZE:
                    os.remove(temp_path)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large. Maximum size: 500MB"
                    )
                f.write(chunk)
        
        logger.info(f"📁 File uploaded to temp: {temp_path} ({file_size} bytes)")
        
        file_ext = file.filename.split('.')[-1].lower()
        storage_key = f"audio-files/{datetime.utcnow().timestamp()}-{file.filename}"
        
        duration = await get_audio_duration(temp_path)
        
        storage_service = get_storage_service()
        await storage_service.upload_file(temp_path, storage_key)
        
        os.remove(temp_path)
        
        query = """
            INSERT INTO audio_files
            (original_filename, title, file_format, duration_seconds, storage_key, file_size_bytes, upload_timestamp)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        """

        audio_id = await execute_insert(
            query,
            file.filename,
            file.filename,
            file_ext,
            duration,
            storage_key,
            file_size,
            datetime.utcnow()
        )
        
        await TranscriptionService.create_transcription_record(audio_id)
        
        logger.info(f"✅ Audio file stored: ID {audio_id}")
        
        return UploadResponse(audio_id=audio_id, message="File uploaded successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/files")
async def list_files():
    try:
        files = await TranscriptionService.list_files_with_transcriptions()
        return {"files": files}
    except Exception as e:
        logger.error(f"❌ Failed to list files: {e}")
        raise HTTPException(status_code=500, detail="Failed to list files")


@router.get("/files/{audio_id}", response_model=AudioFileResponse)
async def get_file(audio_id: int):
    try:
        audio_file = await TranscriptionService.get_audio_file(audio_id)

        if not audio_file:
            raise HTTPException(status_code=404, detail="Audio file not found")

        return AudioFileResponse(**audio_file)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to fetch file: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch file")


@router.get("/files/{audio_id}/audio")
async def stream_audio(audio_id: int):
    """Stream the stored audio back to the browser for playback."""
    audio_file = await TranscriptionService.get_audio_file(audio_id)
    if not audio_file:
        raise HTTPException(status_code=404, detail="Audio file not found")

    storage_service = get_storage_service()
    content_type = StorageService._get_content_type(audio_file['storage_key'])
    filename = audio_file.get('title') or audio_file['original_filename']

    return StreamingResponse(
        storage_service.stream_file(audio_file['storage_key']),
        media_type=content_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.patch("/files/{audio_id}", response_model=AudioFileResponse)
async def rename_file(audio_id: int, payload: RenameRequest):
    """Set a friendly display title for an audio file / transcription."""
    try:
        audio_file = await TranscriptionService.get_audio_file(audio_id)
        if not audio_file:
            raise HTTPException(status_code=404, detail="Audio file not found")

        await TranscriptionService.update_title(audio_id, payload.title.strip())
        updated = await TranscriptionService.get_audio_file(audio_id)
        logger.info(f"✏️ Renamed audio {audio_id} → {payload.title!r}")
        return AudioFileResponse(**updated)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to rename file: {e}")
        raise HTTPException(status_code=500, detail="Failed to rename file")


@router.delete("/files/{audio_id}")
async def delete_file(audio_id: int):
    """Delete an audio file, its transcription, and the stored object."""
    try:
        audio_file = await TranscriptionService.get_audio_file(audio_id)
        if not audio_file:
            raise HTTPException(status_code=404, detail="Audio file not found")

        # Remove from object storage first (best-effort), then the DB rows.
        storage_service = get_storage_service()
        await storage_service.delete_file(audio_file['storage_key'])
        await TranscriptionService.delete_audio_file(audio_id)

        logger.info(f"🗑️ Deleted audio {audio_id} and its transcription")
        return {"message": "Deleted", "audio_id": audio_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to delete file: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete file")
