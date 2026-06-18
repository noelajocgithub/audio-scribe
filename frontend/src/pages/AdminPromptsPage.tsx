import React, { useEffect, useState } from 'react'
import { apiService } from '../services/api'
import { PromptTemplateAdmin } from '../types'
import { useStore } from '../store'
import { useAuth } from '../store/auth'
import { SettingsIcon, EditIcon, TrashIcon, XIcon } from '../components/icons'
import { ConfirmDialog } from '../components/Modal'

const CATEGORIES = ['meeting_minutes', 'action_items', 'summary', 'report', 'custom']

interface FormState {
  title: string
  description: string
  template: string
  category: string
  is_active: boolean
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  template: '',
  category: 'custom',
  is_active: true,
}

export const AdminPromptsPage: React.FC = () => {
  const user = useAuth((s) => s.user)
  const addToast = useStore((s) => s.addToast)

  const [prompts, setPrompts] = useState<PromptTemplateAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PromptTemplateAdmin | null>(null)

  const fetchPrompts = async () => {
    try {
      const data = await apiService.getPromptsAdmin()
      setPrompts(data)
    } catch {
      addToast({ type: 'error', message: 'Failed to load prompts' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPrompts() }, [])

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-400">Access denied. Admin only.</p>
      </div>
    )
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (prompt: PromptTemplateAdmin) => {
    setEditingId(prompt.id)
    setForm({
      title: prompt.title,
      description: prompt.description || '',
      template: prompt.template,
      category: prompt.category,
      is_active: prompt.is_active,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.template.includes('{{transcription}}')) {
      addToast({ type: 'error', message: 'Template must contain {{transcription}} placeholder' })
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        await apiService.updatePrompt(editingId, form)
        addToast({ type: 'success', message: 'Prompt updated' })
      } else {
        await apiService.createPrompt(form)
        addToast({ type: 'success', message: 'Prompt created' })
      }
      setModalOpen(false)
      fetchPrompts()
    } catch {
      addToast({ type: 'error', message: 'Failed to save prompt' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await apiService.deletePrompt(deleteTarget.id)
      addToast({ type: 'success', message: 'Prompt deactivated' })
      setDeleteTarget(null)
      fetchPrompts()
    } catch {
      addToast({ type: 'error', message: 'Failed to delete prompt' })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 shadow-glow">
            <SettingsIcon size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-white">Prompt Library Manager</h1>
            <p className="text-xs text-slate-400">Create and manage AI prompt templates</p>
          </div>
        </div>
        <button className="btn-grad" onClick={openCreate}>+ New Prompt</button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-400" />
        </div>
      ) : prompts.length === 0 ? (
        <div className="glass flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
          <p className="text-slate-400">No prompt templates yet.</p>
          <button className="btn-ghost text-sm" onClick={openCreate}>Create your first template</button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-slate-400 uppercase tracking-wide">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3 hidden sm:table-cell">Category</th>
                <th className="px-4 py-3 hidden md:table-cell">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {prompts.map((p) => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-200">{p.title}</div>
                    {p.description && <div className="text-xs text-slate-500 mt-0.5">{p.description}</div>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-slate-300">
                      {p.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${p.is_active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button className="btn-ghost px-2.5 py-1.5" onClick={() => openEdit(p)} title="Edit">
                        <EditIcon size={15} />
                      </button>
                      <button
                        className="btn-danger px-2.5 py-1.5"
                        onClick={() => setDeleteTarget(p)}
                        title={p.is_active ? 'Deactivate' : 'Already inactive'}
                        disabled={!p.is_active}
                      >
                        <TrashIcon size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <form
            onSubmit={handleSubmit}
            className="relative z-10 w-full max-w-lg glass rounded-2xl p-6 flex flex-col gap-4 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-lg font-bold text-white">
                {editingId ? 'Edit Prompt' : 'New Prompt'}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <XIcon size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={80}
                required
                className="input-glass px-3 py-2 text-sm"
                placeholder="e.g., Meeting Minutes Generator"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={200}
                className="input-glass px-3 py-2 text-sm"
                placeholder="Brief description shown to users"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="input-glass px-3 py-2 text-sm appearance-none cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">
                Template <span className="text-violet-400">(must include {'{{transcription}}'})</span>
              </label>
              <textarea
                value={form.template}
                onChange={(e) => setForm({ ...form, template: e.target.value })}
                required
                rows={6}
                className="input-glass px-3 py-2 text-sm resize-none font-mono leading-relaxed"
                placeholder={`Generate formal minutes from the following meeting transcript:\n{{transcription}}\n\nFormat with: Attendees, Agenda, Discussion, Action Items`}
              />
              {form.template && !form.template.includes('{{transcription}}') && (
                <p className="text-xs text-rose-400">Missing {'{{transcription}}'} placeholder</p>
              )}
            </div>

            {editingId && (
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded border-white/20 bg-white/5"
                />
                Active (visible to users)
              </label>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button type="button" className="btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn-grad" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Deactivate prompt?"
        message={`"${deleteTarget?.title}" will be hidden from users but preserved in the database.`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
