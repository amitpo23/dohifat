'use client'

import { useEffect, useState } from 'react'
import { SEGMENTS } from '@/lib/schedule'
import type { Segment } from '@/lib/schedule'

function computeCurrentSegment(): Segment | null {
  const now = new Date()
  for (const seg of SEGMENTS) {
    const startVal = process.env[seg.startEnv]
    const endVal = process.env[seg.endEnv]
    if (!startVal || !endVal) continue

    const start = new Date(startVal)
    const end = new Date(endVal)
    if (now >= start && now <= end) return seg
  }
  return null
}

function computeTimeUntilWinner(): number {
  const winnerTimeStr = process.env.NEXT_PUBLIC_WINNER_TIME
  if (!winnerTimeStr) return 0
  const winnerTime = new Date(winnerTimeStr)
  return Math.max(0, winnerTime.getTime() - Date.now())
}

export function useSegment() {
  const [currentSegment, setCurrentSegment] = useState<Segment | null>(null)
  const [timeUntilWinner, setTimeUntilWinner] = useState(0)

  useEffect(() => {
    setCurrentSegment(computeCurrentSegment())
    setTimeUntilWinner(computeTimeUntilWinner())

    const interval = setInterval(() => {
      setCurrentSegment(computeCurrentSegment())
      setTimeUntilWinner(computeTimeUntilWinner())
    }, 30_000)

    return () => clearInterval(interval)
  }, [])

  return { currentSegment, timeUntilWinner, segments: SEGMENTS }
}
