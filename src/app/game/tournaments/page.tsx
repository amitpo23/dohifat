'use client'

import { useState, useEffect } from 'react'
import { usePlayer } from '@/hooks/usePlayer'
import { useTeams } from '@/hooks/useTeams'
import { createClient } from '@/lib/supabase/browser'
import Link from 'next/link'
import { InfoBanner } from '@/components/InfoBanner'

interface GameRoom {
  id: number
  game_type: string
  team_a: number
  team_b: number | null
  current_turn: number | null
  status: string
  winner_team_id: number | null
  created_at: string
}

const GAME_TYPES = [
  { type: 'tictactoe', name: 'איקס עיגול', icon: '❌⭕', description: '3 ברצף מנצח!' },
  { type: 'checkers', name: 'דמקה', icon: '🏁', description: 'משחק דמקה קלאסי' },
  { type: 'backgammon', name: 'שש בש', icon: '🎲', description: 'גלגלו קוביות ונצחו!' },
  { type: 'taki', name: 'טאקי', icon: '🃏', description: 'משחק הקלפים הישראלי!' },
]

export default function TournamentsPage() {
  const { team } = usePlayer()
  const { teams } = useTeams()
  const [rooms, setRooms] = useState<GameRoom[]>([])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    const loadRooms = async () => {
      const { data } = await supabase
        .from('game_rooms')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (data) setRooms(data as GameRoom[])
    }

    loadRooms()

    const channel = supabase
      .channel('rooms-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_rooms' },
        () => { loadRooms() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const createRoom = async (gameType: string) => {
    if (!team) return
    setCreating(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('game_rooms')
      .insert({
        game_type: gameType,
        team_a: team.id,
        status: 'waiting',
        game_state: {},
      })
      .select()
      .single()

    setCreating(false)
    if (data) {
      window.location.href = `/game/tournaments/${data.id}`
    }
  }

  const joinRoom = async (roomId: number) => {
    if (!team) return
    const supabase = createClient()
    await supabase
      .from('game_rooms')
      .update({ team_b: team.id, status: 'active', current_turn: rooms.find((r) => r.id === roomId)?.team_a })
      .eq('id', roomId)

    window.location.href = `/game/tournaments/${roomId}`
  }

  const getTeamInfo = (teamId: number | null) => {
    const t = teams.find((t) => t.id === teamId)
    return t ? `${t.emoji} ${t.name}` : '?'
  }

  const getGameInfo = (type: string) => GAME_TYPES.find((g) => g.type === type)

  const activeRooms = rooms.filter((r) => r.status === 'active')
  const waitingRooms = rooms.filter((r) => r.status === 'waiting')
  const finishedRooms = rooms.filter((r) => r.status === 'finished').slice(0, 10)

  return (
    <div className="p-4">
      <InfoBanner title="איך משחקים טורנירים?" icon="🏆" storageKey="tournaments_instructions_seen">
        <p>צרו חדר משחק וחכו שקבוצה אחרת תצטרף.</p>
        <p>שחקו בתורות - <strong>הקבוצה המנצחת מקבלת 30 נקודות!</strong></p>
        <p>ניתן לשחק באיקס עיגול, דמקה, שש בש וטאקי.</p>
      </InfoBanner>
      <h1 className="text-xl font-black text-desert-brown flex items-center gap-2 mb-4">
        🏟️ טורנירים
      </h1>

      {/* Create new game */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        {GAME_TYPES.map((game) => (
          <button
            key={game.type}
            type="button"
            onClick={() => createRoom(game.type)}
            disabled={creating || !team}
            className="p-3 bg-white rounded-xl shadow-sm text-center transition-all active:scale-95 disabled:opacity-40"
          >
            <span className="text-2xl block mb-1">{game.icon}</span>
            <span className="text-sm font-bold text-desert-brown block">{game.name}</span>
            <span className="text-[10px] text-desert-brown/40">{game.description}</span>
          </button>
        ))}
      </div>

      {/* Waiting rooms */}
      {waitingRooms.length > 0 && (
        <section className="mb-4">
          <h2 className="text-base font-bold text-desert-brown mb-2">⏳ ממתינים לשחקנים</h2>
          <div className="space-y-2">
            {waitingRooms.map((room) => {
              const game = getGameInfo(room.game_type)
              const isMyRoom = room.team_a === team?.id
              return (
                <div key={room.id} className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm">
                  <span className="text-xl">{game?.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-desert-brown">{game?.name}</p>
                    <p className="text-xs text-desert-brown/40">{getTeamInfo(room.team_a)} ממתינים...</p>
                  </div>
                  {isMyRoom ? (
                    <Link
                      href={`/game/tournaments/${room.id}`}
                      className="px-3 py-1.5 bg-hoopoe/10 text-hoopoe text-xs font-bold rounded-xl"
                    >
                      ממתין...
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => joinRoom(room.id)}
                      className="px-3 py-1.5 bg-accent-teal text-white text-xs font-bold rounded-xl"
                    >
                      הצטרפו!
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Active games */}
      {activeRooms.length > 0 && (
        <section className="mb-4">
          <h2 className="text-base font-bold text-desert-brown mb-2">🔴 משחקים פעילים</h2>
          <div className="space-y-2">
            {activeRooms.map((room) => {
              const game = getGameInfo(room.game_type)
              const isMine = room.team_a === team?.id || room.team_b === team?.id
              const isMyTurn = room.current_turn === team?.id
              return (
                <Link
                  key={room.id}
                  href={`/game/tournaments/${room.id}`}
                  className={`flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm ${
                    isMyTurn ? 'border-2 border-hoopoe' : ''
                  }`}
                >
                  <span className="text-xl">{game?.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-desert-brown">{game?.name}</p>
                    <p className="text-xs text-desert-brown/40">
                      {getTeamInfo(room.team_a)} vs {getTeamInfo(room.team_b)}
                    </p>
                  </div>
                  {isMine && isMyTurn && (
                    <span className="px-2 py-1 bg-hoopoe text-white text-xs font-bold rounded-lg animate-pulse">
                      תורכם!
                    </span>
                  )}
                  {isMine && !isMyTurn && (
                    <span className="px-2 py-1 bg-desert-brown/10 text-desert-brown/50 text-xs font-bold rounded-lg">
                      ממתין
                    </span>
                  )}
                  {!isMine && (
                    <span className="text-xs text-desert-brown/30">צפייה</span>
                  )}
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Finished games */}
      {finishedRooms.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-desert-brown mb-2">✅ משחקים שהסתיימו</h2>
          <div className="space-y-2">
            {finishedRooms.map((room) => {
              const game = getGameInfo(room.game_type)
              return (
                <div key={room.id} className="flex items-center gap-3 p-3 bg-white/50 rounded-xl">
                  <span className="text-xl">{game?.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm text-desert-brown/60">
                      {getTeamInfo(room.team_a)} vs {getTeamInfo(room.team_b)}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-hoopoe">
                    {room.winner_team_id ? `🏆 ${getTeamInfo(room.winner_team_id)}` : 'תיקו'}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {rooms.length === 0 && (
        <div className="text-center py-12 text-desert-brown/40">
          <p className="text-4xl mb-2">🏟️</p>
          <p className="text-sm">אין עדיין משחקים. צרו חדש!</p>
        </div>
      )}
    </div>
  )
}
