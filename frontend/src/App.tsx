import React, { useState, useEffect, useRef } from 'react'
import { useStore } from './store'
import { useAuth } from './store/auth'
import { apiService } from './services/api'
import { Sidebar, Page } from './components/Sidebar'
import { RecordAudioPage } from './pages/RecordAudioPage'
import { TranscribeAudioPage } from './pages/TranscribeAudioPage'
import { SavedTranscriptionsPage } from './pages/SavedTranscriptionsPage'
import { AIGeneratePage } from './pages/AIGeneratePage'
import { AdminPromptsPage } from './pages/AdminPromptsPage'
import { LoginPage } from './pages/LoginPage'
import { Toast } from './components/Toast'
import { SparkleIcon } from './components/icons'

function App() {
  const [page, setPage] = useState<Page>('record')
  const [booting, setBooting] = useState(true)
  const files = useStore((state) => state.files)
  const setFiles = useStore((state) => state.setFiles)
  const addToast = useStore((state) => state.addToast)
  const loadSession = useAuth((state) => state.loadSession)
  const user = useAuth((state) => state.user)
  const errorShown = useRef(false)

  // Restore an existing session (if a token is stored) on first load.
  useEffect(() => {
    loadSession().finally(() => setBooting(false))
  }, [loadSession])

  // Centralized polling: faster while anything is processing so progress bars stay live.
  // Only runs once authenticated.
  const anyProcessing = files.some((f) => f.transcription?.status === 'Processing')
  useEffect(() => {
    if (!user) return
    let cancelled = false
    const fetchFiles = async () => {
      try {
        const next = await apiService.getFiles()
        if (!cancelled) {
          setFiles(next)
          errorShown.current = false
        }
      } catch (error) {
        if (!cancelled && !errorShown.current) {
          errorShown.current = true
          addToast({ type: 'error', message: 'Failed to load files' })
        }
        console.error('Failed to fetch files:', error)
      }
    }

    fetchFiles()
    const interval = setInterval(fetchFiles, anyProcessing ? 1500 : 4000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [setFiles, addToast, anyProcessing, user])

  // Boot splash while we validate any stored session.
  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-300">
          <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-white shadow-glow">
            <SparkleIcon size={26} />
          </div>
          <span className="text-sm">Loading studio…</span>
        </div>
      </div>
    )
  }

  // Login landing page when unauthenticated.
  if (!user) {
    return (
      <>
        <LoginPage />
        <Toast />
      </>
    )
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden">
      {/* Floating ambient blobs for depth. */}
      <div className="pointer-events-none fixed -left-32 top-10 h-96 w-96 animate-float rounded-full bg-violet-600/20 blur-3xl" />
      <div className="pointer-events-none fixed right-0 top-1/3 h-[28rem] w-[28rem] animate-float-slow rounded-full bg-fuchsia-600/15 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 left-1/3 h-80 w-80 animate-float rounded-full bg-cyan-500/10 blur-3xl" />

      <Sidebar
        current={page}
        onNavigate={setPage}
        counts={{ transcribe: files.length, saved: files.length }}
      />

      <main className="relative z-10 flex-1 overflow-y-auto px-4 py-6 pb-24 md:px-6 md:py-8 md:pb-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          {page === 'record' && <RecordAudioPage onNavigate={setPage} />}
          {page === 'transcribe' && <TranscribeAudioPage onNavigate={setPage} />}
          {page === 'saved' && <SavedTranscriptionsPage onNavigate={setPage} />}
          {page === 'generate' && <AIGeneratePage />}
          {page === 'admin-prompts' && <AdminPromptsPage />}
        </div>
      </main>

      <Toast />
    </div>
  )
}

export default App
