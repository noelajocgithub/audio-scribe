import React from 'react'
import { FileWithTranscription } from '../types'
import { StatusBadge } from './StatusBadge'
import { displayName, formatDuration, formatDate } from '../lib/format'

interface Props {
  file: FileWithTranscription
  active: boolean
  onSelect: () => void
}

export const FileListItem: React.FC<Props> = ({ file, active, onSelect }) => {
  const status = file.transcription?.status || 'Pending'
  const progress = file.transcription?.progress ?? 0

  return (
    <button
      onClick={onSelect}
      className={`group relative w-full overflow-hidden rounded-2xl border p-3.5 text-left transition-all duration-200 ${
        active
          ? 'border-violet-400/40 bg-white/10 shadow-lift'
          : 'border-white/10 bg-white/[0.03] hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold text-slate-100">{displayName(file)}</span>
        <StatusBadge status={status} />
      </div>
      <div className="mt-1 flex gap-3 text-xs text-slate-400">
        <span>{formatDuration(file.duration_seconds)}</span>
        <span>{formatDate(file.upload_timestamp)}</span>
      </div>
      {status === 'Processing' && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </button>
  )
}
