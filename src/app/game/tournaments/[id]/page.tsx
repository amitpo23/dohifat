'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { usePlayer } from '@/hooks/usePlayer'
import { useTeams } from '@/hooks/useTeams'
import { createClient } from '@/lib/supabase/browser'
import { TicTacToeBoard, createTicTacToeState } from '@/components/games/TicTacToeBoard'
import { CheckersBoard, createCheckersState } from '@/components/games/CheckersBoard'
import { BackgammonBoard, createBackgammonState } from '@/components/games/BackgammonBoard'
import { TakiBoard, createTakiState } from '@/components/games/TakiBoard'
import Link from 'next/link'
import { InfoBanner } from '@/components/InfoBanner'

interface GameRoom {
  id: number
  game_type: string
  team_a: number
  team_b: number | null
  current_turn: number | null
  game_state: any
  status: string
  winner_team_id: number | null
}

const GAME_NAMES: Record<string, string> = {
  tictactoe: 'איקס עיגול',
  checkers: 'דמקה',
  backgammon: 'שש בש',
  taki: 'טאקי',
}

export default function GameRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = Number(params.id)
  const { team } = usePlayer()
  const { teams } = useTeams()
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [loading, setLoading] = useState(true)

  const loadRoom = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (data) setRoom(data as GameRoom)
    setLoading(false)
  }, [roomId])

  useEffect(() => {
    loadRoom()
    const supabase = createClient()
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          setRoom(payload.new as GameRoom)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roomId, loadRoom])

  const joinGame = async () => {
    if (!team || !room) return
    const supabase = createClient()

      let initialState: any = {} // eslint-disable-line
    if (room.game_type === 'tictactoe') initialState = createTicTacToeState()
    else if (room.game_type === 'checkers') initialState = createCheckersState(room.team_a, team.id)
    else if (room.game_type === 'backgammon') initialState = createBackgammonState(room.team_a, team.id)
    else if (room.game_type === 'taki') initialState = createTakiState(room.team_a, team.id)

    await supabase
      .from('game_rooms')
      .update({
        team_b: team.id,
        status: 'active',
        current_turn: room.team_a,
        game_state: initialState,
      })
      .eq('id', roomId)
  }

  const handleMove = async (newState: any, nextTurn: number, winner?: number) => {
    if (!room) return
    const supabase = createClient()

    const update: Record<string, unknown> = {
      game_state: newState,
      current_turn: nextTurn,
    }

    if (winner && winner > 0) {
      update.status = 'finished'
      update.winner_team_id = winner
    } else if (winner === 0) {
      update.status = 'finished'
      update.winner_team_id = null
    }

    await supabase.from('game_rooms').update(update).eq('id', roomId)

    if (winner && winner > 0) {
      await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: winner,
          points: 30,
          reason: `tournament_win:${room.game_type}`,
        }),
      })
    }
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-hoopoe border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!room) {
    return (
      <div className="p-4 text-center py-12">
        <p className="text-desert-brown/40">המשחק לא נמצא</p>
        <Link href="/game/tournaments" className="text-hoopoe text-sm font-bold mt-2 block">
          חזרה לטורנירים
        </Link>
      </div>
    )
  }

  const teamAInfo = teams.find((t) => t.id === room.team_a)
  const teamBInfo = teams.find((t) => t.id === room.team_b)
  const myTeamId = team?.id || null
  const isParticipant = myTeamId === room.team_a || myTeamId === room.team_b
  const canJoin = room.status === 'waiting' && myTeamId !== room.team_a && myTeamId !== null

  const currentTurnTeam = teams.find((t) => t.id === room.current_turn)

  return (
    <div className="p-4 flex flex-col items-center">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 w-full">
        <Link href="/game/tournaments" className="text-desert-brown/40 text-sm">← טורנירים</Link>
        <div className="flex-1" />
        <span className="text-lg font-black text-desert-brown">
          {GAME_NAMES[room.game_type] || room.game_type}
        </span>
      </div>

      {room.game_type === 'tictactoe' && (
        <InfoBanner title="חוקי איקס עיגול" icon="❌" storageKey="rules_tictactoe_seen" defaultOpen={false}>
          <p>סמנו 3 ברצף (שורה, עמודה או אלכסון) כדי לנצח!</p>
        </InfoBanner>
      )}
      {room.game_type === 'checkers' && (
        <InfoBanner title="חוקי דמקה" icon="🏁" storageKey="rules_checkers_seen" defaultOpen={false}>
          <p>הזיזו כלים באלכסון. קפצו מעל כלי יריב כדי לאכול אותו.</p>
          <p>הגיעו לשורה האחרונה כדי להפוך למלך!</p>
        </InfoBanner>
      )}
      {room.game_type === 'backgammon' && (
        <InfoBanner title="חוקי שש בש" icon="🎲" storageKey="rules_backgammon_seen" defaultOpen={false}>
          <p>גלגלו קוביות והזיזו את הכלים שלכם. הוציאו את כל הכלים מהלוח ראשונים!</p>
        </InfoBanner>
      )}
      {room.game_type === 'taki' && (
        <InfoBanner title="חוקי טאקי" icon="🃏" storageKey="rules_taki_seen" defaultOpen={false}>
          <p>התאימו צבע או מספר. השתמשו בקלפים מיוחדים כדי לשנות כיוון!</p>
          <p>סיימו את כל הקלפים ראשונים כדי לנצח.</p>
        </InfoBanner>
      )}

      {/* Teams */}
      <div className="flex items-center gap-4 mb-4">
        <div className="text-center">
          <span
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg mx-auto"
            style={{ backgroundColor: teamAInfo?.color_bg || '#D4663C' }}
          >
            {teamAInfo?.emoji}
          </span>
          <span className="text-xs font-bold text-desert-brown block mt-1">{teamAInfo?.name}</span>
        </div>
        <span className="text-lg font-black text-desert-brown/30">VS</span>
        <div className="text-center">
          {teamBInfo ? (
            <>
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg mx-auto"
                style={{ backgroundColor: teamBInfo.color_bg }}
              >
                {teamBInfo.emoji}
              </span>
              <span className="text-xs font-bold text-desert-brown block mt-1">{teamBInfo.name}</span>
            </>
          ) : (
            <span className="w-10 h-10 rounded-full flex items-center justify-center text-lg mx-auto bg-desert-brown/10">
              ?
            </span>
          )}
        </div>
      </div>

      {/* Status */}
      {room.status === 'waiting' && (
        <div className="text-center mb-4">
          {canJoin ? (
            <button
              type="button"
              onClick={joinGame}
              className="px-6 py-3 bg-hoopoe text-white font-bold rounded-xl text-lg shadow-md animate-pulse"
            >
              הצטרפו למשחק!
            </button>
          ) : (
            <p className="text-sm text-desert-brown/50 animate-pulse">ממתינים ליריב... 🕐</p>
          )}
        </div>
      )}

      {room.status === 'active' && currentTurnTeam && (
        <div className={`text-center mb-4 px-4 py-2 rounded-xl ${
          room.current_turn === myTeamId ? 'bg-hoopoe/10' : 'bg-desert-brown/5'
        }`}>
          <span className="text-sm font-bold" style={{ color: currentTurnTeam.color_bg }}>
            {room.current_turn === myTeamId ? 'תורכם!' : `תור ${currentTurnTeam.emoji} ${currentTurnTeam.name}`}
          </span>
        </div>
      )}

      {room.status === 'finished' && (
        <div className="text-center mb-4 p-4 bg-accent-gold/10 rounded-xl">
          {room.winner_team_id ? (
            <>
              <p className="text-2xl mb-1">🏆</p>
              <p className="font-black text-desert-brown">
                {teams.find((t) => t.id === room.winner_team_id)?.emoji}{' '}
                {teams.find((t) => t.id === room.winner_team_id)?.name} ניצחו!
              </p>
              <p className="text-xs text-desert-brown/40 mt-1">+30 נקודות</p>
            </>
          ) : (
            <>
              <p className="text-2xl mb-1">🤝</p>
              <p className="font-black text-desert-brown">תיקו!</p>
            </>
          )}
          <Link
            href="/game/tournaments"
            className="inline-block mt-3 px-4 py-2 bg-hoopoe text-white font-bold rounded-xl text-sm"
          >
            משחק חדש
          </Link>
        </div>
      )}

      {/* Game Board */}
      {room.status === 'active' && teamAInfo && teamBInfo && (
        <div className="w-full flex justify-center">
          {room.game_type === 'tictactoe' && (
            <TicTacToeBoard
              gameState={room.game_state}
              teamA={room.team_a}
              teamB={room.team_b!}
              teamAInfo={{ emoji: teamAInfo.emoji, color: teamAInfo.color_bg }}
              teamBInfo={{ emoji: teamBInfo.emoji, color: teamBInfo.color_bg }}
              currentTurn={room.current_turn!}
              myTeamId={myTeamId}
              onMove={handleMove}
            />
          )}
          {room.game_type === 'checkers' && (
            <CheckersBoard
              gameState={room.game_state}
              teamA={room.team_a}
              teamB={room.team_b!}
              teamAInfo={{ emoji: teamAInfo.emoji, color: teamAInfo.color_bg }}
              teamBInfo={{ emoji: teamBInfo.emoji, color: teamBInfo.color_bg }}
              currentTurn={room.current_turn!}
              myTeamId={myTeamId}
              onMove={handleMove}
            />
          )}
          {room.game_type === 'backgammon' && (
            <BackgammonBoard
              gameState={room.game_state}
              teamA={room.team_a}
              teamB={room.team_b!}
              teamAInfo={{ emoji: teamAInfo.emoji, color: teamAInfo.color_bg }}
              teamBInfo={{ emoji: teamBInfo.emoji, color: teamBInfo.color_bg }}
              currentTurn={room.current_turn!}
              myTeamId={myTeamId}
              onMove={handleMove}
            />
          )}
          {room.game_type === 'taki' && (
            <TakiBoard
              gameState={room.game_state}
              teamA={room.team_a}
              teamB={room.team_b!}
              teamAInfo={{ emoji: teamAInfo.emoji, color: teamAInfo.color_bg }}
              teamBInfo={{ emoji: teamBInfo.emoji, color: teamBInfo.color_bg }}
              currentTurn={room.current_turn!}
              myTeamId={myTeamId}
              onMove={handleMove}
            />
          )}
        </div>
      )}
    </div>
  )
}
