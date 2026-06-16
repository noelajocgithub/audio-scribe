import React, { useEffect, useState } from 'react'
import { useStore } from '../store'
import { Workspace } from '../components/Workspace'
import { StatusBadge } from '../components/StatusBadge'
import { ArchiveIcon, XIcon } from '../components/icons'
import { displayName, formatDate, formatDuration } from '../lib/format'
import { FileWithTranscription } from '../types'
import { Page } from '../components/Sidebar'

export const SavedTranscriptionsPage: React.FC<{ onNavigate: (p: Page) => void }> = ({ onNavigate }) => {
  const files = useStore((s) => s.files)
  const [openId, setOpenId] = useState<number | null>(null)

  const open = openId !== null ? files.find((f) => f.id === openId) || null : null

  // If the open item gets deleted, close the overlay.
  useEffect(() => {
    if (openId !== null && !files.some((f) => f.id === openId)) setOpenId(null)
  }, [files, openId])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenId(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-bold gradient-text">Saved Transcriptions</h1>
        <p className="text-slate-400">Your full library. Open any item to read or edit its transcription.</p>
      </header>

      {files.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-violet-300">
            <ArchiveIcon size={30} />
          </div>
          <div>
            <div className="font-display text-lg font-semibold text-white">Library is empty</div>
            <div className="text-sm text-slate-400">Recorded and uploaded audio will appear here.</div>
          </div>
          <button className="btn-grad" onClick={() => onNavigate('record')}>Add Audio</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {files.map((file) => (
            <SavedCard key={file.id} file={file} onOpen={() => setOpenId(file.id)} />
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpenId(null)} />
          <div className="glass animate-rise-in relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden p-6 shadow-lift">
            <button
              onClick={() => setOpenId(null)}
              className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <XIcon size={18} />
            </button>
            <div className="overflow-y-auto pr-1">
              <Workspace key={open.id} file={open} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const SavedCard: React.FC<{ file: FileWithTranscription; onOpen: () => void }> = ({ file, onOpen }) => {
  const status = file.transcription?.status || 'Pending'
  const text = file.transcription?.transcription_text?.trim()

  return (
    <button
      onClick={onOpen}
      className="glass group flex h-full flex-col p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-display truncate text-base font-semibold text-white">{displayName(file)}</h3>
        <StatusBadge status={status} />
      </div>
      <p className="mb-4 line-clamp-3 min-h-[3.75rem] text-sm leading-relaxed text-slate-400">
        {text || <span className="italic text-slate-500">No transcription yet</span>}
      </p>
      <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-3 text-xs text-slate-500">
        <span>{formatDate(file.upload_timestamp)}</span>
        <span>{formatDuration(file.duration_seconds)}</span>
      </div>
    </button>
  )
}
