import React, { useState, useEffect, useRef } from 'react'
import { useStore } from './store'
import { apiService } from './services/api'
import { Sidebar, Page } from './components/Sidebar'
import { RecordAudioPage } from './pages/RecordAudioPage'
import { TranscribeAudioPage } from './pages/TranscribeAudioPage'
import { SavedTranscriptionsPage } from './pages/SavedTranscriptionsPage'
import { Toast } from './components/Toast'

function App() {
  const [page, setPage] = useState<Page>('record')
  const files = useStore((state) => state.files)
  const setFiles = useStore((state) => state.setFiles)
  const addToast = useStore((state) => state.addToast)
  const errorShown = useRef(false)

  // Centralized polling: faster while anything is processing so progress bars stay live.
  const anyProcessing = files.some((f) => f.transcription?.status === 'Processing')
  useEffect(() => {
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
  }, [setFiles, addToast, anyProcessing])

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

      <main className="relative z-10 flex-1 overflow-y-auto px-6 py-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          {page === 'record' && <RecordAudioPage onNavigate={setPage} />}
          {page === 'transcribe' && <TranscribeAudioPage onNavigate={setPage} />}
          {page === 'saved' && <SavedTranscriptionsPage onNavigate={setPage} />}
        </div>
      </main>

      <Toast />
    </div>
  )
}

export default App
