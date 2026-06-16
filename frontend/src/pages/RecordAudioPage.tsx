import React, { useRef, useState } from 'react'
import { useStore } from '../store'
import { apiService } from '../services/api'
import { VoiceRecorder } from '../components/VoiceRecorder'
import { UploadIcon, WaveIcon, SaveIcon, XIcon } from '../components/icons'
import { formatBytes } from '../lib/format'
import { Page } from '../components/Sidebar'

export const RecordAudioPage: React.FC<{ onNavigate: (p: Page) => void }> = ({ onNavigate }) => {
  const addFile = useStore((s) => s.addFile)
  const addToast = useStore((s) => s.addToast)
  const setSelectedFileId = useStore((s) => s.setSelectedFileId)

  const [pending, setPending] = useState<{ file: File; url: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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
      if (thenTranscribe) {
        setSelectedFileId(audio_id)
        onNavigate('transcribe')
      }
    } catch {
      addToast({ type: 'error', message: 'Could not save the audio' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-bold gradient-text">Record Audio</h1>
        <p className="text-slate-400">Capture from your mic or drop in a file, then store it or transcribe it right away.</p>
      </header>

      {!pending ? (
        <>
          <section className="glass relative overflow-hidden p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
            <VoiceRecorder onRecordingComplete={setCapture} />
          </section>

          <div className="flex items-center gap-4 text-xs uppercase tracking-widest text-slate-500">
            <div className="h-px flex-1 bg-white/10" /> or upload a file <div className="h-px flex-1 bg-white/10" />
          </div>

          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="glass-soft group cursor-pointer border-dashed border-white/20 p-10 text-center transition hover:border-violet-400/50 hover:bg-white/[0.06]"
          >
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-violet-300 transition group-hover:scale-110">
              <UploadIcon size={26} />
            </div>
            <div className="font-semibold text-slate-100">Drag &amp; drop audio, or click to browse</div>
            <div className="mt-1 text-sm text-slate-400">MP3, WAV, M4A, OGG, AAC, WEBM · up to 500MB</div>
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
