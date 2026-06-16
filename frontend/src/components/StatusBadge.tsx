import React from 'react'

const STYLES: Record<string, string> = {
  Completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  Processing: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
  Pending: 'bg-slate-400/10 text-slate-300 border-white/15',
  Failed: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
  Cancelled: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
}

export const StatusBadge: React.FC<{ status?: string }> = ({ status = 'Pending' }) => {
  const cls = STYLES[status] || STYLES.Pending
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}
    >
      {status === 'Processing' && (
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      )}
      {status}
    </span>
  )
}
