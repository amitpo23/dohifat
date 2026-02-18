'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePlayer } from '@/hooks/usePlayer'
import { useSegment } from '@/hooks/useSegment'
import { createClient } from '@/lib/supabase/browser'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { vibrateLight } from '@/lib/haptics'
import { BackButton } from '@/components/BackButton'
import { InfoBanner } from '@/components/InfoBanner'
import { playClick } from '@/lib/sounds'

const GAME_DURATION = 20_000

export default function SpeedTapGame() {
  const router = useRouter()
  const { player, team } = usePlayer()
  const { currentSegment } = useSegment()
  const [taps, setTaps] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [started, setStarted] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [alreadyPlayed, setAlreadyPlayed] = useState(false)

  useEffect(() => {
    if (!player || !currentSegment) return
    const supabase = createClient()

    const check = async () => {
      const { data } = await supabase
        .from('game_plays')
        .select('id')
        .eq('player_id', player.id)
        .eq('game_type', 'speed')
        .eq('segment', currentSegment.id)
        .maybeSingle()

      if (data) setAlreadyPlayed(true)
    }
    check()
  }, [player, currentSegment])

  useEffect(() => {
    if (!started || gameOver) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 100
        if (next <= 0) {
          clearInterval(interval)
          setGameOver(true)
          return 0
        }
        return next
      })
    }, 100)

    return () => clearInterval(interval)
  }, [started, gameOver])

  const submitScore = useCallback(async () => {
    if (!player || !team || !currentSegment) return

    const multiplier = currentSegment.id === 3 ? 2 : 1
    const score = taps * 3 * multiplier

    const supabase = createClient()
    await supabase.from('game_plays').insert({
      player_id: player.id,
      game_type: 'speed',
      segment: currentSegment.id,
      score,
    })

    await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamId: team.id,
        playerId: player.id,
        points: score,
        reason: 'game:speed',
      }),
    })

    toast.success(`+${score} נקודות! ⚡`)
  }, [player, team, currentSegment, taps])

  useEffect(() => {
    if (gameOver && taps > 0) {
      submitScore()
    }
  }, [gameOver])

  const handleTap = () => {
    if (gameOver) return
    vibrateLight()
    playClick()
    if (!started) setStarted(true)
    setTaps((prev) => prev + 1)

    // Haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10)
    }
  }

  if (alreadyPlayed) {
    return (
      <div className="p-4 text-center py-16">
        <p className="text-4xl mb-3">⚡</p>
        <h2 className="text-xl font-bold text-desert-brown mb-2">כבר שיחקתם!</h2>
        <p className="text-sm text-desert-brown/50 mb-4">אפשר לשחק שוב במקטע הבא</p>
        <button type="button" onClick={() => router.back()} className="text-hoopoe font-bold">
          ← חזרה
        </button>
      </div>
    )
  }

  const timerPercent = (timeLeft / GAME_DURATION) * 100

  return (
    <div className="p-4 flex flex-col items-center min-h-[60vh]">
      <div className="w-full"><BackButton href="/game/games" label="משחקים" /></div>
      <div className="w-full">
        <InfoBanner title="איך משחקים מהירות?" icon="⚡" storageKey="speed_instructions_seen" defaultOpen={false}>
          <p>לחצו כמה שיותר מהר ב-20 שניות!</p>
          <p>כל לחיצה = 3 נקודות. ביום האחרון - כפול!</p>
        </InfoBanner>
      </div>
      <div className="flex items-center justify-between w-full mb-4">
        <h1 className="text-xl font-black text-desert-brown">⚡ מהירות</h1>
        <span className="text-sm font-bold text-desert-brown">
          {(timeLeft / 1000).toFixed(1)} שניות
        </span>
      </div>

      {/* Timer bar */}
      <div className="w-full h-2 bg-desert-brown/10 rounded-full overflow-hidden mb-8">
        <div
          className="h-full rounded-full transition-all duration-100"
          style={{
            width: `${timerPercent}%`,
            backgroundColor: timerPercent > 30 ? '#1B998B' : '#C73E4A',
          }}
        />
      </div>

      {!started && !gameOver && (
        <p className="text-lg text-desert-brown/60 mb-8 text-center">
          לחצו על הכפתור כמה שיותר מהר!
        </p>
      )}

      {/* Tap counter */}
      <motion.div
        key={taps}
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
        className="text-5xl font-black text-hoopoe mb-6"
      >
        {taps}
      </motion.div>

      {/* Tap button */}
      {!gameOver ? (
        <motion.button
          type="button"
          onClick={handleTap}
          whileTap={{ scale: 0.9 }}
          className="w-40 h-40 rounded-full bg-accent-red text-white text-5xl
                     shadow-xl flex items-center justify-center
                     active:bg-accent-red/80"
        >
          {started ? '🐦' : '▶️'}
        </motion.button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-4xl mb-2">🎉</p>
          <p className="text-2xl font-black text-desert-brown mb-1">{taps} לחיצות!</p>
          <p className="text-lg text-hoopoe font-bold mb-4">+{taps * 3 * (currentSegment?.id === 3 ? 2 : 1)} נקודות</p>
          <button
            type="button"
            onClick={() => router.push('/game/games')}
            className="px-6 py-2 bg-hoopoe text-white font-bold rounded-xl"
          >
            חזרה למשחקים
          </button>
        </motion.div>
      )}
    </div>
  )
}
