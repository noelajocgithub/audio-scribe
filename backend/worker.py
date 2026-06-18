"""ARQ Background worker for transcription tasks (faster-whisper, Linux x86_64)"""

import asyncio
import functools
import logging
import os
from concurrent.futures import ThreadPoolExecutor
from app.database import init_db, close_db
from app.services.transcription_service import TranscriptionService
from app.services.storage_service import get_storage_service
from app.services.audio_processor import downsample_audio, cleanup_file
from faster_whisper import WhisperModel

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL", "large-v3")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
WHISPER_LANGUAGE = os.getenv("WHISPER_LANGUAGE", "auto")
CHUNK_SECONDS = int(os.getenv("WHISPER_CHUNK_SECONDS", "60"))
SAMPLE_RATE = 16000

_whisper_model: WhisperModel | None = None
_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="whisper")


async def _run_blocking(func, *args, **kwargs):
    """Run a blocking call in the dedicated thread."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, functools.partial(func, *args, **kwargs))


def get_whisper_model() -> WhisperModel:
    """Load (and cache) the faster-whisper model."""
    global _whisper_model
    if _whisper_model is None:
        logger.info(f"Loading faster-whisper model: {WHISPER_MODEL_SIZE} (device={WHISPER_DEVICE}, compute={WHISPER_COMPUTE_TYPE})")
        _whisper_model = WhisperModel(
            WHISPER_MODEL_SIZE,
            device=WHISPER_DEVICE,
            compute_type=WHISPER_COMPUTE_TYPE,
        )
        logger.info(f"Model loaded: {WHISPER_MODEL_SIZE}")
    return _whisper_model


def _transcribe_file(audio_path: str, language: str | None) -> tuple[str, str | None]:
    """Transcribe an audio file using faster-whisper. Returns (text, detected_language)."""
    model = get_whisper_model()
    segments, info = model.transcribe(
        audio_path,
        language=language,
        beam_size=5,
        vad_filter=True,
        vad_parameters=dict(
            min_silence_duration_ms=500,
            speech_pad_ms=200,
        ),
    )
    texts = []
    for segment in segments:
        texts.append(segment.text.strip())
    transcription = " ".join(t for t in texts if t)
    return transcription, info.language


async def transcribe_audio(ctx, audio_id: int) -> dict:
    """Transcription job"""
    try:
        logger.info(f"Starting transcription: audio_id={audio_id}")

        await init_db()

        audio_file = await TranscriptionService.get_audio_file(audio_id)
        if not audio_file:
            raise FileNotFoundError(f"Audio file not found: {audio_id}")

        logger.info(f"Processing: {audio_file['original_filename']}")

        storage_service = get_storage_service()

        local_audio_path = f"/tmp/audio-processing/{audio_id}-original"
        os.makedirs("/tmp/audio-processing", exist_ok=True)

        await storage_service.download_file(audio_file['storage_key'], local_audio_path)
        logger.info(f"Downloaded from storage: {local_audio_path}")

        downsampled_path = f"/tmp/audio-processing/{audio_id}-downsampled.wav"
        await downsample_audio(local_audio_path, downsampled_path)
        logger.info(f"Audio downsampled: {downsampled_path}")

        cleanup_file(local_audio_path)

        if await TranscriptionService.is_cancel_requested(audio_id):
            logger.info(f"Transcription cancelled before start: audio_id={audio_id}")
            await TranscriptionService.update_transcription_status(audio_id, "Cancelled")
            cleanup_file(downsampled_path)
            return {"audio_id": audio_id, "status": "Cancelled"}

        language = None if WHISPER_LANGUAGE.lower() in ("auto", "") else WHISPER_LANGUAGE

        logger.info(f"Transcribing with faster-whisper ({WHISPER_MODEL_SIZE})...")
        await TranscriptionService.update_progress(audio_id, 10)

        transcription_text, detected_language = await _run_blocking(
            _transcribe_file, downsampled_path, language
        )

        await TranscriptionService.update_progress(audio_id, 90)

        logger.info(f"Transcription complete: {len(transcription_text)} chars, language={detected_language}")

        await TranscriptionService.update_transcription_status(
            audio_id,
            "Completed",
            transcription_text=transcription_text
        )

        await TranscriptionService.update_progress(audio_id, 100)

        cleanup_file(downsampled_path)

        logger.info(f"Transcription succeeded: audio_id={audio_id}")

        return {
            "audio_id": audio_id,
            "status": "Completed",
            "text_length": len(transcription_text)
        }

    except Exception as e:
        logger.error(f"Transcription failed: {e}")

        try:
            await TranscriptionService.update_transcription_status(
                audio_id,
                "Failed",
                error_message=str(e)
            )
        except Exception as db_error:
            logger.error(f"Failed to update DB with error: {db_error}")

        raise

    finally:
        try:
            await close_db()
        except:
            pass


async def startup(ctx):
    """Worker startup hook"""
    logger.info("Worker starting...")
    await init_db()

    try:
        logger.info("Pre-loading Whisper model...")
        await _run_blocking(get_whisper_model)
        logger.info("Whisper model pre-loaded")
    except Exception as e:
        logger.warning(f"Failed to pre-load model: {e}")


async def shutdown(ctx):
    """Worker shutdown hook"""
    logger.info("Worker shutting down...")
    await close_db()
    logger.info("Worker shutdown complete")


class WorkerSettings:
    functions = [transcribe_audio]
    on_startup = startup
    on_shutdown = shutdown
    job_timeout = 3600
    max_tries = 3
    result_ttl = 86400


if __name__ == "__main__":
    from arq import run_worker
    from arq.connections import RedisSettings

    logger.info("Starting ARQ worker...")

    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    run_worker(WorkerSettings, redis_settings=RedisSettings.from_dsn(redis_url))
