import React from 'react'
import { MicIcon, WaveIcon, ArchiveIcon, SparkleIcon } from './icons'

export type Page = 'record' | 'transcribe' | 'saved'

interface SidebarProps {
  current: Page
  onNavigate: (page: Page) => void
  counts: { transcribe: number; saved: number }
}

const ITEMS: { id: Page; label: string; hint: string; Icon: React.FC<any> }[] = [
  { id: 'record', label: 'Record Audio', hint: 'Capture or upload', Icon: MicIcon },
  { id: 'transcribe', label: 'Transcribe Audio', hint: 'Run & edit', Icon: WaveIcon },
  { id: 'saved', label: 'Saved Transcriptions', hint: 'Library', Icon: ArchiveIcon },
]

export const Sidebar: React.FC<SidebarProps> = ({ current, onNavigate, counts }) => {
  return (
    <aside className="flex w-72 shrink-0 flex-col gap-2 p-5">
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-white shadow-glow">
          <SparkleIcon size={22} />
        </div>
        <div>
          <div className="font-display text-lg font-bold leading-tight gradient-text">
            Audio Scribe
          </div>
          <div className="text-xs text-slate-400">Transcription Studio</div>
        </div>
      </div>

      <nav className="flex flex-col gap-2">
        {ITEMS.map(({ id, label, hint, Icon }) => {
          const active = current === id
          const count = id === 'transcribe' ? counts.transcribe : id === 'saved' ? counts.saved : undefined
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`group relative flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
                active
                  ? 'border-white/20 bg-white/10 shadow-lift'
                  : 'border-transparent hover:border-white/10 hover:bg-white/5'
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-gradient-to-b from-violet-400 to-fuchsia-400" />
              )}
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                  active
                    ? 'bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 text-white shadow-glow'
                    : 'bg-white/5 text-slate-300 group-hover:text-white'
                }`}
              >
                <Icon size={20} />
              </span>
              <span className="flex-1">
                <span className={`block text-sm font-semibold ${active ? 'text-white' : 'text-slate-200'}`}>
                  {label}
                </span>
                <span className="block text-xs text-slate-400">{hint}</span>
              </span>
              {count !== undefined && count > 0 && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-slate-200">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto px-2 pt-6 text-[11px] leading-relaxed text-slate-500">
        Powered by mlx-whisper · runs locally on Apple Silicon
      </div>
    </aside>
  )
}
