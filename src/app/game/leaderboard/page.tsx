'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { useTeams } from '@/hooks/useTeams'
import { usePlayer } from '@/hooks/usePlayer'
import { motion, AnimatePresence } from 'framer-motion'

interface PlayerScore {
  player_id: string
  name: string
  team_id: number
  total_points: number
  breakdown: {
    photo_upload: number
    trivia: number
    missions: number
    games: number
    other: number
  }
}

export default function LeaderboardPage() {
  const { teams } = useTeams()
  const { player } = usePlayer()
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const loadScores = async () => {
      const { data: logs } = await supabase
        .from('score_log')
        .select('player_id, points, reason')
        .not('player_id', 'is', null)

      const { data: players } = await supabase
        .from('players')
        .select('id, name, team_id')

      if (!logs || !players) {
        setLoading(false)
        return
      }

      const playerMap: Record<string, { total: number; photo_upload: number; trivia: number; missions: number; games: number; other: number }> = {}

      for (const log of logs) {
        if (!log.player_id) continue
        if (!playerMap[log.player_id]) {
          playerMap[log.player_id] = { total: 0, photo_upload: 0, trivia: 0, missions: 0, games: 0, other: 0 }
        }
        const entry = playerMap[log.player_id]
        entry.total += log.points

        if (log.reason === 'photo_upload') entry.photo_upload += log.points
        else if (log.reason === 'trivia_correct' || log.reason?.startsWith('trivia')) entry.trivia += log.points
        else if (log.reason?.startsWith('mission:')) entry.missions += log.points
        else if (log.reason === 'game_play' || log.reason?.startsWith('game')) entry.games += log.points
        else entry.other += log.points
      }

      const scores: PlayerScore[] = players.map((p) => {
        const data = playerMap[p.id] || { total: 0, photo_upload: 0, trivia: 0, missions: 0, games: 0, other: 0 }
        return {
          player_id: p.id,
          name: p.name,
          team_id: p.team_id,
          total_points: data.total,
          breakdown: {
            photo_upload: data.photo_upload,
            trivia: data.trivia,
            missions: data.missions,
            games: data.games,
            other: data.other,
          },
        }
      })

      scores.sort((a, b) => b.total_points - a.total_points)
      setPlayerScores(scores)
      setLoading(false)
    }

    loadScores()
  }, [])

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 skeleton rounded-xl" />
        ))}
      </div>
    )
  }

  const maxPoints = Math.max(...playerScores.map((p) => p.total_points), 1)

  return (
    <div className="p-4">
      <h1 className="text-xl font-black text-desert-brown mb-4 flex items-center gap-2">
        ⭐ דירוג שחקנים
      </h1>

      {/* Top 3 podium */}
      {playerScores.length >= 3 && (
        <div className="flex items-end justify-center gap-2 mb-6 h-32">
          {[1, 0, 2].map((rank) => {
            const ps = playerScores[rank]
            if (!ps) return null
            const psTeam = teams.find((t) => t.id === ps.team_id)
            const heights = ['h-28', 'h-20', 'h-16']
            const medals = ['🥇', '🥈', '🥉']

            return (
              <motion.div
                key={ps.player_id}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: rank * 0.15, type: 'spring' }}
                className={`flex-1 max-w-[100px] ${heights[rank]} flex flex-col items-center justify-end rounded-t-2xl p-2`}
                style={{ backgroundColor: psTeam?.color_light || '#f5f1eb' }}
              >
                <span className="text-2xl mb-1">{medals[rank]}</span>
                <span className="text-xs font-black text-desert-brown truncate w-full text-center">
                  {ps.name}
                </span>
                <span className="text-sm font-black" style={{ color: psTeam?.color_bg }}>
                  {ps.total_points}
                </span>
              </motion.div>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        <div className="space-y-2">
          {playerScores.map((ps, i) => {
            const psTeam = teams.find((t) => t.id === ps.team_id)
            const isMe = ps.player_id === player?.id
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ''
            const isExpanded = expandedPlayer === ps.player_id
            const barWidth = Math.max(10, (ps.total_points / maxPoints) * 100)

            return (
              <motion.div
                key={ps.player_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
              >
                <button
                  type="button"
                  onClick={() => setExpandedPlayer(isExpanded ? null : ps.player_id)}
                  className={`w-full text-right rounded-xl shadow-sm transition-all ${
                    isMe ? 'bg-hoopoe/10 ring-2 ring-hoopoe' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 p-3">
                    <span className="w-8 text-center font-black text-desert-brown text-sm">
                      {medal || i + 1}
                    </span>
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs text-white shrink-0"
                      style={{ backgroundColor: psTeam?.color_bg || '#D4663C' }}
                    >
                      {psTeam?.emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-desert-brown truncate">
                        {ps.name} {isMe && '(את/ה)'}
                      </p>
                      <div className="mt-1 h-1.5 bg-desert-brown/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: psTeam?.color_bg || '#D4663C' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidth}%` }}
                          transition={{ type: 'spring', damping: 15, delay: i * 0.03 }}
                        />
                      </div>
                    </div>
                    <span className="font-black text-desert-brown min-w-[40px] text-left">
                      {ps.total_points}
                    </span>
                  </div>

                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="px-3 pb-3 pt-1 border-t border-desert-brown/5"
                    >
                      <div className="grid grid-cols-4 gap-2">
                        <BreakdownItem icon="📸" label="תמונות" points={ps.breakdown.photo_upload} />
                        <BreakdownItem icon="🧠" label="טריוויה" points={ps.breakdown.trivia} />
                        <BreakdownItem icon="🎯" label="משימות" points={ps.breakdown.missions} />
                        <BreakdownItem icon="🎮" label="משחקים" points={ps.breakdown.games} />
                      </div>
                    </motion.div>
                  )}
                </button>
              </motion.div>
            )
          })}

          {playerScores.length === 0 && (
            <div className="text-center py-12 text-desert-brown/40">
              <p className="text-4xl mb-2">⭐</p>
              <p className="text-sm">עוד אין ניקוד... התחילו לשחק!</p>
            </div>
          )}
        </div>
      </AnimatePresence>
    </div>
  )
}

function BreakdownItem({ icon, label, points }: { icon: string; label: string; points: number }) {
  return (
    <div className="text-center">
      <span className="text-sm">{icon}</span>
      <p className="text-xs font-black text-desert-brown">{points}</p>
      <p className="text-[9px] text-desert-brown/40">{label}</p>
    </div>
  )
}
