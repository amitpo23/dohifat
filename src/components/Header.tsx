'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePlayer } from '@/hooks/usePlayer'
import { useSegment } from '@/hooks/useSegment'

function formatTime(ms: number): string {
  if (ms <= 0) return ''
  const totalSec = Math.floor(ms / 1000)
  const hours = Math.floor(totalSec / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function Header() {
  const { team } = usePlayer()
  const { currentSegment, timeUntilWinner } = useSegment()
  const [countdown, setCountdown] = useState(timeUntilWinner)
  const targetEndRef = useRef(Date.now() + timeUntilWinner)

  const updateCountdown = useCallback(() => {
    const remaining = Math.max(0, targetEndRef.current - Date.now())
    setCountdown(remaining)
    return remaining
  }, [])

  useEffect(() => {
    targetEndRef.current = Date.now() + timeUntilWinner
    setCountdown(timeUntilWinner)
    if (timeUntilWinner <= 0) return

    const interval = setInterval(() => {
      const remaining = updateCountdown()
      if (remaining <= 0) clearInterval(interval)
    }, 1000)

    return () => clearInterval(interval)
  }, [timeUntilWinner, updateCountdown])

  return (
    <header
      className="sticky top-0 z-40 px-4 py-3 shadow-md backdrop-blur-sm"
      style={{
        backgroundColor: `${team?.color_bg || '#D4663C'}ee`,
      }}
    >
      <div className="max-w-[480px] mx-auto flex items-center justify-between">
        <Link href="/game" className="flex items-center gap-2 active:opacity-70 transition-opacity">
          <span className="text-2xl">{team?.emoji || '🐦'}</span>
          <div>
            <h2 className="text-white font-bold text-sm leading-tight">
              {team?.name || 'הדוכיפתיות'}
            </h2>
            <p className="text-white/70 text-xs">
              {team ? `${team.score} נקודות` : ''}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {countdown > 0 && (
            <div className="bg-white/20 rounded-full px-2.5 py-1 text-white text-xs font-bold tabular-nums">
              🏆 {formatTime(countdown)}
            </div>
          )}
          {currentSegment && (
            <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
              <span className="text-sm">{currentSegment.icon}</span>
              <span className="text-white text-xs font-medium">
                יום {currentSegment.id}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
