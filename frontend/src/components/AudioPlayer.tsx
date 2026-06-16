import React, { useEffect, useRef, useState } from 'react'
import { PlayIcon, PauseIcon } from './icons'
import { formatClock } from '../lib/format'

export const AudioPlayer: React.FC<{ src: string }> = ({ src }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)

  // Reset when the source changes (switching files).
  useEffect(() => {
    setPlaying(false)
    setCurrent(0)
    setDuration(0)
  }, [src])

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) {
      a.pause()
    } else {
      a.play().catch(() => {})
    }
  }

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current
    if (!a) return
    const t = Number(e.target.value)
    a.currentTime = t
    setCurrent(t)
  }

  const pct = duration ? (current / duration) * 100 : 0

  return (
    <div className="glass-soft flex items-center gap-3 p-3">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
      />
      <button
        onClick={toggle}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-glow transition hover:scale-105 active:scale-95"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
      </button>

      <div className="flex-1">
        <div className="relative">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={current}
            onChange={seek}
            className="audio-range w-full"
            style={{
              background: `linear-gradient(to right, rgb(167 139 250) ${pct}%, rgba(255,255,255,0.12) ${pct}%)`,
            }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[11px] tabular-nums text-slate-400">
          <span>{formatClock(current)}</span>
          <span>{formatClock(duration)}</span>
        </div>
      </div>
    </div>
  )
}
