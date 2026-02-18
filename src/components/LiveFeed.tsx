'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { usePlayer } from '@/hooks/usePlayer'
import { useTeams } from '@/hooks/useTeams'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import { playScore } from '@/lib/sounds'
import { vibrateMedium } from '@/lib/haptics'

export function LiveFeed() {
  const { team } = usePlayer()
  const { teams } = useTeams()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('live-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'score_log' },
        (payload) => {
          const log = payload.new as { team_id: number; points: number; reason: string }
          const scoreTeam = teams.find((t) => t.id === log.team_id)
          if (!scoreTeam) return

          const isMyTeam = team?.id === log.team_id
          const pts = log.points > 0 ? `+${log.points}` : String(log.points)

          const reasonMap: Record<string, string> = {
            photo_upload: 'העלאת תמונה',
            trivia_correct: 'תשובה נכונה בטריוויה',
            game_play: 'משחק מיני',
            admin_adjust: 'עדכון ניהולי',
          }
          const reasonText = log.reason.startsWith('mission:')
            ? 'השלמת משימה'
            : reasonMap[log.reason] || log.reason.replace(/_/g, ' ')

          toast(
            `${scoreTeam.emoji} ${scoreTeam.name} ${pts} נקודות`,
            {
              description: reasonText,
              duration: 3000,
            }
          )

          if (isMyTeam && log.points > 0) {
            playScore()
            vibrateMedium()

            confetti({
              particleCount: 15,
              spread: 60,
              startVelocity: 20,
              origin: { x: 0.5, y: 0.3 },
              colors: [scoreTeam.color_bg],
              ticks: 40,
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [teams, team])

  return null
}
