import { create } from 'zustand'
import { FileWithTranscription, Toast, Store } from '../types'

export const useStore = create<Store>((set) => ({
  files: [],
  selectedFileId: null,
  loading: false,
  error: null,
  toasts: [],

  setFiles: (files) => set({ files }),
  
  addFile: (file) => set((state) => ({
    files: [file, ...state.files]
  })),
  
  updateFile: (file) => set((state) => ({
    files: state.files.map(f => f.id === file.id ? file : f)
  })),

  removeFile: (id) => set((state) => ({
    files: state.files.filter(f => f.id !== id),
    selectedFileId: state.selectedFileId === id ? null : state.selectedFileId
  })),

  setSelectedFileId: (id) => set({ selectedFileId: id }),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
  
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(7)
    const duration = toast.duration || 3000
    
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }]
    }))
    
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter(t => t.id !== id)
      }))
    }, duration)
  },
  
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  }))
}))
