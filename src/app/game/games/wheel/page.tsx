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

const SLICES = [5, 10, 15, 20, 25, 30, 40, 50]
const SLICE_COLORS = ['#D4663C', '#1B998B', '#C73E4A', '#7B2D8E', '#D4943C', '#2D5DA1', '#D4663C', '#1B998B']
const SLICE_LABELS = ['5', '10', '15', '20', '25', '30', '🎂 40', '🐦 50']

export default function WheelGame() {
  const router = useRouter()
  const { player, team } = usePlayer()
  const { currentSegment } = useSegment()
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [rotation, setRotation] = useState(0)
  const [alreadyPlayed, setAlreadyPlayed] = useState(false)

  useEffect(() => {
    if (!player || !currentSegment) return
    const supabase = createClient()

    const check = async () => {
      const { data } = await supabase
        .from('game_plays')
        .select('id')
        .eq('player_id', player.id)
        .eq('game_type', 'wheel')
        .eq('segment', currentSegment.id)
        .maybeSingle()

      if (data) setAlreadyPlayed(true)
    }
    check()
  }, [player, currentSegment])

  const handleSpin = async () => {
    if (spinning || result !== null || !player || !team || !currentSegment) return
    setSpinning(true)

    const randomIndex = Math.floor(Math.random() * SLICES.length)
    const sliceAngle = 360 / SLICES.length
    const targetAngle = 360 * 5 + (360 - randomIndex * sliceAngle - sliceAngle / 2)

    setRotation(targetAngle)

    setTimeout(async () => {
      const points = SLICES[randomIndex]
      const multiplier = currentSegment.id === 3 ? 2 : 1
      const finalPoints = points * multiplier

      setResult(finalPoints)
      setSpinning(false)

      const supabase = createClient()
      await supabase.from('game_plays').insert({
        player_id: player.id,
        game_type: 'wheel',
        segment: currentSegment.id,
        score: finalPoints,
      })

      await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: team.id,
          playerId: player.id,
          points: finalPoints,
          reason: 'game:wheel',
        }),
      })

      toast.success(`+${finalPoints} נקודות! 🎡`)
    }, 4000)
  }

  if (alreadyPlayed) {
    return (
      <div className="p-4 text-center py-16">
        <p className="text-4xl mb-3">🎡</p>
        <h2 className="text-xl font-bold text-desert-brown mb-2">כבר סובבתם!</h2>
        <p className="text-sm text-desert-brown/50 mb-4">אפשר לסובב שוב במקטע הבא</p>
        <button type="button" onClick={() => router.back()} className="text-hoopoe font-bold">
          ← חזרה
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 flex flex-col items-center">
      <div className="w-full"><BackButton href="/game/games" label="משחקים" /></div>
      <InfoBanner title="איך משחקים גלגל המזל?" icon="🎡" storageKey="wheel_instructions_seen" defaultOpen={false}>
        <p>סובבו את הגלגל ותזכו בנקודות!</p>
        <p>בין 5 ל-50 נקודות. ביום האחרון - כפול!</p>
      </InfoBanner>
      <h1 className="text-xl font-black text-desert-brown mb-6">🎡 גלגל המזל</h1>

      {/* Pointer */}
      <div className="text-3xl mb-2">▼</div>

      {/* Wheel */}
      <div className="relative w-72 h-72 mb-8">
        <motion.div
          className="w-full h-full rounded-full overflow-hidden relative"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : undefined,
          }}
        >
          {/* SVG Wheel */}
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {SLICES.map((_, i) => {
              const angle = (360 / SLICES.length) * i
              const nextAngle = (360 / SLICES.length) * (i + 1)
              const startRad = (angle * Math.PI) / 180
              const endRad = (nextAngle * Math.PI) / 180
              const x1 = 100 + 100 * Math.cos(startRad)
              const y1 = 100 + 100 * Math.sin(startRad)
              const x2 = 100 + 100 * Math.cos(endRad)
              const y2 = 100 + 100 * Math.sin(endRad)
              const midRad = ((angle + nextAngle) / 2 * Math.PI) / 180
              const textX = 100 + 60 * Math.cos(midRad)
              const textY = 100 + 60 * Math.sin(midRad)

              return (
                <g key={i}>
                  <path
                    d={`M100,100 L${x1},${y1} A100,100 0 0,1 ${x2},${y2} Z`}
                    fill={SLICE_COLORS[i]}
                  />
                  <text
                    x={textX}
                    y={textY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontWeight="bold"
                    fontSize="12"
                  >
                    {SLICE_LABELS[i]}
                  </text>
                </g>
              )
            })}
            <title>גלגל המזל</title>
          </svg>
        </motion.div>
      </div>

      {result !== null ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <p className="text-4xl font-black text-hoopoe mb-2">+{result}</p>
          <p className="text-lg text-desert-brown font-bold mb-4">!נקודות</p>
          <button
            type="button"
            onClick={() => router.push('/game/games')}
            className="px-6 py-2 bg-hoopoe text-white font-bold rounded-xl"
          >
            חזרה למשחקים
          </button>
        </motion.div>
      ) : (
        <button
          type="button"
          onClick={handleSpin}
          disabled={spinning}
          className={`
            px-8 py-4 rounded-2xl text-white text-xl font-black shadow-lg
            transition-all
            ${spinning ? 'bg-desert-brown/40' : 'bg-hoopoe hover:bg-hoopoe/90 active:scale-95'}
          `}
        >
          {spinning ? '...מסתובב' : '!סובבו את הגלגל'}
        </button>
      )}
    </div>
  )
}
