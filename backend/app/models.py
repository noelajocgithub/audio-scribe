"""Pydantic models for request/response validation"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class AudioFileBase(BaseModel):
    original_filename: str
    title: Optional[str] = None
    file_format: str
    duration_seconds: Optional[float] = None
    file_size_bytes: Optional[int] = None


class RenameRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)


class AudioFileCreate(AudioFileBase):
    pass


class AudioFileResponse(AudioFileBase):
    id: int
    storage_key: str
    upload_timestamp: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TranscriptionBase(BaseModel):
    status: str = Field(default="Pending")
    transcription_text: Optional[str] = None
    error_message: Optional[str] = None


class TranscriptionCreate(TranscriptionBase):
    audio_file_id: int


class TranscriptionUpdate(BaseModel):
    transcription_text: Optional[str] = None
    status: Optional[str] = None


class TranscriptionResponse(TranscriptionBase):
    id: int
    audio_file_id: int
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FileWithTranscriptionResponse(BaseModel):
    id: int
    original_filename: str
    file_format: str
    duration_seconds: Optional[float]
    file_size_bytes: Optional[int]
    upload_timestamp: datetime
    storage_key: str
    transcription: Optional[TranscriptionResponse] = None

    class Config:
        from_attributes = True


class UploadResponse(BaseModel):
    audio_id: int
    message: str = "File uploaded successfully"


class TranscribeResponse(BaseModel):
    job_id: str
    audio_id: int
    status: str
    message: str = "Transcription job enqueued"


class StatusResponse(BaseModel):
    audio_id: int
    status: str
    progress: int = 0
    transcription_text: Optional[str] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
