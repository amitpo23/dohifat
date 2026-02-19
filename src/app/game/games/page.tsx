'use client'

import Link from 'next/link'
import { usePlayer } from '@/hooks/usePlayer'
import { useSegment } from '@/hooks/useSegment'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { InfoBanner } from '@/components/InfoBanner'

const MINI_GAMES = [
  {
    slug: 'memory',
    name: 'משחק זיכרון',
    icon: '🧩',
    description: 'מצאו זוגות של קלפים תואמים',
    color: '#7B2D8E',
  },
  {
    slug: 'speed',
    name: 'מהירות לחיצה',
    icon: '⚡',
    description: '20 שניות - כמה לחיצות תצליחו?',
    color: '#C73E4A',
  },
  {
    slug: 'wheel',
    name: 'גלגל המזל',
    icon: '🎡',
    description: 'סובבו את הגלגל וזכו בנקודות!',
    color: '#D4943C',
  },
]

const AI_ACTIVITIES = [
  {
    href: '/game/video',
    name: 'יצירת סרטון AI',
    icon: '🎬',
    description: 'העלו תמונה וצרו סרטון מדהים!',
    color: '#2D5DA1',
  },
  {
    href: '/game/imagine',
    name: 'יצירת תמונה AI',
    icon: '🎨',
    description: 'כתבו תיאור או העלו תמונה ו-AI ייצור!',
    color: '#7B2D8E',
  },
  {
    href: '/game/faceswap',
    name: 'החלפת פנים',
    icon: '🎭',
    description: 'שימו את הפנים שלכם על דמויות מפורסמות!',
    color: '#D4663C',
  },
  {
    href: '/game/style',
    name: 'העברת סגנון',
    icon: '🖼️',
    description: 'הפכו תמונה ליצירת אמנות!',
    color: '#2D8E5D',
  },
  {
    href: '/game/background',
    name: 'החלפת רקע',
    icon: '🏝️',
    description: 'החליפו רקע לתמונה שלכם!',
    color: '#2D5DA1',
  },
  {
    href: '/game/photobooth',
    name: 'פוטובוט',
    icon: '📸',
    description: 'אפקטים מטורפים לסלפי!',
    color: '#D4943C',
  },
]

export default function GamesPage() {
  const { player } = usePlayer()
  const { currentSegment } = useSegment()
  const [playedGames, setPlayedGames] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!player || !currentSegment) return
    const supabase = createClient()

    const loadPlayed = async () => {
      const { data } = await supabase
        .from('game_plays')
        .select('game_type')
        .eq('player_id', player.id)
        .eq('segment', currentSegment.id)

      if (data) {
        setPlayedGames(new Set(data.map((g) => g.game_type as string)))
      }
    }

    loadPlayed()
  }, [player, currentSegment])

  const isLastDay = currentSegment?.id === 3

  return (
    <div className="p-4">
      <InfoBanner title="איך משחקים?" icon="🎮" storageKey="games_instructions_seen">
        <p><strong>משחקונים:</strong> שחקו פעם אחת ביום וצברו נקודות.</p>
        <p><strong>טורנירים:</strong> קבוצה נגד קבוצה! המנצח מקבל 30 נקודות.</p>
        <p>ביום האחרון - <strong>כפול נקודות!</strong></p>
      </InfoBanner>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-black text-desert-brown flex items-center gap-2">
          🎮 משחקים
        </h1>
        {isLastDay && (
          <span className="text-xs font-bold px-2 py-1 rounded-full bg-accent-red/10 text-accent-red">
            x2 נקודות!
          </span>
        )}
      </div>

      <div className="space-y-3">
        {MINI_GAMES.map((game) => {
          const isPlayed = playedGames.has(game.slug)

          return (
            <Link
              key={game.slug}
              href={`/game/games/${game.slug}`}
              className={`
                block p-4 rounded-2xl bg-white shadow-sm transition-all
                ${isPlayed ? 'opacity-50' : 'hover:shadow-md active:scale-[0.98]'}
              `}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{game.icon}</span>
                <div className="flex-1">
                  <h3 className="font-bold text-desert-brown">{game.name}</h3>
                  <p className="text-xs text-desert-brown/50">{game.description}</p>
                </div>
                {isPlayed ? (
                  <span className="text-sm text-desert-brown/30">שוחק ✓</span>
                ) : (
                  <span
                    className="px-3 py-1 rounded-xl text-white text-xs font-bold"
                    style={{ backgroundColor: game.color }}
                  >
                    שחק!
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Tournaments */}
      <h2 className="text-lg font-black text-desert-brown flex items-center gap-2 mt-8 mb-3">
        🏟️ טורנירים
      </h2>
      <Link
        href="/game/tournaments"
        className="block p-4 rounded-2xl bg-gradient-to-r from-hoopoe to-accent-gold shadow-md transition-all hover:shadow-lg active:scale-[0.98] mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="text-3xl">🎮</div>
          <div className="flex-1">
            <h3 className="font-bold text-white">דמקה · איקס עיגול · שש בש · טאקי</h3>
            <p className="text-xs text-white/70">שחקו נגד קבוצות אחרות בזמן אמת!</p>
          </div>
          <span className="px-3 py-1.5 bg-white/20 text-white text-xs font-bold rounded-xl">
            שחק!
          </span>
        </div>
      </Link>

      {/* AI Activities */}
      <h2 className="text-lg font-black text-desert-brown flex items-center gap-2 mt-8 mb-3">
        🤖 פעילויות AI
      </h2>
      <div className="space-y-3">
        {AI_ACTIVITIES.map((activity) => (
          <Link
            key={activity.href}
            href={activity.href}
            className="block p-4 rounded-2xl bg-white shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{activity.icon}</span>
              <div className="flex-1">
                <h3 className="font-bold text-desert-brown">{activity.name}</h3>
                <p className="text-xs text-desert-brown/50">{activity.description}</p>
              </div>
              <span
                className="px-3 py-1 rounded-xl text-white text-xs font-bold"
                style={{ backgroundColor: activity.color }}
              >
                נסו!
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
