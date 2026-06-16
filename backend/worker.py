"""ARQ Background worker for transcription tasks"""

import asyncio
import functools
import logging
import os
from concurrent.futures import ThreadPoolExecutor
from app.database import init_db, close_db
from app.services.transcription_service import TranscriptionService
from app.services.storage_service import get_storage_service
from app.services.audio_processor import downsample_audio, cleanup_file
import mlx_whisper
from mlx_whisper.load_models import load_model
from mlx_whisper.audio import load_audio, SAMPLE_RATE

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# mlx-whisper runs on Apple Silicon via the MLX framework. WHISPER_MODEL may be a
# Hugging Face repo (e.g. "mlx-community/whisper-large-v3-mlx") or a short alias
# below that is resolved to one.
MLX_MODEL_REPOS = {
    "tiny": "mlx-community/whisper-tiny",
    "base": "mlx-community/whisper-base-mlx",
    "small": "mlx-community/whisper-small-mlx",
    "medium": "mlx-community/whisper-medium-mlx",
    "large-v3": "mlx-community/whisper-large-v3-mlx",
    "large-v3-turbo": "mlx-community/whisper-large-v3-turbo",
}
WHISPER_MODEL_REPO = os.getenv("WHISPER_MODEL", "mlx-community/whisper-large-v3-mlx")
# "auto" (or empty) lets Whisper detect the spoken language per file.
WHISPER_LANGUAGE = os.getenv("WHISPER_LANGUAGE", "auto")
# Audio is transcribed in fixed-length windows so we can report real progress and
# honour a stop request between windows. Whisper already decodes in 30s windows
# internally, so a multiple of 30s keeps boundary cost low while giving useful
# progress granularity on long files.
CHUNK_SECONDS = int(os.getenv("WHISPER_CHUNK_SECONDS", "60"))

# Metal GPU streams in MLX are thread-local: every MLX/Metal call (model load,
# audio decode, transcribe) must run on the SAME thread, or it aborts with
# "There is no Stream(gpu, N) in current thread." A single-worker executor keeps
# all that work pinned to one thread while the event loop stays free for DB I/O.
_mlx_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="mlx")


