// Frontend types

export type Role = 'admin' | 'manager' | 'user'
export type UserStatus = 'pending' | 'active' | 'disabled'

export interface AuthUser {
  id: number
  email: string
  username: string
  role: Role
  status: UserStatus
  approved_by?: number | null
  approved_at?: string | null
  created_at: string
  updated_at: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: AuthUser
}

export interface AudioFile {
  id: number
  original_filename: string
  title?: string
  file_format: string
  duration_seconds?: number
  file_size_bytes?: number
  upload_timestamp: string
  storage_key: string
}

export interface Transcription {
  id: number
  audio_file_id: number
  status: string
  progress?: number
  transcription_text?: string
  error_message?: string
  started_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface FileWithTranscription extends AudioFile {
  transcription?: Transcription
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
  duration?: number
}

export interface UploadResponse {
  audio_id: number
  message: string
}

export interface TranscribeResponse {
  job_id: string
  audio_id: number
  status: string
  message: string
}

export interface StatusResponse {
  audio_id: number
  status: string
  progress?: number
  transcription_text?: string
  error_message?: string
  started_at?: string
  completed_at?: string
}

export interface Store {
  files: FileWithTranscription[]
  selectedFileId: number | null
  loading: boolean
  error: string | null
  toasts: Toast[]
  setFiles: (files: FileWithTranscription[]) => void
  addFile: (file: FileWithTranscription) => void
  updateFile: (file: FileWithTranscription) => void
  removeFile: (id: number) => void
  setSelectedFileId: (id: number | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}
