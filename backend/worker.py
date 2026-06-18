"""ARQ Background worker for transcription tasks (faster-whisper, Linux x86_64)"""

import asyncio
import functools
import logging
import os
import time
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
SAMPLE_RATE = 16000

# How often (wall-clock seconds) the transcription loop polls the cancel flag
# and reports progress. Throttled to keep DB round-trips modest on long files.
PROGRESS_INTERVAL_SECONDS = 2.0

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


def _transcribe_file(
    audio_path: str,
    language: str | None,
    on_progress,
    should_cancel,
) -> tuple[str, str | None, bool]:
    """Transcribe an audio file using faster-whisper.

    faster-whisper yields segments lazily, so iterating them lets us report
    incremental progress (via ``on_progress(fraction)``) and honour a
    cancellation request mid-run (via ``should_cancel()``) instead of only
    before the work starts. Returns (text, detected_language, cancelled).
    """
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

    total_duration = info.duration or 0.0
    texts: list[str] = []
    cancelled = False
    last_check = 0.0

    for segment in segments:
        # Throttle DB round-trips: poll the cancel flag and push progress at
        # most once per PROGRESS_INTERVAL_SECONDS of wall-clock time.
        now = time.monotonic()
        if now - last_check >= PROGRESS_INTERVAL_SECONDS:
            last_check = now
            if should_cancel():
                cancelled = True
                break
            if total_duration > 0:
                on_progress(min(1.0, segment.end / total_duration))

        text = segment.text.strip()
        if text:
            texts.append(text)

    transcription = " ".join(texts)
    return transcription, info.language, cancelled


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

        # The transcription runs in a worker thread, so bridge its progress and
        # cancel checks back to this event loop via run_coroutine_threadsafe.
        loop = asyncio.get_running_loop()

        def on_progress(fraction: float) -> None:
            # Map transcription completion (0..1) onto the 10..90 band; the
            # download/downsample took the first 10%, finalisation the last 10%.
            progress = 10 + int(fraction * 80)
            asyncio.run_coroutine_threadsafe(
                TranscriptionService.update_progress(audio_id, progress), loop
            )

        def should_cancel() -> bool:
            future = asyncio.run_coroutine_threadsafe(
                TranscriptionService.is_cancel_requested(audio_id), loop
            )
            return future.result()

        transcription_text, detected_language, cancelled = await _run_blocking(
            _transcribe_file, downsampled_path, language, on_progress, should_cancel
        )

        if cancelled:
            logger.info(f"Transcription cancelled mid-run: audio_id={audio_id}")
            await TranscriptionService.update_transcription_status(
                audio_id,
                "Cancelled",
                transcription_text=transcription_text or None,
            )
            cleanup_file(downsampled_path)
            return {"audio_id": audio_id, "status": "Cancelled"}

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
    # CPU transcription of long audio can run near (or over) real-time, so allow
    # generous headroom — default 6h, override with WHISPER_JOB_TIMEOUT.
    job_timeout = int(os.getenv("WHISPER_JOB_TIMEOUT", "21600"))
    # A timeout/failure on an hour-long file should not silently re-burn hours
    # re-transcribing it; surface the failure on the first attempt instead.
    max_tries = 1
    result_ttl = 86400


if __name__ == "__main__":
    from arq import run_worker
    from arq.connections import RedisSettings

    logger.info("Starting ARQ worker...")

    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    run_worker(WorkerSettings, redis_settings=RedisSettings.from_dsn(redis_url))
