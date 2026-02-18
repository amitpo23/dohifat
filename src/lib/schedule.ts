export interface Segment {
  id: number
  name: string
  icon: string
  startEnv: string
  endEnv: string
}

export const SEGMENTS: Segment[] = [
  { id: 1, name: 'יום התמונות', icon: '📸', startEnv: 'NEXT_PUBLIC_SEG1_START', endEnv: 'NEXT_PUBLIC_SEG1_END' },
  { id: 2, name: 'יום המשחקים', icon: '🧠', startEnv: 'NEXT_PUBLIC_SEG2_START', endEnv: 'NEXT_PUBLIC_SEG2_END' },
  { id: 3, name: 'יום הסיום', icon: '🎉', startEnv: 'NEXT_PUBLIC_SEG3_START', endEnv: 'NEXT_PUBLIC_SEG3_END' },
]

function getEnvDate(key: string): Date | null {
  const val = process.env[key]
  if (!val) return null
  const d = new Date(val)
  return Number.isNaN(d.getTime()) ? null : d
}

export function getSegmentTimes(segment: Segment) {
  return {
    start: getEnvDate(segment.startEnv),
    end: getEnvDate(segment.endEnv),
  }
}

export function getCurrentSegment(): Segment | null {
  const now = new Date()
  for (const seg of SEGMENTS) {
    const times = getSegmentTimes(seg)
    if (times.start && times.end && now >= times.start && now <= times.end) {
      return seg
    }
  }
  return null
}

export function getWinnerTime(): Date | null {
  return getEnvDate('NEXT_PUBLIC_WINNER_TIME')
}

export function getTimeUntilWinner(): number {
  const winnerTime = getWinnerTime()
  if (!winnerTime) return 0
  return Math.max(0, winnerTime.getTime() - Date.now())
}
