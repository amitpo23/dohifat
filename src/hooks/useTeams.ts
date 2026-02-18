'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/browser'
import type { Team } from '@/lib/types'

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    const fetchTeams = async () => {
      const { data } = await supabase
        .from('teams')
        .select('*')
        .order('score', { ascending: false })

      if (data) {
        setTeams(data as Team[])
      }
      setLoading(false)
    }

    fetchTeams()

    const channel = supabase
      .channel('teams-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'teams' },
        (payload) => {
          setTeams((prev) => {
            const updated = prev.map((t) =>
              t.id === payload.new.id ? (payload.new as Team) : t
            )
            return updated.sort((a, b) => b.score - a.score)
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { teams, loading }
}
