import React, { useEffect, useState } from 'react'
import { useStore } from '../store'
import { useAIStore } from '../store/ai'
import { streamGenerate, apiService } from '../services/api'
import { ModelSelector } from '../components/ModelSelector'
import { StreamingOutput } from '../components/StreamingOutput'
import { BrainIcon, SparkleIcon, XIcon, CheckIcon } from '../components/icons'
import { displayName, formatDate, formatDuration } from '../lib/format'
import { FileWithTranscription } from '../types'

export const AIGeneratePage: React.FC = () => {
  const files = useStore((s) => s.files)
  const addToast = useStore((s) => s.addToast)

  const {
    mode, setMode,
    prompts, selectedPromptId, setSelectedPromptId,
    customPrompt, setCustomPrompt,
    selectedModel, setSelectedModel,
    streamingOutput, generationStatus, errorMessage,
    appendChunk, startGeneration, completeGeneration, failGeneration, resetGeneration,
    fetchPrompts, currentGenerationId,
    savedDocuments, showSaveModal, setShowSaveModal,
    fetchSavedDocuments, viewingDocument, loadSavedDocument, clearViewingDocument,
  } = useAIStore()

  const [selectedFileId, setSelectedFileId] = useState<number | null>(null)
  const [saveTitle, setSaveTitle] = useState('')

  const completedFiles = files.filter(
    (f) => f.transcription?.status === 'Completed' && f.transcription?.transcription_text
  )

  const selectedFile: FileWithTranscription | undefined = completedFiles.find((f) => f.id === selectedFileId)

  useEffect(() => {
    fetchPrompts()
  }, [fetchPrompts])

  useEffect(() => {
    fetchSavedDocuments()
  }, [fetchSavedDocuments])

  useEffect(() => {
    if (!selectedFileId && completedFiles.length > 0) {
      setSelectedFileId(completedFiles[0].id)
    }
  }, [completedFiles, selectedFileId])

  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId)
  const isGenerating = generationStatus === 'streaming'

  const canGenerate =
    !isGenerating &&
    selectedFile?.transcription?.transcription_text &&
    (mode === 'library' ? !!selectedPromptId : customPrompt.trim().length > 0)

  const handleGenerate = async () => {
    if (!canGenerate || !selectedFile) return

    clearViewingDocument()
    startGeneration()
    try {
      await streamGenerate(
        {
          transcription_id: selectedFile.id,
          prompt_template_id: mode === 'library' ? selectedPromptId! : undefined,
          custom_prompt: mode === 'custom' ? customPrompt : undefined,
          model: selectedModel,
          transcription_override: selectedFile.transcription?.transcription_text || undefined,
        },
        (token) => appendChunk(token),
        (generationId) => {
          completeGeneration(generationId)
          addToast({ type: 'success', message: 'Document generated successfully' })
        },
        (err) => {
          failGeneration(err)
          addToast({ type: 'error', message: err })
        },
      )
    } catch (e: any) {
      failGeneration(e.message || 'Unexpected error')
      addToast({ type: 'error', message: 'Generation failed unexpectedly' })
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(streamingOutput)
    addToast({ type: 'success', message: 'Copied to clipboard' })
  }

  const handleSave = () => {
    if (!currentGenerationId) return
    const defaultTitle = mode === 'library' && selectedPrompt
      ? `${selectedPrompt.title} — ${new Date().toLocaleDateString()}`
      : `Custom — ${new Date().toLocaleDateString()}`
    setSaveTitle(defaultTitle)
    setShowSaveModal(true)
  }

  const handleConfirmSave = async () => {
    if (!currentGenerationId || !saveTitle.trim()) return
    try {
      await apiService.saveGeneration(currentGenerationId, saveTitle.trim())
      addToast({ type: 'success', message: 'Document saved' })
      setShowSaveModal(false)
      fetchSavedDocuments()
    } catch {
      addToast({ type: 'error', message: 'Failed to save document' })
    }
  }

  const handleDownloadTxt = () => {
    const title = viewingDocument?.document_title || 'ai-document'
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const date = new Date().toISOString().split('T')[0]
    const blob = new Blob([streamingOutput], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug}_${date}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadPdf = async () => {
    if (!currentGenerationId) return
    try {
      const title = viewingDocument?.document_title || 'AI Document'
      await apiService.downloadPdf(currentGenerationId, title)
    } catch {
      addToast({ type: 'error', message: 'PDF download failed' })
    }
  }

  const handleLoadSaved = async (id: string) => {
    await loadSavedDocument(id)
  }

  const handleUnsave = async (id: string) => {
    try {
      await apiService.unsaveGeneration(id)
      addToast({ type: 'success', message: 'Document removed from saved' })
      fetchSavedDocuments()
    } catch {
      addToast({ type: 'error', message: 'Failed to unsave document' })
    }
  }

  if (completedFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
          <BrainIcon size={32} className="text-slate-500" />
        </div>
        <h2 className="font-display text-xl font-bold text-white">No Transcriptions Available</h2>
        <p className="max-w-md text-sm text-slate-400">
          Complete a transcription first, then return here to generate AI-powered documents from it.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 shadow-glow">
          <BrainIcon size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-white">AI Document Generator</h1>
          <p className="text-xs text-slate-400">Generate structured documents from transcriptions</p>
        </div>
      </div>

      {/* Saved documents */}
      {savedDocuments.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Saved Documents</h3>
          <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">
            {savedDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 transition cursor-pointer ${
                  viewingDocument?.id === doc.id
                    ? 'border-violet-500/30 bg-violet-500/10'
                    : 'border-white/5 bg-white/5 hover:border-white/10'
                }`}
                onClick={() => handleLoadSaved(doc.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-200">{doc.document_title || 'Untitled'}</div>
                  <div className="text-xs text-slate-500">
                    {doc.ollama_model} · {doc.saved_at ? new Date(doc.saved_at).toLocaleDateString() : ''}
                  </div>
                </div>
                <button
                  className="ml-2 shrink-0 rounded-lg p-1.5 text-slate-500 hover:text-rose-400 hover:bg-white/5 transition"
                  onClick={(e) => { e.stopPropagation(); handleUnsave(doc.id) }}
                  title="Remove from saved"
                >
                  <XIcon size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transcription selector */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Source Transcription</label>
        <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
          {completedFiles.map((f) => {
            const isSelected = f.id === selectedFileId
            const preview = f.transcription?.transcription_text?.trim()
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  if (!isGenerating) {
                    setSelectedFileId(f.id)
                    resetGeneration()
                  }
                }}
                disabled={isGenerating}
                className={`group relative flex flex-col gap-1 rounded-xl border px-4 py-3 text-left transition-all ${
                  isSelected
                    ? 'border-violet-400/60 bg-violet-500/20 shadow-[0_0_20px_rgba(139,92,246,0.25)] ring-1 ring-violet-400/30'
                    : 'border-white/5 bg-white/5 hover:border-white/15 hover:bg-white/[0.07]'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`truncate text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                    {displayName(f)}
                  </span>
                  {isSelected && (
                    <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/50">
                      <CheckIcon size={12} className="text-white" />
                    </span>
                  )}
                </div>
                {preview && (
                  <p className={`line-clamp-2 text-xs leading-relaxed ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    {preview}
                  </p>
                )}
                <div className={`flex items-center gap-3 text-[11px] ${isSelected ? 'text-violet-300/70' : 'text-slate-600'}`}>
                  <span>{formatDate(f.upload_timestamp)}</span>
                  {f.duration_seconds && <span>{formatDuration(f.duration_seconds)}</span>}
                  <span className="uppercase">{f.file_format}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setMode('library')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              mode === 'library'
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                : 'bg-white/5 text-slate-400 border border-transparent hover:border-white/10'
            }`}
            disabled={isGenerating}
          >
            Prompt Library
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              mode === 'custom'
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                : 'bg-white/5 text-slate-400 border border-transparent hover:border-white/10'
            }`}
            disabled={isGenerating}
          >
            Custom Prompt
          </button>
        </div>

        {/* Mode content */}
        {mode === 'library' ? (
          <div className="flex flex-col gap-2">
            <select
              value={selectedPromptId ?? ''}
              onChange={(e) => setSelectedPromptId(e.target.value || null)}
              className="input-glass cursor-pointer appearance-none px-4 py-2.5 text-sm"
              disabled={isGenerating}
            >
              <option value="">Select a prompt template...</option>
              {prompts.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            {selectedPrompt?.description && (
              <p className="text-xs text-slate-400 px-1">{selectedPrompt.description}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <textarea
              value={customPrompt}
              onChange={(e) => {
                if (e.target.value.length <= 1000) setCustomPrompt(e.target.value)
              }}
              placeholder="Enter your instruction (e.g., 'Summarize all action items by speaker')..."
              className="input-glass min-h-[100px] resize-none text-sm leading-relaxed"
              disabled={isGenerating}
            />
            <div className="text-right text-xs text-slate-500">
              {customPrompt.length}/1000
            </div>
          </div>
        )}
      </div>

      {/* Model selector + Generate button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
        <div className="w-full sm:w-auto sm:min-w-[200px]">
          <ModelSelector
            value={selectedModel}
            onChange={setSelectedModel}
            disabled={isGenerating}
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="btn-grad w-full sm:w-auto px-6 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Generating...
            </>
          ) : (
            <>
              <SparkleIcon size={16} />
              Generate
            </>
          )}
        </button>
      </div>

      {/* Output area */}
      <StreamingOutput
        text={streamingOutput}
        isStreaming={isGenerating}
        status={generationStatus}
        errorMessage={errorMessage}
        onCopy={handleCopy}
        onSave={handleSave}
        onDownloadTxt={handleDownloadTxt}
        onDownloadPdf={handleDownloadPdf}
        isSaved={!!viewingDocument?.is_saved}
        viewingTitle={viewingDocument?.document_title}
      />

      {/* Save modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSaveModal(false)} />
          <div className="relative z-10 w-full max-w-md glass rounded-2xl p-6 shadow-2xl">
            <h2 className="font-display text-lg font-bold text-white mb-4">Save Document</h2>
            <div className="flex flex-col gap-1.5 mb-6">
              <label className="text-xs font-semibold text-slate-400">Document Title</label>
              <input
                type="text"
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                maxLength={200}
                className="input-glass px-3 py-2 text-sm"
                placeholder="Meeting Minutes — June 18, 2026"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmSave()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setShowSaveModal(false)}>Cancel</button>
              <button className="btn-grad" onClick={handleConfirmSave} disabled={!saveTitle.trim()}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
