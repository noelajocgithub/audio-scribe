import React, { useRef, useEffect, useState } from 'react'
import { CopyIcon, SaveIcon, DownloadIcon, ArchiveIcon } from './icons'

interface StreamingOutputProps {
  text: string
  isStreaming: boolean
  status: 'idle' | 'streaming' | 'completed' | 'error'
  errorMessage?: string | null
  onCopy: () => void
  onSave: () => void
  onDownloadTxt: () => void
  onDownloadPdf: () => void
  isSaved?: boolean
  documentTitle?: string | null
  viewingTitle?: string | null
}

export const StreamingOutput: React.FC<StreamingOutputProps> = ({
  text, isStreaming, status, errorMessage, onCopy, onSave, onDownloadTxt, onDownloadPdf, isSaved, viewingTitle,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (containerRef.current && isStreaming) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [text, isStreaming])

  const handleCopy = () => {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (status === 'idle' && !text) {
    return (
      <div className="glass flex min-h-[200px] items-center justify-center rounded-2xl p-6">
        <p className="text-sm text-slate-500">AI output will appear here...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {viewingTitle && (
        <div className="flex items-center gap-2 rounded-xl bg-violet-500/10 border border-violet-500/20 px-4 py-2 text-sm text-violet-300">
          <ArchiveIcon size={14} />
          <span>Viewing saved — <strong>{viewingTitle}</strong></span>
        </div>
      )}

      {isStreaming && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
              Generating document...
            </span>
            <span>{text.length.toLocaleString()} chars</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div className="h-full animate-progress-indeterminate rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500" />
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="glass min-h-[200px] max-h-[500px] overflow-y-auto rounded-2xl p-5"
      >
        {status === 'error' && (
          <p className="text-sm text-rose-400">{errorMessage || 'Generation failed.'}</p>
        )}
        {text && (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
            {text}
            {isStreaming && (
              <span className="inline-block h-4 w-0.5 animate-pulse bg-violet-400 ml-0.5" />
            )}
          </div>
        )}
      </div>

      {status === 'completed' && text && (
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost text-sm" onClick={handleCopy}>
            <CopyIcon size={14} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button className="btn-ghost text-sm" onClick={onDownloadTxt}>
            <DownloadIcon size={14} />
            TXT
          </button>
          <button className="btn-ghost text-sm" onClick={onDownloadPdf}>
            <DownloadIcon size={14} />
            PDF
          </button>
          {isSaved ? (
            <span className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-400">
              <SaveIcon size={14} />
              Saved
            </span>
          ) : (
            <button className="btn-grad text-sm" onClick={onSave}>
              <SaveIcon size={14} />
              Save Document
            </button>
          )}
        </div>
      )}
    </div>
  )
}
