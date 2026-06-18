import React, { useEffect, useState } from 'react'
import { FileWithTranscription } from '../types'
import { apiService } from '../services/api'
import { useFileActions } from '../lib/useFileActions'
import { AudioPlayer } from './AudioPlayer'
import { ProgressBar } from './ProgressBar'
import { StatusBadge } from './StatusBadge'
import { RenameDialog, ConfirmDialog } from './Modal'
import {
  WaveIcon, RefreshIcon, StopIcon, SaveIcon, DownloadIcon, EditIcon, TrashIcon,
} from './icons'
import { displayName, formatBytes, formatDuration, baseFilename } from '../lib/format'

export const Workspace: React.FC<{ file: FileWithTranscription }> = ({ file }) => {
  const { transcribe, cancel, rename, remove, saveText } = useFileActions()
  const [editingText, setEditingText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const status = file.transcription?.status || 'Pending'
  const progress = file.transcription?.progress ?? 0
  const text = file.transcription?.transcription_text || ''
  const hasText = text.trim().length > 0
  const isProcessing = status === 'Processing'

  // Refresh the editor when switching files or when new text arrives for this one.
  useEffect(() => {
    setEditingText(text)
  }, [file.id, text])

  const handleSave = async () => {
    setIsSaving(true)
    await saveText(file, editingText)
    setIsSaving(false)
  }

  const handleDownload = () => {
    const blob = new Blob([editingText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${baseFilename(file)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h2 className="font-display truncate text-lg md:text-2xl font-bold text-white">
              {displayName(file)}
            </h2>
            <StatusBadge status={status} />
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs md:text-sm text-slate-400">
            <span>{file.file_format?.toUpperCase()}</span>
            <span>{formatBytes(file.file_size_bytes)}</span>
            <span>{formatDuration(file.duration_seconds)}</span>
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5 md:gap-2">
          <button className="btn-ghost px-2.5 md:px-3" onClick={() => setRenaming(true)} title="Rename">
            <EditIcon size={18} />
          </button>
          <button className="btn-danger px-2.5 md:px-3" onClick={() => setConfirmDelete(true)} title="Delete">
            <TrashIcon size={18} />
          </button>
        </div>
      </div>

      {/* Playback */}
      <AudioPlayer src={apiService.getAudioUrl(file.id)} />

      {/* Transcription controls */}
      <div className="flex flex-wrap items-center gap-3">
        {isProcessing ? (
          <button className="btn-danger" onClick={() => cancel(file)}>
            <StopIcon size={16} /> Stop
          </button>
        ) : hasText || status === 'Completed' ? (
          <button className="btn-ghost" onClick={() => transcribe(file)}>
            <RefreshIcon size={16} /> Re-transcribe
          </button>
        ) : (
          <button className="btn-grad" onClick={() => transcribe(file)}>
            <WaveIcon size={16} /> Transcribe
          </button>
        )}

        {status === 'Failed' && file.transcription?.error_message && (
          <span className="text-sm text-rose-300">Error: {file.transcription.error_message}</span>
        )}
        {status === 'Cancelled' && (
          <span className="text-sm text-amber-300">Stopped — partial text kept below.</span>
        )}
      </div>

      {isProcessing && <ProgressBar value={progress} />}

      {/* Editor */}
      <div className="flex min-h-0 flex-1 flex-col">
        <label className="mb-2 text-sm font-semibold text-slate-300">Transcription</label>
        <textarea
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          disabled={isProcessing}
          placeholder={isProcessing ? 'Transcribing…' : 'Transcription text will appear here…'}
          className="input-glass min-h-[220px] flex-1 resize-none font-sans leading-relaxed disabled:opacity-60"
        />
        <div className="mt-3 flex gap-2">
          <button className="btn-grad" onClick={handleSave} disabled={isSaving || !editingText.trim()}>
            <SaveIcon size={16} /> {isSaving ? 'Saving…' : 'Save'}
          </button>
          <button className="btn-ghost" onClick={handleDownload} disabled={!editingText.trim()}>
            <DownloadIcon size={16} /> Download .txt
          </button>
        </div>
      </div>

      <RenameDialog
        open={renaming}
        initial={displayName(file)}
        onSave={(title) => rename(file, title)}
        onClose={() => setRenaming(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this item?"
        message={`"${displayName(file)}" and its transcription will be permanently removed, including the stored audio.`}
        onConfirm={() => remove(file)}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}
