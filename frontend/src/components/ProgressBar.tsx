import React from 'react'

export const ProgressBar: React.FC<{ value: number; label?: string }> = ({ value, label }) => {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-400">
        <span>{label ?? 'Transcribing'}</span>
        <span className="tabular-nums text-slate-200">{pct}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/40 shadow-inset">
        <div
          className="relative h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        >
          {/* Moving sheen for a lively, dimensional feel. */}
          <div
            className="absolute inset-0 animate-shimmer rounded-full opacity-60"
            style={{
              backgroundImage:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
              backgroundSize: '200% 100%',
            }}
          />
        </div>
      </div>
    </div>
  )
}
