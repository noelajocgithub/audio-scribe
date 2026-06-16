import axios, { AxiosInstance } from 'axios'
import { UploadResponse, TranscribeResponse, StatusResponse, FileWithTranscription, Transcription, AudioFile, AuthUser, LoginResponse } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

class ApiService {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000
    })

    // Attach the bearer token (if logged in) to every request.
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('audioscribe_token')
      if (token) config.headers.Authorization = `Bearer ${token}`
      return config
    })

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error)
        return Promise.reject(error)
      }
    )
  }

  // --- Auth ---
  async login(identifier: string, password: string): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/auth/login', { identifier, password })
    return response.data
  }

  async register(email: string, username: string, password: string): Promise<{ message: string }> {
    const response = await this.client.post('/auth/register', { email, username, password })
    return response.data
  }

  async getMe(): Promise<AuthUser> {
    const response = await this.client.get<AuthUser>('/auth/me')
    return response.data
  }

  async uploadFile(file: File): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await this.client.post<UploadResponse>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  }

  async getFiles(): Promise<FileWithTranscription[]> {
    const response = await this.client.get('/files')
    const rows: any[] = response.data.files || []

    // The backend returns transcription columns flattened onto each row (from a
    // LEFT JOIN). Re-nest them under `transcription` so the UI can read status/text.
    return rows.map((row) => {
      const { status, transcription_text, progress, error_message, completed_at, ...audioFile } = row
      const transcription = status
        ? ({ status, transcription_text, progress, error_message, completed_at } as Transcription)
        : undefined
      return { ...audioFile, transcription } as FileWithTranscription
    })
  }

  async getFile(audioId: number): Promise<FileWithTranscription> {
    const response = await this.client.get(`/files/${audioId}`)
    return response.data
  }

  /** Direct URL to stream stored audio for in-browser playback. */
  getAudioUrl(audioId: number): string {
    return `${API_URL}/files/${audioId}/audio`
  }

  async renameFile(audioId: number, title: string): Promise<AudioFile> {
    const response = await this.client.patch<AudioFile>(`/files/${audioId}`, { title })
    return response.data
  }

  async deleteFile(audioId: number): Promise<{ message: string }> {
    const response = await this.client.delete(`/files/${audioId}`)
    return response.data
  }

  async transcribeFile(audioId: number): Promise<TranscribeResponse> {
    const response = await this.client.post<TranscribeResponse>(`/transcribe/${audioId}`)
    return response.data
  }

  async getStatus(audioId: number): Promise<StatusResponse> {
    const response = await this.client.get<StatusResponse>(`/status/${audioId}`)
    return response.data
  }

  async cancelTranscription(audioId: number): Promise<{ message: string }> {
    const response = await this.client.post(`/transcribe/${audioId}/cancel`)
    return response.data
  }

  async saveTranscriptionText(audioId: number, text: string): Promise<{ message: string }> {
    const response = await this.client.post(`/files/${audioId}/text`, {
      transcription_text: text
    })
    return response.data
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health')
      return response.status === 200
    } catch {
      return false
    }
  }
}

export const apiService = new ApiService()
