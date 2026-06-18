import React, { useState } from 'react'
import { MicIcon, WaveIcon, ArchiveIcon, SparkleIcon, BrainIcon, SettingsIcon, XIcon, MenuIcon } from './icons'
import { useAuth } from '../store/auth'

export type Page = 'record' | 'transcribe' | 'saved' | 'generate' | 'admin-prompts'

interface SidebarProps {
  current: Page
  onNavigate: (page: Page) => void
  counts: { transcribe: number; saved: number }
}

const ITEMS: { id: Page; label: string; hint: string; Icon: React.FC<any> }[] = [
  { id: 'record', label: 'Record Audio', hint: 'Capture or upload', Icon: MicIcon },
  { id: 'transcribe', label: 'Transcribe Audio', hint: 'Run & edit', Icon: WaveIcon },
  { id: 'saved', label: 'Saved Transcriptions', hint: 'Library', Icon: ArchiveIcon },
  { id: 'generate', label: 'AI Generate', hint: 'Documents from text', Icon: BrainIcon },
]

const ADMIN_ITEMS: { id: Page; label: string; hint: string; Icon: React.FC<any> }[] = [
  { id: 'admin-prompts', label: 'Prompt Admin', hint: 'Manage templates', Icon: SettingsIcon },
]

const ROLE_LABEL: Record<string, string> = { admin: 'Administrator', manager: 'Manager', user: 'User' }

export const Sidebar: React.FC<SidebarProps> = ({ current, onNavigate, counts }) => {
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  const [mobileOpen, setMobileOpen] = useState(false)

  const navigate = (page: Page) => {
    onNavigate(page)
    setMobileOpen(false)
  }

  return (
    <>
      {/* Mobile bottom navigation bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-white/10 bg-[#0a0a1f]/95 backdrop-blur-xl safe-bottom md:hidden">
        {ITEMS.map(({ id, Icon, label }) => {
          const active = current === id
          const count = id === 'transcribe' ? counts.transcribe : id === 'saved' ? counts.saved : undefined
          return (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={`relative flex flex-col items-center gap-1 px-4 py-3 transition ${
                active ? 'text-violet-300' : 'text-slate-400'
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400" />
              )}
              <span className="relative">
                <Icon size={22} />
                {count !== undefined && count > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium">{label.split(' ')[0]}</span>
            </button>
          )
        })}
        <button
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center gap-1 px-4 py-3 text-slate-400 transition hover:text-white"
        >
          <MenuIcon size={22} />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>

      {/* Mobile slide-out drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col gap-2 overflow-y-auto bg-[#0c0c24] p-5 shadow-2xl animate-slide-in">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-white shadow-glow">
                  <SparkleIcon size={20} />
                </div>
                <div>
                  <div className="font-display text-base font-bold leading-tight gradient-text">Audio Scribe</div>
                  <div className="text-xs text-slate-400">Transcription Studio</div>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <XIcon size={20} />
              </button>
            </div>

            <nav className="flex flex-col gap-2">
              {ITEMS.map(({ id, label, hint, Icon }) => {
                const active = current === id
                const count = id === 'transcribe' ? counts.transcribe : id === 'saved' ? counts.saved : undefined
                return (
                  <button
                    key={id}
                    onClick={() => navigate(id)}
                    className={`group relative flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all duration-200 ${
                      active
                        ? 'border-white/20 bg-white/10 shadow-lift'
                        : 'border-transparent hover:border-white/10 hover:bg-white/5'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-gradient-to-b from-violet-400 to-fuchsia-400" />
                    )}
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                      active
                        ? 'bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 text-white shadow-glow'
                        : 'bg-white/5 text-slate-300 group-hover:text-white'
                    }`}>
                      <Icon size={20} />
                    </span>
                    <span className="flex-1">
                      <span className={`block text-sm font-semibold ${active ? 'text-white' : 'text-slate-200'}`}>{label}</span>
                      <span className="block text-xs text-slate-400">{hint}</span>
                    </span>
                    {count !== undefined && count > 0 && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-slate-200">{count}</span>
                    )}
                  </button>
                )
              })}

              {user?.role === 'admin' && (
                <>
                  <div className="my-2 border-t border-white/10" />
                  {ADMIN_ITEMS.map(({ id, label, hint, Icon }) => {
                    const active = current === id
                    return (
                      <button
                        key={id}
                        onClick={() => navigate(id)}
                        className={`group relative flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all duration-200 ${
                          active
                            ? 'border-white/20 bg-white/10 shadow-lift'
                            : 'border-transparent hover:border-white/10 hover:bg-white/5'
                        }`}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-gradient-to-b from-violet-400 to-fuchsia-400" />
                        )}
                        <span className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                          active
                            ? 'bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 text-white shadow-glow'
                            : 'bg-white/5 text-slate-300 group-hover:text-white'
                        }`}>
                          <Icon size={20} />
                        </span>
                        <span className="flex-1">
                          <span className={`block text-sm font-semibold ${active ? 'text-white' : 'text-slate-200'}`}>{label}</span>
                          <span className="block text-xs text-slate-400">{hint}</span>
                        </span>
                      </button>
                    )
                  })}
                </>
              )}
            </nav>

            {user && (
              <div className="mt-auto glass-soft flex items-center gap-3 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold uppercase text-white">
                  {user.username.slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-100">{user.username}</div>
                  <div className="text-xs text-violet-300">{ROLE_LABEL[user.role] || user.role}</div>
                </div>
                <button
                  onClick={logout}
                  title="Sign out"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                  <XIcon size={18} />
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden md:flex h-screen sticky top-0 w-72 shrink-0 flex-col gap-2 p-5">
        <div className="mb-6 flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-white shadow-glow">
            <SparkleIcon size={22} />
          </div>
          <div>
            <div className="font-display text-lg font-bold leading-tight gradient-text">Audio Scribe</div>
            <div className="text-xs text-slate-400">Transcription Studio</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto">
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
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                  active
                    ? 'bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 text-white shadow-glow'
                    : 'bg-white/5 text-slate-300 group-hover:text-white'
                }`}>
                  <Icon size={20} />
                </span>
                <span className="flex-1">
                  <span className={`block text-sm font-semibold ${active ? 'text-white' : 'text-slate-200'}`}>{label}</span>
                  <span className="block text-xs text-slate-400">{hint}</span>
                </span>
                {count !== undefined && count > 0 && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-slate-200">{count}</span>
                )}
              </button>
            )
          })}

          {user?.role === 'admin' && (
            <>
              <div className="my-2 border-t border-white/10" />
              {ADMIN_ITEMS.map(({ id, label, hint, Icon }) => {
                const active = current === id
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
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                      active
                        ? 'bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 text-white shadow-glow'
                        : 'bg-white/5 text-slate-300 group-hover:text-white'
                    }`}>
                      <Icon size={20} />
                    </span>
                    <span className="flex-1">
                      <span className={`block text-sm font-semibold ${active ? 'text-white' : 'text-slate-200'}`}>{label}</span>
                      <span className="block text-xs text-slate-400">{hint}</span>
                    </span>
                  </button>
                )
              })}
            </>
          )}
        </nav>

        {user && (
          <div className="mt-2 shrink-0 glass-soft flex items-center gap-3 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold uppercase text-white">
              {user.username.slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-100">{user.username}</div>
              <div className="text-xs text-violet-300">{ROLE_LABEL[user.role] || user.role}</div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <XIcon size={18} />
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
