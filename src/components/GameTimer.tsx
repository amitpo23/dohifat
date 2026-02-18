'use client'

import { useState, useEffect } from 'react'
import { useGameSettings } from '@/hooks/useGameSettings'

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00'
  const totalSec = Math.floor(ms / 1000)
  const hours = Math.floor(totalSec / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatElapsed(ms: number): string {
  if (ms <= 0) return '00:00:00'
  const totalSec = Math.floor(ms / 1000)
  const hours = Math.floor(totalSec / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function GameTimer() {
  const { settings } = useGameSettings()
  const timer = settings.timer

  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!timer.active) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [timer.active])

  if (!timer.active || !timer.start_time || !timer.end_time) return null

  const startMs = new Date(timer.start_time).getTime()
  const endMs = new Date(timer.end_time).getTime()
  const totalDuration = endMs - startMs
  const elapsed = now - startMs
  const remaining = endMs - now
  const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))

  const hasStarted = now >= startMs
  const hasEnded = now >= endMs

  if (!hasStarted) {
    const timeUntilStart = startMs - now
    return (
      <div className="mx-4 mb-2">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm px-4 py-2.5 flex items-center gap-3">
          <span className="text-lg">🕐</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-desert-brown/50">המשחק מתחיל בעוד</p>
            <p className="text-lg font-black text-desert-brown tabular-nums">{formatCountdown(timeUntilStart)}</p>
          </div>
        </div>
      </div>
    )
  }

  if (hasEnded) {
    return (
      <div className="mx-4 mb-2">
        <div className="bg-accent-red/10 rounded-2xl shadow-sm px-4 py-2.5 flex items-center gap-3">
          <span className="text-lg">🏁</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-accent-red">הזמן נגמר!</p>
          </div>
          <p className="text-xs font-bold text-desert-brown/40">
            {formatElapsed(totalDuration)} סה&quot;כ
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-4 mb-2">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm px-4 py-2.5">
        <div className="flex items-center gap-3 mb-1.5">
          <span className="text-lg">{remaining < 300000 ? '🔴' : '⏱️'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-desert-brown/50">זמן שנותר</p>
            <p className={`text-lg font-black tabular-nums ${
              remaining < 300000 ? 'text-accent-red animate-pulse' : 'text-desert-brown'
            }`}>
              {formatCountdown(remaining)}
            </p>
          </div>
          <div className="text-left">
            <p className="text-xs text-desert-brown/40">עבר</p>
            <p className="text-sm font-bold text-desert-brown/50 tabular-nums">{formatElapsed(elapsed)}</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-desert-brown/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              remaining < 300000 ? 'bg-accent-red' : 'bg-hoopoe'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
