'use client'

import { useSegment } from '@/hooks/useSegment'

export function Timeline() {
  const { segments, currentSegment, timeUntilWinner } = useSegment()

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / 3_600_000)
    const minutes = Math.floor((ms % 3_600_000) / 60_000)
    if (hours > 0) return `${hours} שעות ו-${minutes} דקות`
    return `${minutes} דקות`
  }

  return (
    <div className="px-4 py-3 bg-white/50">
      {/* Day progress */}
      <div className="flex items-center justify-between gap-2 mb-2">
        {segments.map((seg) => {
          const isCurrent = currentSegment?.id === seg.id
          const isPast = currentSegment ? seg.id < currentSegment.id : false

          return (
            <div
              key={seg.id}
              className={`
                flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all
                ${isCurrent ? 'bg-hoopoe/10 scale-105' : ''}
              `}
            >
              <span className={`text-lg ${isCurrent ? 'animate-pulse' : ''} ${isPast ? 'opacity-40' : ''}`}>
                {seg.icon}
              </span>
              <span
                className={`text-[10px] font-medium leading-tight text-center
                  ${isCurrent ? 'text-hoopoe font-bold' : isPast ? 'text-desert-brown/30' : 'text-desert-brown/60'}
                `}
              >
                יום {seg.id}
              </span>
            </div>
          )
        })}
      </div>

      {/* Countdown */}
      {timeUntilWinner > 0 && (
        <div className="text-center text-xs text-desert-brown/50">
          🏆 הכרזת זוכה בעוד {formatTime(timeUntilWinner)}
        </div>
      )}
    </div>
  )
}
