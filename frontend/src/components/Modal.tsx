import React, { useEffect, useState } from 'react'
import { XIcon } from './icons'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

export const Modal: React.FC<ModalProps> = ({ open, title, onClose, children }) => {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="glass animate-rise-in relative w-full max-w-md p-6 shadow-lift">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <XIcon size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open, title, message, confirmLabel = 'Delete', onConfirm, onClose,
}) => (
  <Modal open={open} title={title} onClose={onClose}>
    <p className="mb-6 text-sm leading-relaxed text-slate-300">{message}</p>
    <div className="flex justify-end gap-2">
      <button className="btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn-danger" onClick={() => { onConfirm(); onClose() }}>
        {confirmLabel}
      </button>
    </div>
  </Modal>
)

interface RenameDialogProps {
  open: boolean
  initial: string
  onSave: (title: string) => void
  onClose: () => void
}

export const RenameDialog: React.FC<RenameDialogProps> = ({ open, initial, onSave, onClose }) => {
  const [value, setValue] = useState(initial)
  useEffect(() => { if (open) setValue(initial) }, [open, initial])

  const submit = () => {
    const trimmed = value.trim()
    if (trimmed) { onSave(trimmed); onClose() }
  }

  return (
    <Modal open={open} title="Rename" onClose={onClose}>
      <input
        autoFocus
        className="input-glass mb-6"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="Enter a friendly title"
      />
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-grad" onClick={submit} disabled={!value.trim()}>Save</button>
      </div>
    </Modal>
  )
}
