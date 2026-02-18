'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/browser'

interface TimerSettings {
  start_time: string | null
  end_time: string | null
  active: boolean
}

interface SurpriseGameSettings {
  active: boolean
  game_type: string | null
  room_id: number | null
  triggered_at: string | null
}

interface GameSettings {
  timer: TimerSettings
  surprise_game: SurpriseGameSettings
}

const DEFAULT_SETTINGS: GameSettings = {
  timer: { start_time: null, end_time: null, active: false },
  surprise_game: { active: false, game_type: null, room_id: null, triggered_at: null },
}

export function useGameSettings() {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    const fetchSettings = async () => {
      const { data } = await supabase.from('game_settings').select('*')
      if (data) {
        const parsed = { ...DEFAULT_SETTINGS }
        for (const row of data) {
          if (row.key === 'timer') parsed.timer = row.value as TimerSettings
          if (row.key === 'surprise_game') parsed.surprise_game = row.value as SurpriseGameSettings
        }
        setSettings(parsed)
      }
      setLoading(false)
    }

    fetchSettings()

    const channel = supabase
      .channel('game-settings-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_settings' },
        (payload) => {
          const row = payload.new as { key: string; value: unknown }
          setSettings((prev) => {
            if (row.key === 'timer') return { ...prev, timer: row.value as TimerSettings }
            if (row.key === 'surprise_game') return { ...prev, surprise_game: row.value as SurpriseGameSettings }
            return prev
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { settings, loading }
}

export type { TimerSettings, SurpriseGameSettings, GameSettings }
