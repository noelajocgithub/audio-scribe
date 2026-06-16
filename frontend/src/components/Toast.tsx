import React from 'react'
import { useStore } from '../store'
import { CheckIcon, XIcon, SparkleIcon } from './icons'

const TONE: Record<string, { ring: string; icon: React.ReactNode }> = {
  success: { ring: 'shadow-glow', icon: <CheckIcon size={16} /> },
  error: { ring: 'shadow-glow-pink', icon: <XIcon size={16} /> },
  info: { ring: 'shadow-glow', icon: <SparkleIcon size={16} /> },
}

export const Toast: React.FC = () => {
  const toasts = useStore((state) => state.toasts)
  const removeToast = useStore((state) => state.removeToast)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-3">
      {toasts.map((toast) => {
        const tone = TONE[toast.type] || TONE.info
        return (
          <div
            key={toast.id}
            className={`glass animate-rise-in flex items-center gap-3 px-4 py-3 ${tone.ring}`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-white ${
                toast.type === 'error'
                  ? 'bg-gradient-to-br from-rose-500 to-pink-500'
                  : toast.type === 'success'
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-500'
                  : 'bg-gradient-to-br from-violet-500 to-fuchsia-500'
              }`}
            >
              {tone.icon}
            </span>
            <span className="text-sm font-medium text-slate-100">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 text-slate-400 transition hover:text-white"
            >
              <XIcon size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
