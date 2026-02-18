'use client'

import { useState, useEffect } from 'react'
import { useGameSettings } from '@/hooks/useGameSettings'
import { vibrateMedium } from '@/lib/haptics'
import { playScore } from '@/lib/sounds'
import Link from 'next/link'

const GAME_NAMES: Record<string, string> = {
  tictactoe: 'איקס עיגול',
  checkers: 'דמקה',
  backgammon: 'שש בש',
  taki: 'טאקי',
}

const GAME_ICONS: Record<string, string> = {
  tictactoe: '❌⭕',
  checkers: '🏁',
  backgammon: '🎲',
  taki: '🃏',
}

export function SurpriseGamePopup() {
  const { settings } = useGameSettings()
  const [dismissed, setDismissed] = useState<string | null>(null)
  const [animating, setAnimating] = useState(false)

  const surprise = settings.surprise_game
  const isActive = surprise.active && surprise.room_id && surprise.triggered_at

  useEffect(() => {
    if (isActive && surprise.triggered_at !== dismissed) {
      setAnimating(true)
      vibrateMedium()
      playScore()
    }
  }, [isActive, surprise.triggered_at, dismissed])

  if (!isActive || surprise.triggered_at === dismissed) return null

  const gameType = surprise.game_type || 'tictactoe'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 animate-in fade-in p-4">
      <div
        className={`bg-white rounded-3xl shadow-2xl p-6 max-w-[340px] w-full text-center transition-all ${
          animating ? 'animate-bounce' : ''
        }`}
        onAnimationEnd={() => setAnimating(false)}
      >
        <div className="text-6xl mb-3">
          {GAME_ICONS[gameType] || '🎮'}
        </div>
        <h2 className="text-2xl font-black text-desert-brown mb-1">
          משחק הפתעה!
        </h2>
        <p className="text-lg font-bold text-hoopoe mb-1">
          {GAME_NAMES[gameType] || gameType}
        </p>
        <p className="text-sm text-desert-brown/60 mb-5">
          האדמין הפעיל משחק הפתעה! מהרו להצטרף
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href={`/game/tournaments/${surprise.room_id}`}
            onClick={() => setDismissed(surprise.triggered_at)}
            className="block w-full px-6 py-3 bg-hoopoe text-white font-black rounded-2xl text-lg shadow-md transition-all active:scale-95"
          >
            שחקו עכשיו!
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(surprise.triggered_at)}
            className="text-sm text-desert-brown/40 font-bold py-2"
          >
            אחר כך
          </button>
        </div>
      </div>
    </div>
  )
}
