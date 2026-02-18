'use client'

import {
  createContext,
  useCallback,
  useEffect,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/browser'
import type { Player, Team } from '@/lib/types'

interface PlayerContextValue {
  player: Player | null
  team: Team | null
  isLoading: boolean
  isRegistered: boolean
  register: (name: string, teamId: number) => Promise<void>
}

export const PlayerContext = createContext<PlayerContextValue>({
  player: null,
  team: null,
  isLoading: true,
  isRegistered: false,
  register: async () => {},
})

const DEVICE_ID_KEY = 'duchifatiot_device_id'

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return ''
  let deviceId = localStorage.getItem(DEVICE_ID_KEY)
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
  }
  return deviceId
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const deviceId = getOrCreateDeviceId()
    if (!deviceId) {
      setIsLoading(false)
      return
    }

    const loadPlayer = async () => {
      const { data: playerData } = await supabase
        .from('players')
        .select('*')
        .eq('device_id', deviceId)
        .maybeSingle()

      if (playerData) {
        setPlayer(playerData as Player)

        const { data: teamData } = await supabase
          .from('teams')
          .select('*')
          .eq('id', playerData.team_id)
          .single()

        if (teamData) {
          setTeam(teamData as Team)
        }
      }

      setIsLoading(false)
    }

    loadPlayer()
  }, [])

  const register = useCallback(async (name: string, teamId: number) => {
    const deviceId = getOrCreateDeviceId()

    const { data: playerData, error } = await supabase
      .from('players')
      .insert({
        name,
        team_id: teamId,
        device_id: deviceId,
      })
      .select()
      .single()

    if (error) throw error

    setPlayer(playerData as Player)

    const { data: teamData } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (teamData) {
      setTeam(teamData as Team)
    }
  }, [])

  return (
    <PlayerContext.Provider
      value={{
        player,
        team,
        isLoading,
        isRegistered: !!player,
        register,
      }}
    >
      {children}
    </PlayerContext.Provider>
  )
}
