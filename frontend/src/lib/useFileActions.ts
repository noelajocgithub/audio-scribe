import { useStore } from '../store'
import { apiService } from '../services/api'
import { FileWithTranscription, Transcription } from '../types'

/** Shared mutations for an audio file / transcription, with optimistic store updates + toasts. */
export function useFileActions() {
  const updateFile = useStore((s) => s.updateFile)
  const removeFile = useStore((s) => s.removeFile)
  const addToast = useStore((s) => s.addToast)

  const patchTranscription = (file: FileWithTranscription, patch: Partial<Transcription>) => {
    const base: Transcription =
      file.transcription ?? {
        id: 0,
        audio_file_id: file.id,
        status: 'Pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    updateFile({ ...file, transcription: { ...base, ...patch } })
  }

  const transcribe = async (file: FileWithTranscription) => {
    try {
      await apiService.transcribeFile(file.id)
      patchTranscription(file, { status: 'Processing', progress: 0, transcription_text: '' })
      addToast({ type: 'info', message: `Transcription started for ${file.title || file.original_filename}` })
    } catch {
      addToast({ type: 'error', message: 'Failed to start transcription' })
    }
  }

  const cancel = async (file: FileWithTranscription) => {
    try {
      await apiService.cancelTranscription(file.id)
      addToast({ type: 'info', message: 'Stopping transcription…' })
    } catch {
      addToast({ type: 'error', message: 'Failed to stop transcription' })
    }
  }

  const rename = async (file: FileWithTranscription, title: string) => {
    try {
      await apiService.renameFile(file.id, title)
      updateFile({ ...file, title })
      addToast({ type: 'success', message: 'Renamed' })
    } catch {
      addToast({ type: 'error', message: 'Failed to rename' })
    }
  }

  const remove = async (file: FileWithTranscription) => {
    try {
      await apiService.deleteFile(file.id)
      removeFile(file.id)
      addToast({ type: 'success', message: 'Deleted' })
    } catch {
      addToast({ type: 'error', message: 'Failed to delete' })
    }
  }

  const saveText = async (file: FileWithTranscription, text: string) => {
    try {
      await apiService.saveTranscriptionText(file.id, text)
      patchTranscription(file, { status: 'Completed', transcription_text: text })
      addToast({ type: 'success', message: 'Transcription saved' })
    } catch {
      addToast({ type: 'error', message: 'Failed to save transcription' })
    }
  }

  return { transcribe, cancel, rename, remove, saveText }
}
