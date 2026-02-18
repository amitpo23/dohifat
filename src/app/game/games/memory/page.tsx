'use client'

import { useState, useEffect } from 'react'
import { usePlayer } from '@/hooks/usePlayer'
import { useSegment } from '@/hooks/useSegment'
import { createClient } from '@/lib/supabase/browser'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { BackButton } from '@/components/BackButton'
import { InfoBanner } from '@/components/InfoBanner'

const EMOJIS = ['🐦', '🦊', '🦎', '🌵', '🦅', '🐫', '🦂', '🏜️']

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export default function MemoryGame() {
  const router = useRouter()
  const { player, team } = usePlayer()
  const { currentSegment } = useSegment()
  const [cards, setCards] = useState<string[]>([])
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [moves, setMoves] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [alreadyPlayed, setAlreadyPlayed] = useState(false)

  useEffect(() => {
    setCards(shuffleArray([...EMOJIS, ...EMOJIS]))
  }, [])

  useEffect(() => {
    if (!player || !currentSegment) return
    const supabase = createClient()

    const check = async () => {
      const { data } = await supabase
        .from('game_plays')
        .select('id')
        .eq('player_id', player.id)
        .eq('game_type', 'memory')
        .eq('segment', currentSegment.id)
        .maybeSingle()

      if (data) setAlreadyPlayed(true)
    }
    check()
  }, [player, currentSegment])

  useEffect(() => {
    if (matched.size === EMOJIS.length * 2 && cards.length > 0) {
      handleGameOver()
    }
  }, [matched])

  const handleFlip = (index: number) => {
    if (flipped.length === 2 || flipped.includes(index) || matched.has(index)) return

    const newFlipped = [...flipped, index]
    setFlipped(newFlipped)

    if (newFlipped.length === 2) {
      setMoves((prev) => prev + 1)

      if (cards[newFlipped[0]] === cards[newFlipped[1]]) {
        setMatched((prev) => new Set([...prev, newFlipped[0], newFlipped[1]]))
        setFlipped([])
      } else {
        setTimeout(() => setFlipped([]), 800)
      }
    }
  }

  const handleGameOver = async () => {
    if (gameOver || !player || !team || !currentSegment) return
    setGameOver(true)

    const score = Math.max(10, 50 - moves * 2)
    const multiplier = currentSegment.id === 3 ? 2 : 1
    const finalScore = score * multiplier

    const supabase = createClient()
    await supabase.from('game_plays').insert({
      player_id: player.id,
      game_type: 'memory',
      segment: currentSegment.id,
      score: finalScore,
    })

    await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamId: team.id,
        playerId: player.id,
        points: finalScore,
        reason: 'game:memory',
      }),
    })

    toast.success(`+${finalScore} נקודות! 🧩`)
  }

  if (alreadyPlayed) {
    return (
      <div className="p-4 text-center py-16">
        <p className="text-4xl mb-3">🧩</p>
        <h2 className="text-xl font-bold text-desert-brown mb-2">כבר שיחקתם!</h2>
        <p className="text-sm text-desert-brown/50 mb-4">אפשר לשחק שוב במקטע הבא</p>
        <button type="button" onClick={() => router.back()} className="text-hoopoe font-bold">
          ← חזרה
        </button>
      </div>
    )
  }

  return (
    <div className="p-4">
      <BackButton href="/game/games" label="משחקים" />
      <InfoBanner title="איך משחקים זיכרון?" icon="🧩" storageKey="memory_instructions_seen" defaultOpen={false}>
        <p>מצאו זוגות של קלפים תואמים.</p>
        <p>פחות מהלכים = יותר נקודות! מקסימום 50 נק&apos;.</p>
      </InfoBanner>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-black text-desert-brown">🧩 זיכרון</h1>
        <span className="text-sm text-desert-brown/50">{moves} מהלכים</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {cards.map((emoji, index) => {
          const isFlipped = flipped.includes(index) || matched.has(index)

          return (
            <motion.button
              key={index}
              type="button"
              onClick={() => handleFlip(index)}
              className={`
                aspect-square rounded-xl text-2xl flex items-center justify-center
                font-bold transition-all
                ${isFlipped ? 'bg-white shadow-md' : 'bg-hoopoe/20 hover:bg-hoopoe/30'}
                ${matched.has(index) ? 'opacity-50' : ''}
              `}
              whileTap={{ scale: 0.95 }}
            >
              {isFlipped ? emoji : '?'}
            </motion.button>
          )
        })}
      </div>

      {gameOver && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-center"
        >
          <p className="text-2xl font-black text-desert-brown mb-2">🎉 כל הכבוד!</p>
          <p className="text-sm text-desert-brown/60 mb-4">סיימתם ב-{moves} מהלכים</p>
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
