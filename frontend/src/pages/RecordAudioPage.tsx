import React, { useRef, useState } from 'react'
import { useStore } from '../store'
import { apiService } from '../services/api'
import { VoiceRecorder } from '../components/VoiceRecorder'
import { ProgressBar } from '../components/ProgressBar'
import { UploadIcon, WaveIcon, SaveIcon, XIcon, StopIcon, CheckIcon } from '../components/icons'
import { formatBytes } from '../lib/format'
import { Page } from '../components/Sidebar'

export const RecordAudioPage: React.FC<{ onNavigate: (p: Page) => void }> = ({ onNavigate }) => {
  const addFile = useStore((s) => s.addFile)
  const addToast = useStore((s) => s.addToast)
  const setSelectedFileId = useStore((s) => s.setSelectedFileId)
  const files = useStore((s) => s.files)

  const [pending, setPending] = useState<{ file: File; url: string } | null>(null)
  const [busy, setBusy] = useState(false)
  // Id of the file we kicked off transcription for, so we can show live progress
  // here instead of navigating away. The central poll in App keeps it fresh.
  const [transcribingId, setTranscribingId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const transcribingFile = transcribingId != null ? files.find((f) => f.id === transcribingId) : null
  const tr = transcribingFile?.transcription
  const status = tr?.status ?? 'Processing'
  const progress = tr?.progress ?? 0
  const isProcessing = status === 'Processing' || status === 'Pending'

  const setCapture = (file: File) => {
    if (pending) URL.revokeObjectURL(pending.url)
    setPending({ file, url: URL.createObjectURL(file) })
  }

  const discard = () => {
    if (pending) URL.revokeObjectURL(pending.url)
    setPending(null)
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files?.[0]) setCapture(e.dataTransfer.files[0])
  }

  const save = async (thenTranscribe: boolean) => {
    if (!pending) return
    setBusy(true)
    try {
      const { audio_id } = await apiService.uploadFile(pending.file)
      const audioFile = await apiService.getFile(audio_id)

      if (thenTranscribe) {
        await apiService.transcribeFile(audio_id)
      }

      addFile({
        ...audioFile,
        transcription: {
          id: 0,
          audio_file_id: audio_id,
          status: thenTranscribe ? 'Processing' : 'Pending',
          progress: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      })

      addToast({
        type: 'success',
        message: thenTranscribe ? 'Saved — transcription started' : 'Recording saved',
      })

      discard()
      // Stay on this page and surface a live progress bar; the user can jump to
      // the editor or start another recording from the progress card.
      if (thenTranscribe) setTranscribingId(audio_id)
    } catch {
      addToast({ type: 'error', message: 'Could not save the audio' })
    } finally {
      setBusy(false)
    }
  }

  const stopTranscription = async () => {
    if (transcribingId == null) return
    try {
      await apiService.cancelTranscription(transcribingId)
      addToast({ type: 'info', message: 'Stopping transcription…' })
    } catch {
      addToast({ type: 'error', message: 'Failed to stop transcription' })
    }
  }

  const openInEditor = () => {
    if (transcribingId == null) return
    setSelectedFileId(transcribingId)
    onNavigate('transcribe')
  }

  const recordAnother = () => setTranscribingId(null)

  const progressLabel =
    status === 'Completed'
      ? 'Transcription complete'
      : status === 'Failed'
      ? 'Transcription failed'
      : status === 'Cancelled'
      ? 'Transcription stopped'
      : 'Transcribing'

  return (
    <div className="mx-auto max-w-3xl space-y-5 md:space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl md:text-3xl font-bold gradient-text">Record Audio</h1>
        <p className="text-sm md:text-base text-slate-400">Capture from your mic or drop in a file, then store it or transcribe it right away.</p>
      </header>

      {transcribingId != null ? (
        <section className="glass animate-rise-in space-y-5 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-white">
              {isProcessing ? 'Transcribing…' : progressLabel}
            </h2>
            {!isProcessing && (
              <button className="btn-ghost px-3" onClick={recordAnother} title="Dismiss">
                <XIcon size={18} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
            <span className="truncate font-medium text-slate-100">
              {transcribingFile?.title || transcribingFile?.original_filename || 'Audio file'}
            </span>
          </div>

          <ProgressBar value={progress} label={progressLabel} />

          {status === 'Failed' && tr?.error_message && (
            <p className="text-sm text-rose-300">{tr.error_message}</p>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            {isProcessing ? (
              <>
                <button className="btn-ghost flex-1" onClick={stopTranscription}>
                  <StopIcon size={16} /> Stop
                </button>
                <button className="btn-ghost flex-1" onClick={openInEditor}>
                  <WaveIcon size={16} /> Open in editor
                </button>
              </>
            ) : (
              <>
                {status === 'Completed' && (
                  <button className="btn-grad flex-1" onClick={openInEditor}>
                    <CheckIcon size={16} /> View transcription
                  </button>
                )}
                <button className="btn-ghost flex-1" onClick={recordAnother}>
                  <UploadIcon size={16} /> Record another
                </button>
              </>
            )}
          </div>
        </section>
      ) : !pending ? (
        <>
          <section className="glass relative overflow-hidden p-5 md:p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
            <VoiceRecorder onRecordingComplete={setCapture} />
          </section>

          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-slate-500">
            <div className="h-px flex-1 bg-white/10" /> or upload a file <div className="h-px flex-1 bg-white/10" />
          </div>

          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="glass-soft group cursor-pointer border-dashed border-white/20 p-6 md:p-10 text-center transition hover:border-violet-400/50 hover:bg-white/[0.06]"
          >
            <div className="mx-auto mb-3 flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-white/5 text-violet-300 transition group-hover:scale-110">
              <UploadIcon size={24} />
            </div>
            <div className="text-sm md:text-base font-semibold text-slate-100">Drag &amp; drop audio, or click to browse</div>
            <div className="mt-1 text-xs md:text-sm text-slate-400">MP3, WAV, M4A, OGG, AAC, WEBM · up to 500MB</div>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && setCapture(e.target.files[0])}
            />
          </div>
        </>
      ) : (
        <section className="glass animate-rise-in space-y-5 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-white">Ready to save</h2>
            <button className="btn-ghost px-3" onClick={discard} disabled={busy} title="Discard">
              <XIcon size={18} />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
            <span className="truncate font-medium text-slate-100">{pending.file.name}</span>
            <span className="text-slate-400">{formatBytes(pending.file.size)}</span>
          </div>

          <audio src={pending.url} controls className="w-full" />

          <div className="flex flex-wrap gap-3 pt-1">
            <button className="btn-grad flex-1" onClick={() => save(true)} disabled={busy}>
              <WaveIcon size={16} /> {busy ? 'Working…' : 'Save & Transcribe'}
            </button>
            <button className="btn-ghost flex-1" onClick={() => save(false)} disabled={busy}>
              <SaveIcon size={16} /> Save only
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
