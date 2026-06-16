"""Pydantic models for request/response validation"""

from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from typing import Optional, Literal

Role = Literal["admin", "manager", "user"]
UserStatus = Literal["pending", "active", "disabled"]


# --- Auth / RBAC models ------------------------------------------------------
class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    # Accepts either a username or an email address.
    identifier: str = Field(..., min_length=1, max_length=255)
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    username: str
    role: Role
    status: UserStatus
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class AdminCreateUserRequest(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=8, max_length=128)
    role: Role = "user"
    status: UserStatus = "active"


class RoleUpdateRequest(BaseModel):
    role: Role


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
