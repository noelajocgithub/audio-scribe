"""Audio processing service for format conversion and preprocessing"""

import asyncio
import os
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

SUPPORTED_FORMATS = {'mp3', 'wav', 'aiff', 'pcm', 'aac', 'm4a', 'ogg', 'webm', 'mp4'}
TARGET_SAMPLE_RATE = 16000
TARGET_CHANNELS = 1


class AudioProcessingError(Exception):
    pass


async def downsample_audio(input_path: str, output_path: str) -> None:
    if not os.path.exists(input_path):
        raise AudioProcessingError(f"Input file not found: {input_path}")
    
    try:
        output_dir = os.path.dirname(output_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
        
        cmd = [
            'ffmpeg',
            '-i', input_path,
            '-acodec', 'pcm_s16le',
            '-ar', str(TARGET_SAMPLE_RATE),
            '-ac', str(TARGET_CHANNELS),
            '-y',
            output_path
        ]
        
        logger.info(f"🔄 Downsampling audio: {input_path} → {output_path}")
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            error_msg = stderr.decode() if stderr else "Unknown ffmpeg error"
            raise AudioProcessingError(f"FFmpeg failed: {error_msg}")
        
        logger.info(f"✅ Audio downsampled successfully: {output_path}")
        
    except AudioProcessingError:
        raise
    except Exception as e:
        raise AudioProcessingError(f"Audio processing failed: {str(e)}")


async def get_audio_duration(file_path: str) -> float:
    try:
        cmd = [
            'ffprobe',
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            file_path
        ]
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode == 0:
            duration = float(stdout.decode().strip())
            logger.info(f"📊 Audio duration: {duration:.2f} seconds")
            return duration
        else:
            logger.warning(f"⚠️ Could not determine audio duration for {file_path}")
            return 0.0
            
    except Exception as e:
        logger.warning(f"⚠️ Error getting audio duration: {e}")
        return 0.0


def validate_audio_format(filename: str) -> bool:
    file_extension = filename.split('.')[-1].lower()
    is_valid = file_extension in SUPPORTED_FORMATS
    
    if not is_valid:
        logger.warning(f"⚠️ Unsupported format: {file_extension}")
    
    return is_valid


def cleanup_file(file_path: str) -> None:
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"🗑️ Cleaned up temporary file: {file_path}")
    except Exception as e:
        logger.warning(f"⚠️ Failed to cleanup file {file_path}: {e}")
