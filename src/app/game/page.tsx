'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Leaderboard } from '@/components/Leaderboard'
import { usePlayer } from '@/hooks/usePlayer'
import { createClient } from '@/lib/supabase/browser'

interface PlayerStats {
  photos: number
  completions: number
  triviaCorrect: number
  gamePlays: number
  messages: number
  totalPoints: number
}

const quickActions = [
  { href: '/game/missions', icon: '🎯', label: 'משימות', color: 'bg-hoopoe/10 text-hoopoe' },
  { href: '/game/trivia', icon: '🧠', label: 'טריוויה', color: 'bg-accent-purple/10 text-accent-purple' },
  { href: '/game/gallery', icon: '📸', label: 'גלריה', color: 'bg-accent-teal/10 text-accent-teal' },
  { href: '/game/games', icon: '🎮', label: 'משחקים', color: 'bg-accent-gold/10 text-accent-gold' },
  { href: '/game/chat', icon: '💬', label: 'צ׳אט', color: 'bg-accent-blue/10 text-accent-blue' },
  { href: '/game/leaderboard', icon: '⭐', label: 'דירוג', color: 'bg-accent-red/10 text-accent-red' },
]

export default function ResultsPage() {
  const { player } = usePlayer()
  const [stats, setStats] = useState<PlayerStats | null>(null)

  useEffect(() => {
    if (!player) return
    const supabase = createClient()

    const loadStats = async () => {
      const [photosRes, completionsRes, triviaRes, gamesRes, messagesRes, pointsRes] = await Promise.all([
        supabase.from('photos').select('id', { count: 'exact', head: true }).eq('player_id', player.id),
        supabase.from('completions').select('id', { count: 'exact', head: true }).eq('player_id', player.id),
        supabase.from('trivia_answers').select('id', { count: 'exact', head: true }).eq('player_id', player.id).eq('correct', true),
        supabase.from('game_plays').select('id', { count: 'exact', head: true }).eq('player_id', player.id),
        supabase.from('game_messages').select('id', { count: 'exact', head: true }).eq('player_id', player.id),
        supabase.from('score_log').select('points').eq('player_id', player.id),
      ])

      const totalPoints = pointsRes.data?.reduce((sum, row) => sum + row.points, 0) || 0

      setStats({
        photos: photosRes.count || 0,
        completions: completionsRes.count || 0,
        triviaCorrect: triviaRes.count || 0,
        gamePlays: gamesRes.count || 0,
        messages: messagesRes.count || 0,
        totalPoints,
      })
    }

    loadStats()
  }, [player])

  return (
    <div className="p-4 space-y-4">
      {/* Welcome & Points */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-bl from-hoopoe/15 via-accent-gold/10 to-desert-bg rounded-2xl p-4"
      >
        <p className="text-sm text-desert-brown/60">שלום,</p>
        <h1 className="text-2xl font-black text-desert-brown mb-1">
          {player?.name || '...'}
        </h1>
        {stats && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-3xl font-black text-hoopoe">{stats.totalPoints}</span>
            <span className="text-sm text-desert-brown/50">נקודות אישיות</span>
          </div>
        )}
      </motion.div>

      {/* My Stats */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="grid grid-cols-5 gap-2">
            <MiniStat icon="📸" value={stats.photos} label="תמונות" />
            <MiniStat icon="🎯" value={stats.completions} label="משימות" />
            <MiniStat icon="🧠" value={stats.triviaCorrect} label="טריוויה" />
            <MiniStat icon="🎮" value={stats.gamePlays} label="משחקים" />
            <MiniStat icon="💬" value={stats.messages} label="הודעות" />
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-sm font-bold text-desert-brown/50 mb-2">מה עושים?</h2>
        <div className="grid grid-cols-3 gap-2">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`p-3 rounded-xl text-center transition-all active:scale-95 ${action.color}`}
            >
              <span className="text-2xl block mb-1">{action.icon}</span>
              <span className="text-xs font-bold block">{action.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Team Leaderboard */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-desert-brown/50">דירוג קבוצות ושחקנים</h2>
          <Link
            href="/game/leaderboard"
            className="text-xs text-hoopoe font-bold"
          >
            פודיום מלא
          </Link>
        </div>
        <Leaderboard showPlayers />
      </motion.div>

      {/* Achievements shortcut */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Link
          href="/game/achievements"
          className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm active:scale-[0.98] transition-all"
        >
          <span className="text-2xl">🏅</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-desert-brown">הישגים אישיים</p>
            <p className="text-xs text-desert-brown/40">גלו את ההישגים שפתחתם</p>
          </div>
          <span className="text-desert-brown/30">←</span>
        </Link>
      </motion.div>
    </div>
  )
}

function MiniStat({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div className="bg-white rounded-xl p-2 text-center shadow-sm">
      <span className="text-sm block">{icon}</span>
      <p className="text-lg font-black text-desert-brown">{value}</p>
      <p className="text-[9px] text-desert-brown/40 leading-tight">{label}</p>
    </div>
  )
}
