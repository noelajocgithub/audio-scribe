import { create } from 'zustand'
import { PromptTemplate, AIGeneration, OllamaModel, SavedDocument } from '../types'
import { apiService } from '../services/api'

interface AIState {
  mode: 'library' | 'custom'
  prompts: PromptTemplate[]
  selectedPromptId: string | null
  customPrompt: string
  selectedModel: OllamaModel
  streamingOutput: string
  generationStatus: 'idle' | 'streaming' | 'completed' | 'error'
  currentGenerationId: string | null
  savedDrafts: AIGeneration[]
  errorMessage: string | null
  savedDocuments: SavedDocument[]
  showSaveModal: boolean
  viewingDocument: AIGeneration | null

  setMode: (mode: 'library' | 'custom') => void
  setSelectedPromptId: (id: string | null) => void
  setCustomPrompt: (prompt: string) => void
  setSelectedModel: (model: OllamaModel) => void
  appendChunk: (chunk: string) => void
  resetGeneration: () => void
  startGeneration: () => void
  completeGeneration: (generationId: string) => void
  failGeneration: (error: string) => void
  fetchPrompts: () => Promise<void>
  fetchSavedDrafts: () => Promise<void>
  setShowSaveModal: (show: boolean) => void
  fetchSavedDocuments: () => Promise<void>
  loadSavedDocument: (id: string) => Promise<void>
  clearViewingDocument: () => void
}

export const useAIStore = create<AIState>((set) => ({
  mode: 'library',
  prompts: [],
  selectedPromptId: null,
  customPrompt: '',
  selectedModel: 'llama3.1:8b',
  streamingOutput: '',
  generationStatus: 'idle',
  currentGenerationId: null,
  savedDrafts: [],
  errorMessage: null,
  savedDocuments: [],
  showSaveModal: false,
  viewingDocument: null,

  setMode: (mode) => set({ mode }),
  setSelectedPromptId: (id) => set({ selectedPromptId: id }),
  setCustomPrompt: (prompt) => set({ customPrompt: prompt }),
  setSelectedModel: (model) => set({ selectedModel: model }),

  appendChunk: (chunk) => set((state) => ({
    streamingOutput: state.streamingOutput + chunk,
  })),

  resetGeneration: () => set({
    streamingOutput: '',
    generationStatus: 'idle',
    currentGenerationId: null,
    errorMessage: null,
  }),

  startGeneration: () => set({
    streamingOutput: '',
    generationStatus: 'streaming',
    currentGenerationId: null,
    errorMessage: null,
  }),

  completeGeneration: (generationId) => set({
    generationStatus: 'completed',
    currentGenerationId: generationId,
  }),

  failGeneration: (error) => set({
    generationStatus: 'error',
    errorMessage: error,
  }),

  fetchPrompts: async () => {
    try {
      const prompts = await apiService.getPrompts()
      set({ prompts })
    } catch (e) {
      console.error('Failed to fetch prompts:', e)
    }
  },

  fetchSavedDrafts: async () => {
    try {
      const drafts = await apiService.getGenerations()
      set({ savedDrafts: drafts })
    } catch (e) {
      console.error('Failed to fetch generations:', e)
    }
  },

  setShowSaveModal: (show) => set({ showSaveModal: show }),

  fetchSavedDocuments: async () => {
    try {
      const docs = await apiService.getSavedDocuments()
      set({ savedDocuments: docs })
    } catch (e) {
      console.error('Failed to fetch saved documents:', e)
    }
  },

  loadSavedDocument: async (id) => {
    try {
      const gen = await apiService.getGeneration(id)
      set({
        viewingDocument: gen,
        streamingOutput: gen.output || '',
        generationStatus: 'completed',
        currentGenerationId: gen.id,
      })
    } catch (e) {
      console.error('Failed to load document:', e)
    }
  },

  clearViewingDocument: () => set({ viewingDocument: null }),
}))