async def _run_mlx(func, *args, **kwargs):
    """Run a blocking MLX call on the dedicated MLX thread."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_mlx_executor, functools.partial(func, *args, **kwargs))


def _transcribe_window(audio, start: int, end: int, repo: str, language):
    """Transcribe one audio window. Runs entirely on the MLX thread, including the
    slice, so no mlx array is ever touched off that thread."""
    chunk = audio[start:end]
    result = mlx_whisper.transcribe(
        chunk,
        path_or_hf_repo=repo,
        language=language,
        condition_on_previous_text=False,
        no_speech_threshold=0.6,
        word_timestamps=False,
    )
    return (result.get("text") or "").strip(), result.get("language")


def resolve_model_repo(name: str) -> str:
    """Resolve a short model alias to an mlx-community HF repo, or pass through a repo id."""
    if "/" in name:
        return name
    return MLX_MODEL_REPOS.get(name, "mlx-community/whisper-large-v3-mlx")


def get_whisper_model():
    """Load (and cache) the MLX Whisper model. load_model is internally lru-cached."""
    repo = resolve_model_repo(WHISPER_MODEL_REPO)
    logger.info(f"🔄 Loading MLX Whisper model: {repo}")
    model = load_model(repo)
    logger.info(f"✅ MLX Whisper model loaded: {repo}")
    return model


async def transcribe_audio(ctx, audio_id: int) -> dict:
    """Transcription job"""
    try:
        logger.info(f"🎤 Starting transcription: audio_id={audio_id}")
        
        await init_db()
        
        audio_file = await TranscriptionService.get_audio_file(audio_id)
        if not audio_file:
            raise FileNotFoundError(f"Audio file not found: {audio_id}")
        
        logger.info(f"📁 Processing: {audio_file['original_filename']}")
        
        storage_service = get_storage_service()
        
        local_audio_path = f"/tmp/audio-processing/{audio_id}-original"
        os.makedirs("/tmp/audio-processing", exist_ok=True)
        
        await storage_service.download_file(audio_file['storage_key'], local_audio_path)
        logger.info(f"✅ Downloaded from storage: {local_audio_path}")
        
        downsampled_path = f"/tmp/audio-processing/{audio_id}-downsampled.wav"
        await downsample_audio(local_audio_path, downsampled_path)
        logger.info(f"✅ Audio downsampled: {downsampled_path}")
        
        cleanup_file(local_audio_path)

        repo = resolve_model_repo(WHISPER_MODEL_REPO)
        language = None if WHISPER_LANGUAGE.lower() in ("auto", "") else WHISPER_LANGUAGE

        # Decode the 16kHz mono audio into samples up front so we can transcribe it
        # in fixed windows — this is what lets us report progress and stop between
        # windows. Run on the MLX thread (it returns an mlx array bound to that thread).
        audio = await _run_mlx(load_audio, downsampled_path)
        total_samples = len(audio)
        chunk_samples = max(1, CHUNK_SECONDS * SAMPLE_RATE)
        num_chunks = max(1, (total_samples + chunk_samples - 1) // chunk_samples)

        logger.info(
            f"⏱️ Transcribing ({repo}) in {num_chunks} window(s) of {CHUNK_SECONDS}s..."
        )

        texts: list[str] = []
        # In "auto" mode, detect the language on the first window and reuse it for the
        # rest — keeps the transcript consistent and skips repeated detection.
        current_language = language

        for i in range(num_chunks):
            # Cancellation checkpoint: honour a stop request before doing more compute.
            if await TranscriptionService.is_cancel_requested(audio_id):
                partial = " ".join(t for t in texts if t).strip()
                logger.info(f"🛑 Transcription cancelled: audio_id={audio_id}")
                await TranscriptionService.update_transcription_status(
                    audio_id, "Cancelled", transcription_text=partial
                )
                cleanup_file(downsampled_path)
                return {"audio_id": audio_id, "status": "Cancelled", "chunks_done": i}

            # Transcribe this window on the dedicated MLX thread (blocking, compute
            # heavy) while the event loop stays free for DB progress/cancel I/O.
            # mlx-whisper handles silence/hallucination natively via the no_speech /
            # logprob / compression-ratio thresholds rather than a separate VAD model.
            text, detected_language = await _run_mlx(
                _transcribe_window,
                audio,
                i * chunk_samples,
                (i + 1) * chunk_samples,
                repo,
                current_language,
            )

            if current_language is None:
                current_language = detected_language

            texts.append(text)

            progress = int((i + 1) / num_chunks * 100)
            await TranscriptionService.update_progress(audio_id, progress)
            logger.info(f"📈 Progress: audio_id={audio_id} {progress}% ({i + 1}/{num_chunks})")

        transcription_text = " ".join(t for t in texts if t).strip()

        logger.info(f"✅ Transcription complete: {len(transcription_text)} chars")

        await TranscriptionService.update_transcription_status(
            audio_id,
            "Completed",
            transcription_text=transcription_text
        )

        cleanup_file(downsampled_path)

        logger.info(f"🎉 Transcription succeeded: audio_id={audio_id}")

        return {
            "audio_id": audio_id,
            "status": "Completed",
            "text_length": len(transcription_text)
        }
        
    except Exception as e:
        logger.error(f"❌ Transcription failed: {e}")
        
        try:
            await TranscriptionService.update_transcription_status(
                audio_id,
                "Failed",
                error_message=str(e)
            )
        except Exception as db_error:
            logger.error(f"❌ Failed to update DB with error: {db_error}")
        
        raise
    
    finally:
        try:
            await close_db()
        except:
            pass


async def startup(ctx):
    """Worker startup hook"""
    logger.info("🚀 Worker starting...")
    await init_db()
    
    try:
        logger.info("⏳ Pre-loading Whisper model...")
        await _run_mlx(get_whisper_model)
        logger.info("✅ Whisper model pre-loaded")
    except Exception as e:
        logger.warning(f"⚠️ Failed to pre-load model: {e}")


async def shutdown(ctx):
    """Worker shutdown hook"""
    logger.info("🛑 Worker shutting down...")
    await close_db()
    logger.info("✅ Worker shutdown complete")


# ARQ configuration
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

    logger.info("📡 Starting ARQ worker...")

    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    # run_worker is synchronous and manages its own event loop — do not await it
    # inside asyncio.run(), or it raises "event loop is already running".
    run_worker(WorkerSettings, redis_settings=RedisSettings.from_dsn(redis_url))
