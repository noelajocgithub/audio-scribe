import axios, { AxiosInstance } from 'axios'
import { UploadResponse, TranscribeResponse, StatusResponse, FileWithTranscription, Transcription, AudioFile, AuthUser, LoginResponse, PromptTemplate, PromptTemplateAdmin, AIGeneration, SavedDocument } from '../types'

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

  // --- AI Generation ---

  async getPrompts(): Promise<PromptTemplate[]> {
    const response = await this.client.get<PromptTemplate[]>('/v1/prompts/')
    return response.data
  }

  async getPromptsAdmin(): Promise<PromptTemplateAdmin[]> {
    const response = await this.client.get<PromptTemplateAdmin[]>('/v1/prompts/admin')
    return response.data
  }

  async createPrompt(data: { title: string; description?: string; template: string; category: string }): Promise<PromptTemplateAdmin> {
    const response = await this.client.post<PromptTemplateAdmin>('/v1/prompts/', data)
    return response.data
  }

  async updatePrompt(id: string, data: Partial<{ title: string; description: string; template: string; category: string; is_active: boolean }>): Promise<PromptTemplateAdmin> {
    const response = await this.client.put<PromptTemplateAdmin>(`/v1/prompts/${id}`, data)
    return response.data
  }

  async deletePrompt(id: string): Promise<void> {
    await this.client.delete(`/v1/prompts/${id}`)
  }

  async getGenerations(): Promise<AIGeneration[]> {
    const response = await this.client.get<AIGeneration[]>('/v1/generate/')
    return response.data
  }

  async getGeneration(id: string): Promise<AIGeneration> {
    const response = await this.client.get<AIGeneration>(`/v1/generate/${id}`)
    return response.data
  }

  async saveGeneration(id: string, document_title: string): Promise<void> {
    await this.client.patch(`/v1/generate/${id}/save`, { document_title })
  }

  async unsaveGeneration(id: string): Promise<void> {
    await this.client.patch(`/v1/generate/${id}/unsave`)
  }

  async getSavedDocuments(limit = 20, offset = 0): Promise<SavedDocument[]> {
    const response = await this.client.get<SavedDocument[]>(`/v1/generate/saved?limit=${limit}&offset=${offset}`)
    return response.data
  }

  async downloadPdf(generationId: string, title: string): Promise<void> {
    const token = localStorage.getItem('audioscribe_token')
    const res = await fetch(`${API_URL}/v1/generate/${generationId}/download/pdf`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
    if (!res.ok) throw new Error('PDF download failed')
    const blob = await res.blob()
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const date = new Date().toISOString().split('T')[0]
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug}_${date}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }
}

export const apiService = new ApiService()

export async function streamGenerate(
  payload: {
    transcription_id?: number
    prompt_template_id?: string
    custom_prompt?: string
    model: string
    transcription_override?: string
  },
  onToken: (token: string) => void,
  onDone: (generationId: string) => void,
  onError: (err: string) => void,
): Promise<void> {
  const token = localStorage.getItem('audioscribe_token')
  const response = await fetch(`${API_URL}/v1/generate/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Generation failed' }))
    onError(err.detail || `HTTP ${response.status}`)
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    onError('No response stream available')
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const jsonStr = line.slice(6).trim()
      if (!jsonStr) continue

      try {
        const data = JSON.parse(jsonStr)
        if (data.token) {
          onToken(data.token)
        } else if (data.done) {
          onDone(data.generation_id)
          return
        } else if (data.error) {
          onError(data.error)
          return
        }
      } catch {
        continue
      }
    }
  }
}
