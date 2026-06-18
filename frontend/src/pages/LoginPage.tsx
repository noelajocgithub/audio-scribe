import React, { useState } from 'react'
import { useAuth } from '../store/auth'
import { apiService } from '../services/api'
import { SparkleIcon, MicIcon, WaveIcon, ArchiveIcon } from '../components/icons'

type Mode = 'login' | 'register'

export const LoginPage: React.FC = () => {
  const login = useAuth((s) => s.login)
  const [mode, setMode] = useState<Mode>('login')

  const [identifier, setIdentifier] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(identifier, password)
        // On success, App re-renders into the authenticated experience.
      } else {
        const res = await apiService.register(email, username, password)
        setNotice(res.message || 'Registration received. Await approval.')
        setMode('login')
        setIdentifier(username || email)
        setPassword('')
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || (mode === 'login' ? 'Login failed' : 'Registration failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      {/* Ambient depth */}
      <div className="pointer-events-none absolute -left-40 top-0 h-[32rem] w-[32rem] animate-float rounded-full bg-violet-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-[34rem] w-[34rem] animate-float-slow rounded-full bg-fuchsia-600/20 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 animate-float rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative z-10 grid w-full max-w-4xl overflow-hidden rounded-2xl md:rounded-3xl border border-white/10 shadow-lift md:grid-cols-2">
        {/* Brand / hero panel */}
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-violet-600/30 via-fuchsia-600/20 to-cyan-500/20 p-10 backdrop-blur-xl md:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-white shadow-glow">
              <SparkleIcon size={24} />
            </div>
            <div className="font-display text-xl font-bold text-white">Audio Scribe</div>
          </div>

          <div className="space-y-5">
            <h2 className="font-display text-3xl font-bold leading-tight text-white">
              Your private transcription studio.
            </h2>
            <ul className="space-y-3 text-sm text-slate-200/90">
              <li className="flex items-center gap-3"><MicIcon size={18} /> Record or upload audio</li>
              <li className="flex items-center gap-3"><WaveIcon size={18} /> Transcribe with live progress</li>
              <li className="flex items-center gap-3"><ArchiveIcon size={18} /> Edit & keep a searchable library</li>
            </ul>
          </div>
        </div>

        {/* Form panel */}
        <div className="bg-ink-900/70 p-8 backdrop-blur-2xl sm:p-10">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold gradient-text">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {mode === 'login'
                ? 'Sign in to continue to your studio.'
                : 'New accounts require approval by a manager or admin.'}
            </p>
          </div>

          {notice && (
            <div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {notice}
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {mode === 'login' ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Username or email</label>
                <input
                  className="input-glass"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoFocus
                  autoComplete="username"
                  placeholder="admin"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">Email</label>
                  <input
                    type="email"
                    className="input-glass"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">Username</label>
                  <input
                    className="input-glass"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    placeholder="your-handle"
                  />
                </div>
              </>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Password</label>
              <input
                type="password"
                className="input-glass"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
              />
            </div>

            <button type="submit" className="btn-grad w-full py-3" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            {mode === 'login' ? (
              <>
                No account?{' '}
                <button className="font-semibold text-violet-300 hover:text-violet-200" onClick={() => { setMode('register'); setError(null); setNotice(null) }}>
                  Request access
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button className="font-semibold text-violet-300 hover:text-violet-200" onClick={() => { setMode('login'); setError(null) }}>
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
