'use client'

import { useState, useEffect } from 'react'
import { useTeams } from '@/hooks/useTeams'
import { usePlayer } from '@/hooks/usePlayer'
import { createClient } from '@/lib/supabase/browser'
import { motion, AnimatePresence } from 'framer-motion'

interface PlayerScore {
  player_id: string
  name: string
  team_id: number
  total_points: number
}

interface LeaderboardProps {
  showPlayers?: boolean
}

export function Leaderboard({ showPlayers = false }: LeaderboardProps) {
  const { teams, loading } = useTeams()
  const { player, team: myTeam } = usePlayer()
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null)
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>([])
  const [playersLoaded, setPlayersLoaded] = useState(false)

  useEffect(() => {
    if (!showPlayers) return

    const supabase = createClient()
    const loadPlayers = async () => {
      const [playersRes, scoresRes] = await Promise.all([
        supabase.from('players').select('id, name, team_id'),
        supabase.from('score_log').select('player_id, points'),
      ])

      if (playersRes.data && scoresRes.data) {
        const pointsMap: Record<string, number> = {}
        for (const row of scoresRes.data) {
          if (row.player_id) {
            pointsMap[row.player_id] = (pointsMap[row.player_id] || 0) + row.points
          }
        }

        const scores: PlayerScore[] = playersRes.data.map((p) => ({
          player_id: p.id,
          name: p.name,
          team_id: p.team_id,
          total_points: pointsMap[p.id] || 0,
        }))

        scores.sort((a, b) => b.total_points - a.total_points)
        setPlayerScores(scores)
        setPlayersLoaded(true)
      }
    }
    loadPlayers()
  }, [showPlayers])

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-16 bg-desert-brown/5 rounded-2xl animate-pulse"
          />
        ))}
      </div>
    )
  }

  const maxScore = Math.max(...teams.map((t) => t.score), 1)

  const getTeamPlayers = (teamId: number) =>
    playerScores
      .filter((p) => p.team_id === teamId)
      .sort((a, b) => b.total_points - a.total_points)

  const toggleTeam = (teamId: number) => {
    if (!showPlayers) return
    setExpandedTeam((prev) => (prev === teamId ? null : teamId))
  }

  return (
    <div className="space-y-3 p-4">
      <AnimatePresence mode="popLayout">
        {teams.map((team, index) => {
          const isMyTeam = myTeam?.id === team.id
          const barWidth = Math.max(15, (team.score / maxScore) * 100)
          const isExpanded = expandedTeam === team.id
          const teamPlayers = isExpanded ? getTeamPlayers(team.id) : []

          return (
            <motion.div
              key={team.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className={`
                relative rounded-2xl overflow-hidden
                ${isMyTeam ? 'ring-2 ring-desert-brown/30' : ''}
              `}
              style={{ backgroundColor: team.color_light }}
            >
              <button
                type="button"
                onClick={() => toggleTeam(team.id)}
                className="w-full p-3 text-right"
                disabled={!showPlayers}
              >
                <div className="flex items-center gap-3 relative z-10">
                  {/* Rank */}
                  <div className="w-7 text-center">
                    <span className="text-lg font-black text-desert-brown/30">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                    </span>
                  </div>

                  {/* Team info */}
                  <span className="text-2xl">{team.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate" style={{ color: team.color_bg }}>
                      {team.name}
                    </p>
                    {/* Score bar */}
                    <div className="mt-1 h-2 bg-desert-brown/5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: team.color_bg }}
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ type: 'spring', damping: 15, stiffness: 100 }}
                      />
                    </div>
                  </div>

                  {/* Score */}
                  <motion.span
                    key={team.score}
                    initial={{ scale: 1.3, color: '#D4663C' }}
                    animate={{ scale: 1, color: team.color_bg }}
                    className="text-lg font-black min-w-[40px] text-left"
                  >
                    {team.score}
                  </motion.span>

                  {/* Expand indicator */}
                  {showPlayers && playersLoaded && (
                    <span className="text-xs text-desert-brown/30">
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  )}
                </div>
              </button>

              {/* Expanded player list */}
              <AnimatePresence>
                {isExpanded && teamPlayers.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 pt-1 border-t border-desert-brown/5">
                      {teamPlayers.map((p, pIndex) => {
                        const isMe = player?.id === p.player_id
                        return (
                          <div
                            key={p.player_id}
                            className={`flex items-center gap-2 py-1.5 text-xs ${isMe ? 'font-bold' : ''}`}
                          >
                            <span className="w-5 text-center text-desert-brown/30 font-bold">
                              {pIndex + 1}
                            </span>
                            <span className={`flex-1 truncate ${isMe ? 'text-desert-brown' : 'text-desert-brown/70'}`}>
                              {p.name} {isMe ? '(אני)' : ''}
                            </span>
                            <span className="font-bold tabular-nums" style={{ color: team.color_bg }}>
                              {p.total_points}
                            </span>
                          </div>
                        )
                      })}
                      {teamPlayers.length === 0 && (
                        <p className="text-xs text-desert-brown/30 text-center py-2">אין שחקנים</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
