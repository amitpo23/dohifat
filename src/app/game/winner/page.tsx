'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'

type CeremonyPhase = 'loading' | 'countdown' | 'drumroll' | 'reveal' | 'podium'

interface TeamRanking {
  team_id: number
  name: string
  emoji: string
  color_bg: string
  color_light: string
  score: number
  completions: number
  trivia_correct: number
  photos: number
  active_players: number
  rank: number
}

export default function WinnerPage() {
  const [rankings, setRankings] = useState<TeamRanking[]>([])
  const [phase, setPhase] = useState<CeremonyPhase>('loading')
  const [count, setCount] = useState(10)

  // Fetch rankings from algorithm API
  useEffect(() => {
    const fetchRankings = async () => {
      const res = await fetch('/api/winner')
      const data = await res.json()
      if (data.rankings) {
        setRankings(data.rankings)
        setPhase('countdown')
      }
    }
    fetchRankings()
  }, [])

  // Countdown
  useEffect(() => {
    if (phase !== 'countdown') return

    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          setPhase('drumroll')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [phase])

  // Drumroll -> Reveal
  useEffect(() => {
    if (phase !== 'drumroll') return

    const timer = setTimeout(() => {
      setPhase('reveal')
      fireConfetti()
    }, 3000)

    return () => clearTimeout(timer)
  }, [phase])

  // Reveal -> Podium
  useEffect(() => {
    if (phase !== 'reveal') return

    const timer = setTimeout(() => {
      setPhase('podium')
    }, 5000)

    return () => clearTimeout(timer)
  }, [phase])

  const winner = rankings.at(0)

  return (
    <div className="min-h-dvh bg-desert-brown flex flex-col items-center justify-center p-6 text-white overflow-hidden">
      <AnimatePresence mode="wait">
        {phase === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <div className="text-6xl animate-pulse">🐦</div>
            <p className="text-lg mt-4 opacity-70">...טוען תוצאות</p>
          </motion.div>
        )}

        {phase === 'countdown' && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <p className="text-xl mb-4 opacity-70">הכרזת הזוכה בעוד...</p>
            <motion.span
              key={count}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="text-9xl font-black block"
            >
              {count}
            </motion.span>
          </motion.div>
        )}

        {phase === 'drumroll' && (
          <motion.div
            key="drumroll"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <motion.p
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 0.3 }}
              className="text-7xl"
            >
              🥁🥁🥁
            </motion.p>
            <p className="text-xl mt-4 opacity-70">...תופים</p>
          </motion.div>
        )}

        {phase === 'reveal' && winner && (
          <motion.div
            key="reveal"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 10, stiffness: 100 }}
            className="text-center"
          >
            <p className="text-2xl mb-4 opacity-70">🏆 !והזוכה הגדולה</p>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className="text-8xl block mb-4"
            >
              {winner.emoji}
            </motion.span>
            <motion.h1
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-4xl font-black mb-2"
            >
              {winner.name}
            </motion.h1>
            <motion.p
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="text-3xl font-bold"
              style={{ color: winner.color_light }}
            >
              {winner.score} נקודות!
            </motion.p>
          </motion.div>
        )}

        {phase === 'podium' && (
          <motion.div
            key="podium"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center w-full max-w-md"
          >
            <h2 className="text-2xl font-bold mb-8">🏆 לוח הכבוד</h2>
            <div className="flex items-end justify-center gap-4 mb-8">
              {/* 2nd place */}
              {rankings.at(1) && (
                <PodiumSpot team={rankings[1]} place={2} height="h-28" />
              )}
              {/* 1st place */}
              {rankings.at(0) && (
                <PodiumSpot team={rankings[0]} place={1} height="h-40" />
              )}
              {/* 3rd place */}
              {rankings.at(2) && (
                <PodiumSpot team={rankings[2]} place={3} height="h-20" />
              )}
            </div>

            {/* All teams */}
            <div className="space-y-2">
              {rankings.map((team) => (
                <div
                  key={team.team_id}
                  className="flex items-center gap-3 p-2 rounded-xl bg-white/10"
                >
                  <span className="w-6 text-center font-bold opacity-60">{team.rank}</span>
                  <span className="text-xl">{team.emoji}</span>
                  <span className="font-medium flex-1">{team.name}</span>
                  <span className="font-black">{team.score}</span>
                </div>
              ))}
            </div>

            {/* Tiebreaker info */}
            {rankings.length >= 2 && rankings[0].score === rankings[1].score && (
              <div className="mt-4 p-3 rounded-xl bg-white/10 text-sm">
                <p className="font-bold mb-1">שוויון בניקוד - הוכרע לפי:</p>
                <p className="opacity-70">משימות &gt; טריוויה &gt; תמונות &gt; שחקנים</p>
              </div>
            )}

            {/* Stats breakdown */}
            <div className="mt-6 p-3 rounded-xl bg-white/5 text-xs opacity-60">
              <p className="font-bold mb-2 text-sm">פירוט הישגים:</p>
              {rankings.slice(0, 3).map((team) => (
                <div key={team.team_id} className="flex items-center gap-2 py-1">
                  <span>{team.emoji}</span>
                  <span className="flex-1 text-right">
                    {team.completions} משימות | {team.trivia_correct} טריוויה | {team.photos} תמונות | {team.active_players} שחקנים
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-8 text-lg opacity-60">
              🐦 תודה לכולם על סופ&quot;ש מדהים!
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PodiumSpot({
  team,
  place,
  height,
}: {
  team: TeamRanking
  place: number
  height: string
}) {
  const medals = ['🥇', '🥈', '🥉']
  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: place * 0.2 }}
      className="flex flex-col items-center"
    >
      <span className="text-3xl mb-1">{team.emoji}</span>
      <span className="text-xs font-bold mb-1">{team.name}</span>
      <span className="text-sm font-black mb-2">{team.score}</span>
      <div
        className={`w-20 ${height} rounded-t-xl flex items-start justify-center pt-2`}
        style={{ backgroundColor: team.color_bg }}
      >
        <span className="text-2xl">{medals[place - 1]}</span>
      </div>
    </motion.div>
  )
}

function fireConfetti() {
  const duration = 5000
  const end = Date.now() + duration

  const frame = () => {
    confetti({
      particleCount: 30,
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      origin: { x: Math.random(), y: Math.random() * 0.4 },
      colors: ['#D4663C', '#1B998B', '#C73E4A', '#7B2D8E', '#D4943C', '#2D5DA1'],
    })

    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  }

  // Also fire hoopoe emoji confetti
  const hoopoe = confetti.shapeFromText({ text: '🐦', scalar: 2 })
  confetti({
    shapes: [hoopoe],
    scalar: 2,
    particleCount: 30,
    spread: 360,
    origin: { y: 0.5 },
  })

  frame()
}
