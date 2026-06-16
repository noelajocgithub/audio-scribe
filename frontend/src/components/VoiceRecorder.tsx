import React, { useState, useRef } from 'react'
import { MicIcon, PauseIcon, PlayIcon, StopIcon, XIcon } from './icons'
import { formatClock } from '../lib/format'

interface VoiceRecorderProps {
  onRecordingComplete: (file: File) => void
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const cancelledRef = useRef(false)

  const getMimeType = (): string => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav',
      'audio/aac',
    ]
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type
    }
    return 'audio/webm'
  }

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      cancelledRef.current = false

      const mimeType = getMimeType()
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        if (cancelledRef.current) {
          setDuration(0)
          return
        }
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const ext = mimeType.includes('webm')
          ? 'webm'
          : mimeType.includes('mp4')
          ? 'm4a'
          : mimeType.includes('ogg')
          ? 'ogg'
          : mimeType.includes('wav')
          ? 'wav'
          : 'webm'
        const file = new File([blob], `recording-${Date.now()}.${ext}`, { type: mimeType })
        onRecordingComplete(file)
        setDuration(0)
      }

      mediaRecorder.start()
      setIsRecording(true)
      timerRef.current = window.setInterval(() => setDuration((p) => p + 1), 1000)
    } catch (error) {
      console.error('Error accessing microphone:', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      setIsRecording(false)
      setIsPaused(false)
      stopTimer()
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      stopTimer()
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      timerRef.current = window.setInterval(() => setDuration((p) => p + 1), 1000)
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      cancelledRef.current = true
      mediaRecorderRef.current.stop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      setIsRecording(false)
      setIsPaused(false)
      setDuration(0)
      chunksRef.current = []
      stopTimer()
    }
  }

  const live = isRecording && !isPaused

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Pulsing mic orb */}
      <div className="relative flex h-40 w-40 items-center justify-center">
        {live && (
          <>
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-fuchsia-500/30" />
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-violet-500/20 [animation-delay:0.6s]" />
          </>
        )}
        <div
          className={`flex h-32 w-32 items-center justify-center rounded-full text-white transition-all duration-300 ${
            isRecording
              ? 'bg-gradient-to-br from-rose-500 via-fuchsia-500 to-violet-500 shadow-glow'
              : 'bg-gradient-to-br from-violet-500/80 to-fuchsia-500/80 shadow-lift'
          }`}
        >
          <MicIcon size={48} />
        </div>
      </div>

      <div className="font-display text-4xl font-bold tabular-nums text-white">
        {formatClock(duration)}
      </div>

      <div className="flex items-center gap-3">
        {!isRecording ? (
          <button className="btn-grad px-6 py-3 text-base" onClick={startRecording}>
            <MicIcon size={18} /> Start Recording
          </button>
        ) : (
          <>
            {!isPaused ? (
              <button className="btn-ghost" onClick={pauseRecording}>
                <PauseIcon size={16} /> Pause
              </button>
            ) : (
              <button className="btn-ghost" onClick={resumeRecording}>
                <PlayIcon size={16} /> Resume
              </button>
            )}
            <button className="btn-grad" onClick={stopRecording}>
              <StopIcon size={16} /> Stop
            </button>
            <button className="btn-danger" onClick={cancelRecording}>
              <XIcon size={16} /> Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}
