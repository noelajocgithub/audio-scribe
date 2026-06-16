import React, { useEffect } from 'react'
import { useStore } from '../store'
import { FileListItem } from '../components/FileListItem'
import { Workspace } from '../components/Workspace'
import { WaveIcon } from '../components/icons'
import { Page } from '../components/Sidebar'

export const TranscribeAudioPage: React.FC<{ onNavigate: (p: Page) => void }> = ({ onNavigate }) => {
  const files = useStore((s) => s.files)
  const selectedFileId = useStore((s) => s.selectedFileId)
  const setSelectedFileId = useStore((s) => s.setSelectedFileId)

  // Auto-select the first file when nothing is selected.
  useEffect(() => {
    if (selectedFileId === null && files.length > 0) {
      setSelectedFileId(files[0].id)
    }
  }, [files, selectedFileId, setSelectedFileId])

  const selected = files.find((f) => f.id === selectedFileId) || null

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-bold gradient-text">Transcribe Audio</h1>
        <p className="text-slate-400">Pick any recording or upload, run transcription, then edit and save.</p>
      </header>

      {files.length === 0 ? (
        <EmptyState onNavigate={onNavigate} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_1fr]">
          {/* File list */}
          <div className="glass flex max-h-[72vh] flex-col p-3">
            <div className="px-2 py-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
              All Audio · {files.length}
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto pr-1">
              {files.map((file) => (
                <FileListItem
                  key={file.id}
                  file={file}
                  active={file.id === selectedFileId}
                  onSelect={() => setSelectedFileId(file.id)}
                />
              ))}
            </div>
          </div>

          {/* Workspace */}
          <div className="glass min-h-[72vh] p-6">
            {selected ? (
              <Workspace key={selected.id} file={selected} />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-500">
                Select a file to begin
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const EmptyState: React.FC<{ onNavigate: (p: Page) => void }> = ({ onNavigate }) => (
  <div className="glass flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-violet-300">
      <WaveIcon size={30} />
    </div>
    <div>
      <div className="font-display text-lg font-semibold text-white">No audio yet</div>
      <div className="text-sm text-slate-400">Record or upload something to transcribe.</div>
    </div>
    <button className="btn-grad" onClick={() => onNavigate('record')}>Go to Record Audio</button>
  </div>
)
