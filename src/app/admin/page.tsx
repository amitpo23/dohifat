'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { useTeams } from '@/hooks/useTeams'
import { useGameSettings } from '@/hooks/useGameSettings'
import type { Player, ScoreEntry, TriviaQuestion, Photo, Challenge } from '@/lib/types'
import { SEGMENTS } from '@/lib/schedule'
import { generateQRSvg } from '@/lib/qr'
import { SectionHeader, StatCard } from './components/SectionHeader'
import { AdminChallenges } from './components/AdminChallenges'
import { AdminTrivia } from './components/AdminTrivia'

interface TeamEdit {
  name: string
  emoji: string
  color_bg: string
  color_light: string
}

interface WinnerRanking {
  team_id: number
  name: string
  emoji: string
  score: number
  completions: number
  trivia_correct: number
  photos: number
  active_players: number
  rank: number
}

const SURPRISE_GAME_TYPES = [
  { type: 'tictactoe', name: 'איקס עיגול', icon: '❌⭕' },
  { type: 'checkers', name: 'דמקה', icon: '🏁' },
  { type: 'backgammon', name: 'שש בש', icon: '🎲' },
  { type: 'taki', name: 'טאקי', icon: '🃏' },
]

export default function AdminPage() {
  const { teams } = useTeams()
  const { settings: gameSettings } = useGameSettings()
  const [players, setPlayers] = useState<Player[]>([])
  const [scoreLogs, setScoreLogs] = useState<ScoreEntry[]>([])
  const [photos, setPhotos] = useState<(Photo & { player?: { name: string } })[]>([])
  const [triviaQuestions, setTriviaQuestions] = useState<TriviaQuestion[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [completionCount, setCompletionCount] = useState(0)
  const [gamePlayCount, setGamePlayCount] = useState(0)
  const [messageCount, setMessageCount] = useState(0)
  const [triviaAnswerCount, setTriviaAnswerCount] = useState(0)

  // Timer state
  const [timerStart, setTimerStart] = useState('')
  const [timerEnd, setTimerEnd] = useState('')

  // Surprise game state
  const [surpriseGameType, setSurpriseGameType] = useState('tictactoe')
  const [triggeringSurprise, setTriggeringSurprise] = useState(false)

  // Team editing state
  const [teamEdits, setTeamEdits] = useState<Record<number, TeamEdit>>({})
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null)

  // Score adjustment state
  const [scoreInputs, setScoreInputs] = useState<Record<number, { points: string; reason: string }>>({})

  // Winner preview
  const [rankings, setRankings] = useState<WinnerRanking[]>([])

  // Broadcast
  const [broadcastText, setBroadcastText] = useState('')

  // Active section (for mobile-friendly navigation)
  const [activeSection, setActiveSection] = useState<string | null>(null)

  // QR code SVGs per team
  const [qrSvgs, setQrSvgs] = useState<Record<number, string>>({})

  useEffect(() => {
    const supabase = createClient()

    const loadData = async () => {
      const [playersRes, logsRes, photosRes, triviaRes, completionsRes, gamePlaysRes, challengesRes, messagesRes, triviaAnswersRes] = await Promise.all([
        supabase.from('players').select('*').order('created_at', { ascending: false }),
        supabase.from('score_log').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('photos').select('*, player:players(name)').order('created_at', { ascending: false }).limit(30),
        supabase.from('trivia_questions').select('*').order('id'),
        supabase.from('completions').select('id', { count: 'exact', head: true }),
        supabase.from('game_plays').select('id', { count: 'exact', head: true }),
        supabase.from('challenges').select('*').order('segment').order('sort_order'),
        supabase.from('game_messages').select('id', { count: 'exact', head: true }),
        supabase.from('trivia_answers').select('id', { count: 'exact', head: true }),
      ])

      if (playersRes.data) setPlayers(playersRes.data as Player[])
      if (logsRes.data) setScoreLogs(logsRes.data as ScoreEntry[])
      if (photosRes.data) setPhotos(photosRes.data as (Photo & { player?: { name: string } })[])
      if (triviaRes.data) setTriviaQuestions(triviaRes.data as TriviaQuestion[])
      if (challengesRes.data) setChallenges(challengesRes.data as Challenge[])
      if (completionsRes.count !== null) setCompletionCount(completionsRes.count)
      if (gamePlaysRes.count !== null) setGamePlayCount(gamePlaysRes.count)
      if (messagesRes.count !== null) setMessageCount(messagesRes.count)
      if (triviaAnswersRes.count !== null) setTriviaAnswerCount(triviaAnswersRes.count)
    }

    loadData()
    loadRankings()
  }, [])

  const loadRankings = async () => {
    const res = await fetch('/api/winner')
    const data = await res.json()
    if (data.rankings) setRankings(data.rankings)
  }

  // --- Team Management ---
  const startTeamEdit = (teamId: number) => {
    const team = teams.find((t) => t.id === teamId)
    if (!team) return
    setTeamEdits((prev) => ({
      ...prev,
      [teamId]: { name: team.name, emoji: team.emoji, color_bg: team.color_bg, color_light: team.color_light },
    }))
    setEditingTeamId(teamId)
  }

  const saveTeamEdit = async (teamId: number) => {
    const edit = teamEdits[teamId]
    if (!edit) return
    const supabase = createClient()
    await supabase.from('teams').update(edit).eq('id', teamId)
    setEditingTeamId(null)
  }

  // --- Score Adjustment ---
  const adjustScore = async (teamId: number, points: number, reason?: string) => {
    await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamId,
        points,
        reason: reason || `admin_adjust:${points > 0 ? '+' : ''}${points}`,
      }),
    })
    setScoreInputs((prev) => ({ ...prev, [teamId]: { points: '', reason: '' } }))
    const supabase = createClient()
    const { data } = await supabase.from('score_log').select('*').order('created_at', { ascending: false }).limit(50)
    if (data) setScoreLogs(data as ScoreEntry[])
    loadRankings()
  }

  const handleCustomScore = (teamId: number, multiplier: number) => {
    const input = scoreInputs[teamId]
    const pts = Number(input?.points) || 0
    if (pts === 0) return
    const reason = input?.reason || `admin_adjust:${multiplier > 0 ? '+' : ''}${pts * multiplier}`
    adjustScore(teamId, pts * multiplier, reason)
  }

  // --- Confirm dialog ---
  const confirmAction = (message: string, action: () => void) => {
    if (window.confirm(message)) {
      action()
    }
  }

  // --- Reset All Scores ---
  const resetAllScores = async () => {
    const supabase = createClient()
    for (const team of teams) {
      await supabase.from('teams').update({ score: 0 }).eq('id', team.id)
    }
    await supabase.from('score_log').delete().neq('id', 0)
    setScoreLogs([])
    loadRankings()
  }

  // --- Photo Moderation ---
  const deletePhoto = async (photoId: string, imageUrl: string) => {
    const supabase = createClient()
    await supabase.from('photos').delete().eq('id', photoId)
    const pathMatch = imageUrl.match(/\/photos\/(.+)$/)
    if (pathMatch) {
      await supabase.storage.from('photos').remove([pathMatch[1]])
    }
    setPhotos((prev) => prev.filter((p) => p.id !== photoId))
  }

  // --- Player Management ---
  const transferPlayer = async (playerId: string, newTeamId: number) => {
    const supabase = createClient()
    await supabase.from('players').update({ team_id: newTeamId }).eq('id', playerId)
    setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, team_id: newTeamId } : p)))
  }

  const removePlayer = async (playerId: string) => {
    const supabase = createClient()
    await supabase.from('players').delete().eq('id', playerId)
    setPlayers((prev) => prev.filter((p) => p.id !== playerId))
  }

  // --- Timer ---
  const saveTimer = async (active: boolean) => {
    const supabase = createClient()
    const value = {
      start_time: timerStart || null,
      end_time: timerEnd || null,
      active,
    }
    await supabase.from('game_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', 'timer')
  }

  const stopTimer = async () => {
    const supabase = createClient()
    await supabase.from('game_settings').update({
      value: { start_time: null, end_time: null, active: false },
      updated_at: new Date().toISOString(),
    }).eq('key', 'timer')
    setTimerStart('')
    setTimerEnd('')
  }

  // --- Surprise Game ---
  const triggerSurpriseGame = async () => {
    if (triggeringSurprise) return
    setTriggeringSurprise(true)

    const supabase = createClient()
    const firstTeam = teams[0]
    if (!firstTeam) { setTriggeringSurprise(false); return }

    const { data: room } = await supabase
      .from('game_rooms')
      .insert({
        game_type: surpriseGameType,
        team_a: firstTeam.id,
        status: 'waiting',
        game_state: {},
      })
      .select()
      .single()

    if (!room) { setTriggeringSurprise(false); return }

    await supabase.from('game_settings').update({
      value: {
        active: true,
        game_type: surpriseGameType,
        room_id: room.id,
        triggered_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    }).eq('key', 'surprise_game')

    await supabase.from('game_messages').insert({
      player_id: null,
      team_id: null,
      text: `🎉 משחק הפתעה! ${SURPRISE_GAME_TYPES.find((g) => g.type === surpriseGameType)?.name || surpriseGameType} - מהרו להצטרף!`,
    })

    setTriggeringSurprise(false)
  }

  const dismissSurpriseGame = async () => {
    const supabase = createClient()
    await supabase.from('game_settings').update({
      value: { active: false, game_type: null, room_id: null, triggered_at: null },
      updated_at: new Date().toISOString(),
    }).eq('key', 'surprise_game')
  }

  // --- Ceremony ---
  const triggerCeremony = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('duchifatiot_ceremony', 'true')
      window.open('/game/winner', '_blank')
    }
  }

  // --- Broadcast ---
  const sendBroadcast = async () => {
    if (!broadcastText.trim()) return
    const supabase = createClient()
    await supabase.from('game_messages').insert({
      player_id: null,
      team_id: null,
      text: `📢 ${broadcastText.trim()}`,
    })
    setBroadcastText('')
  }

  // Load QR codes for all teams
  const loadQrCodes = async () => {
    if (typeof window === 'undefined' || Object.keys(qrSvgs).length > 0) return
    const origin = window.location.origin
    const svgs: Record<number, string> = {}
    for (const team of teams) {
      svgs[team.id] = await generateQRSvg(`${origin}/?team=${team.id}`, 140)
    }
    setQrSvgs(svgs)
  }

  // Section toggle helper
  const toggleSection = (name: string) => {
    const isOpening = activeSection !== name
    setActiveSection((prev) => (prev === name ? null : name))
    if (name === 'qr' && isOpening) loadQrCodes()
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="שחקנים" value={players.length} icon="👥" />
        <StatCard label="תמונות" value={photos.length} icon="📸" />
        <StatCard label="קבוצות" value={teams.length} icon="🏆" />
        <StatCard label="משימות" value={completionCount} icon="✅" />
        <StatCard label="משחקונים" value={gamePlayCount} icon="🎮" />
        <StatCard label="שאלות" value={triviaQuestions.length} icon="❓" />
        <StatCard label="הודעות" value={messageCount} icon="💬" />
        <StatCard label="תשובות" value={triviaAnswerCount} icon="🧠" />
      </div>

      {/* Quick Actions Bar */}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={triggerCeremony}
          className="px-4 py-2 bg-accent-red text-white font-bold rounded-xl text-sm shadow-md"
        >
          🏆 הכרזת זוכה
        </button>
        <button
          type="button"
          onClick={loadRankings}
          className="px-4 py-2 bg-hoopoe text-white font-bold rounded-xl text-sm"
        >
          🔄 רענן דירוג
        </button>
      </div>

      {/* Timer Control */}
      <SectionHeader title="⏱️ שעון זמן משחק" name="timer" active={activeSection} toggle={toggleSection} />
      {activeSection === 'timer' && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          {gameSettings.timer.active ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-accent-teal/10 rounded-xl">
                <span className="text-xl">🟢</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-accent-teal">השעון פעיל</p>
                  <p className="text-xs text-desert-brown/50">
                    {gameSettings.timer.start_time && new Date(gameSettings.timer.start_time).toLocaleString('he-IL')}
                    {' → '}
                    {gameSettings.timer.end_time && new Date(gameSettings.timer.end_time).toLocaleString('he-IL')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={stopTimer}
                className="w-full px-4 py-2 bg-accent-red text-white text-sm font-bold rounded-xl"
              >
                ⏹️ עצור שעון
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-desert-brown/60">הגדירו זמן התחלה וסיום - השעון יוצג לכל המשתמשים</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-desert-brown/50 block mb-1">התחלה</label>
                  <input
                    type="datetime-local"
                    value={timerStart}
                    onChange={(e) => setTimerStart(e.target.value)}
                    className="w-full p-2 border border-desert-brown/10 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-desert-brown/50 block mb-1">סיום</label>
                  <input
                    type="datetime-local"
                    value={timerEnd}
                    onChange={(e) => setTimerEnd(e.target.value)}
                    className="w-full p-2 border border-desert-brown/10 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => saveTimer(true)}
                  disabled={!timerStart || !timerEnd}
                  className="flex-1 px-4 py-2 bg-accent-teal text-white text-sm font-bold rounded-xl disabled:opacity-40"
                >
                  ▶️ הפעל שעון
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date()
                    setTimerStart(now.toISOString().slice(0, 16))
                    const end = new Date(now.getTime() + 60 * 60 * 1000)
                    setTimerEnd(end.toISOString().slice(0, 16))
                  }}
                  className="px-4 py-2 bg-desert-brown/10 text-desert-brown text-sm font-bold rounded-xl"
                >
                  שעה מעכשיו
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Surprise Game */}
      <SectionHeader title="🎉 משחק הפתעה" name="surprise" active={activeSection} toggle={toggleSection} />
      {activeSection === 'surprise' && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          {gameSettings.surprise_game.active ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-hoopoe/10 rounded-xl">
                <span className="text-xl animate-bounce">🎮</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-hoopoe">משחק הפתעה פעיל!</p>
                  <p className="text-xs text-desert-brown/50">
                    {SURPRISE_GAME_TYPES.find((g) => g.type === gameSettings.surprise_game.game_type)?.name}
                    {' · חדר '}
                    {gameSettings.surprise_game.room_id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={dismissSurpriseGame}
                className="w-full px-4 py-2 bg-desert-brown/10 text-desert-brown text-sm font-bold rounded-xl"
              >
                סגור הפתעה
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-desert-brown/60">
                בחרו סוג משחק והפתיעו את כל המשתמשים! ייפתח חלון קופץ לכולם
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SURPRISE_GAME_TYPES.map((game) => (
                  <button
                    key={game.type}
                    type="button"
                    onClick={() => setSurpriseGameType(game.type)}
                    className={`p-3 rounded-xl text-center transition-all ${
                      surpriseGameType === game.type
                        ? 'bg-hoopoe/10 border-2 border-hoopoe'
                        : 'bg-desert-brown/5 border-2 border-transparent'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{game.icon}</span>
                    <span className="text-xs font-bold text-desert-brown">{game.name}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={triggerSurpriseGame}
                disabled={triggeringSurprise}
                className="w-full px-4 py-3 bg-hoopoe text-white font-black rounded-xl text-lg shadow-md disabled:opacity-40 transition-all active:scale-95"
              >
                {triggeringSurprise ? '⏳ יוצר...' : '🎉 הפעל משחק הפתעה!'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Winner Preview */}
      <SectionHeader title="🏆 תצוגת דירוג" name="rankings" active={activeSection} toggle={toggleSection} />
      {activeSection === 'rankings' && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-desert-brown/40 mb-3">
            ניקוד &gt; משימות &gt; טריוויה &gt; תמונות &gt; שחקנים
          </p>
          <div className="space-y-2">
            {rankings.map((r) => (
              <div key={r.team_id} className="flex items-center gap-2 text-sm">
                <span className="w-6 text-center font-black text-desert-brown">{r.rank}</span>
                <span className="text-lg">{r.emoji}</span>
                <span className="font-bold text-desert-brown flex-1">{r.name}</span>
                <span className="font-black text-desert-brown">{r.score}</span>
                <div className="flex gap-2 text-xs text-desert-brown/40">
                  <span>{r.completions}m</span>
                  <span>{r.trivia_correct}t</span>
                  <span>{r.photos}p</span>
                  <span>{r.active_players}a</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Broadcast */}
      <SectionHeader title="📢 שליחת הודעה לכולם" name="broadcast" active={activeSection} toggle={toggleSection} />
      {activeSection === 'broadcast' && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex gap-2">
            <input
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              placeholder="הודעה לכל השחקנים..."
              maxLength={200}
              className="flex-1 p-2 border border-desert-brown/10 rounded-lg text-sm"
            />
            <button
              type="button"
              onClick={sendBroadcast}
              disabled={!broadcastText.trim()}
              className="px-4 py-2 bg-hoopoe text-white text-sm font-bold rounded-lg disabled:opacity-40"
            >
              שלח
            </button>
          </div>
          <p className="text-xs text-desert-brown/40 mt-2">ההודעה תישלח לצ&apos;אט הקבוצתי כהודעת מערכת</p>
        </div>
      )}

      {/* Team Management */}
      <SectionHeader title="ניהול קבוצות" name="teams" active={activeSection} toggle={toggleSection} />
      {activeSection === 'teams' && (
        <div className="space-y-2">
          {teams.map((team) => {
            const isEditing = editingTeamId === team.id
            const edit = teamEdits[team.id]

            return (
              <div key={team.id} className="bg-white rounded-xl shadow-sm p-3">
                {isEditing && edit ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        value={edit.emoji}
                        onChange={(e) => setTeamEdits((prev) => ({ ...prev, [team.id]: { ...prev[team.id], emoji: e.target.value } }))}
                        className="w-12 p-1.5 border border-desert-brown/10 rounded-lg text-center text-lg"
                        maxLength={4}
                      />
                      <input
                        value={edit.name}
                        onChange={(e) => setTeamEdits((prev) => ({ ...prev, [team.id]: { ...prev[team.id], name: e.target.value } }))}
                        className="flex-1 p-1.5 border border-desert-brown/10 rounded-lg text-sm font-bold"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-desert-brown/50">
                        צבע ראשי
                        <input
                          type="color"
                          value={edit.color_bg}
                          onChange={(e) => setTeamEdits((prev) => ({ ...prev, [team.id]: { ...prev[team.id], color_bg: e.target.value } }))}
                          className="w-8 h-8 rounded cursor-pointer ml-1"
                        />
                      </label>
                      <label className="text-xs text-desert-brown/50">
                        צבע רקע
                        <input
                          type="color"
                          value={edit.color_light}
                          onChange={(e) => setTeamEdits((prev) => ({ ...prev, [team.id]: { ...prev[team.id], color_light: e.target.value } }))}
                          className="w-8 h-8 rounded cursor-pointer ml-1"
                        />
                      </label>
                      <div className="flex-1" />
                      <button
                        type="button"
                        onClick={() => saveTeamEdit(team.id)}
                        className="px-3 py-1.5 bg-accent-teal text-white text-xs font-bold rounded-lg"
                      >
                        שמור
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTeamId(null)}
                        className="px-3 py-1.5 bg-desert-brown/10 text-desert-brown text-xs font-bold rounded-lg"
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{team.emoji}</span>
                    <span className="font-bold text-sm flex-1">{team.name}</span>
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.color_bg }} />
                    <button
                      type="button"
                      onClick={() => startTeamEdit(team.id)}
                      className="px-3 py-1 bg-accent-gold/10 text-accent-gold text-xs font-bold rounded-lg"
                    >
                      ערוך
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Team Scores */}
      <SectionHeader title="ניקוד קבוצות" name="scores" active={activeSection} toggle={toggleSection} />
      {activeSection === 'scores' && (
        <div className="space-y-3">
          {teams.map((team) => {
            const input = scoreInputs[team.id] || { points: '', reason: '' }
            return (
              <div key={team.id} className="bg-white rounded-xl shadow-sm p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{team.emoji}</span>
                  <span className="font-bold text-sm flex-1">{team.name}</span>
                  <span className="font-black text-lg min-w-[50px] text-left">{team.score}</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {[-10, 10, 25, 50].map((pts) => (
                    <button
                      key={pts}
                      type="button"
                      onClick={() => adjustScore(team.id, pts)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        pts < 0 ? 'bg-accent-red/10 text-accent-red' : 'bg-accent-teal/10 text-accent-teal'
                      }`}
                    >
                      {pts > 0 ? '+' : ''}{pts}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    value={input.points}
                    onChange={(e) => setScoreInputs((prev) => ({ ...prev, [team.id]: { ...prev[team.id] || { reason: '' }, points: e.target.value } }))}
                    placeholder="נקודות"
                    className="w-20 p-1.5 border border-desert-brown/10 rounded-lg text-xs"
                  />
                  <input
                    value={input.reason}
                    onChange={(e) => setScoreInputs((prev) => ({ ...prev, [team.id]: { ...prev[team.id] || { points: '' }, reason: e.target.value } }))}
                    placeholder="סיבה (אופציונלי)"
                    className="flex-1 p-1.5 border border-desert-brown/10 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleCustomScore(team.id, 1)}
                    disabled={!input.points}
                    className="px-2 py-1 bg-accent-teal text-white text-xs font-bold rounded-lg disabled:opacity-40"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCustomScore(team.id, -1)}
                    disabled={!input.points}
                    className="px-2 py-1 bg-accent-red text-white text-xs font-bold rounded-lg disabled:opacity-40"
                  >
                    -
                  </button>
                </div>
              </div>
            )
          })}
          <button
            type="button"
            onClick={() => confirmAction('האם אתם בטוחים? כל הניקוד יאופס!', resetAllScores)}
            className="w-full px-4 py-2 bg-accent-red/10 text-accent-red text-sm font-bold rounded-xl"
          >
            🗑️ איפוס כל הניקוד
          </button>
        </div>
      )}

      {/* Challenge Management - Extracted Component */}
      <SectionHeader title={`ניהול הפעלות/משימות (${challenges.length})`} name="challenges" active={activeSection} toggle={toggleSection} />
      {activeSection === 'challenges' && (
        <AdminChallenges challenges={challenges} setChallenges={setChallenges} />
      )}

      {/* Photo Moderation */}
      <SectionHeader title={`ניהול תמונות (${photos.length})`} name="photos" active={activeSection} toggle={toggleSection} />
      {activeSection === 'photos' && (
        <div>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => {
              const photoTeam = teams.find((t) => t.id === photo.team_id)
              return (
                <div key={photo.id} className="relative bg-white rounded-xl shadow-sm overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.image_url}
                    alt={photo.ai_caption || ''}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />
                  <div className="p-1.5">
                    <p className="text-xs text-desert-brown truncate">
                      {photoTeam?.emoji} {(photo.player as unknown as { name: string })?.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deletePhoto(photo.id, photo.image_url)}
                    className="absolute top-1 left-1 w-6 h-6 bg-accent-red text-white rounded-full text-xs flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
          {photos.length === 0 && (
            <p className="text-sm text-desert-brown/40 text-center py-4">אין תמונות</p>
          )}
        </div>
      )}

      {/* Trivia Management - Extracted Component */}
      <SectionHeader title={`ניהול טריוויה (${triviaQuestions.length})`} name="trivia" active={activeSection} toggle={toggleSection} />
      {activeSection === 'trivia' && (
        <AdminTrivia questions={triviaQuestions} setQuestions={setTriviaQuestions} />
      )}

      {/* Players */}
      <SectionHeader title={`שחקנים (${players.length})`} name="players" active={activeSection} toggle={toggleSection} />
      {activeSection === 'players' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-desert-brown/5">
                <th className="p-2 text-right" scope="col">שם</th>
                <th className="p-2 text-right" scope="col">קבוצה</th>
                <th className="p-2 text-right" scope="col">הצטרף</th>
                <th className="p-2 text-right" scope="col">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-t border-desert-brown/5">
                  <td className="p-2">{p.name}</td>
                  <td className="p-2">
                    <select
                      value={p.team_id}
                      onChange={(e) => transferPlayer(p.id, Number(e.target.value))}
                      className="text-xs bg-transparent border border-desert-brown/10 rounded p-0.5"
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 text-desert-brown/40">
                    {new Date(p.created_at).toLocaleTimeString('he-IL')}
                  </td>
                  <td className="p-2">
                    <button
                      type="button"
                      onClick={() => confirmAction(`להסיר את ${p.name}?`, () => removePlayer(p.id))}
                      className="px-2 py-0.5 bg-accent-red/10 text-accent-red text-xs font-bold rounded"
                    >
                      הסר
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Score Log */}
      <SectionHeader title="היסטוריית ניקוד" name="scorelog" active={activeSection} toggle={toggleSection} />
      {activeSection === 'scorelog' && (
        <div className="bg-white rounded-xl shadow-sm p-3 max-h-[400px] overflow-y-auto">
          {scoreLogs.map((log) => {
            const logTeam = teams.find((t) => t.id === log.team_id)
            return (
              <div key={log.id} className="flex items-center gap-2 py-2 border-b border-desert-brown/5 last:border-0 text-sm">
                <span>{logTeam?.emoji}</span>
                <span className={`font-bold ${log.points > 0 ? 'text-accent-teal' : 'text-accent-red'}`}>
                  {log.points > 0 ? '+' : ''}{log.points}
                </span>
                <span className="text-desert-brown/50 flex-1">{log.reason}</span>
                <span className="text-desert-brown/30 text-xs">
                  {new Date(log.created_at).toLocaleTimeString('he-IL')}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* QR Codes per Team */}
      <SectionHeader title="QR הצטרפות לקבוצות" name="qr" active={activeSection} toggle={toggleSection} />
      {activeSection === 'qr' && (
        <div className="space-y-3">
          <p className="text-xs text-desert-brown/50 text-center">כל QR מוביל להרשמה ישירה לקבוצה</p>
          <div className="grid grid-cols-2 gap-3">
            {teams.map((team) => (
              <div
                key={team.id}
                className="bg-white rounded-xl shadow-sm p-3 flex flex-col items-center"
                style={{ borderTop: `3px solid ${team.color_bg}` }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-lg">{team.emoji}</span>
                  <span className="text-xs font-bold" style={{ color: team.color_bg }}>{team.name}</span>
                </div>
                {qrSvgs[team.id] ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: qrSvgs[team.id] }}
                    className="w-[140px] h-[140px]"
                  />
                ) : (
                  <div className="w-[140px] h-[140px] bg-desert-brown/5 rounded-lg animate-pulse" />
                )}
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/?team=${team.id}`
                    if (navigator.share) {
                      navigator.share({ url, title: `הצטרפו ל${team.name}` }).catch(() => {})
                    } else {
                      navigator.clipboard.writeText(url)
                    }
                  }}
                  className="mt-2 px-3 py-1 text-xs font-bold rounded-lg"
                  style={{ backgroundColor: `${team.color_bg}15`, color: team.color_bg }}
                >
                  📤 שתף
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full px-4 py-2 bg-desert-brown/10 text-desert-brown text-sm font-bold rounded-xl"
          >
            🖨️ הדפס QR לכל הקבוצות
          </button>
        </div>
      )}

      {/* Days */}
      <SectionHeader title="ימי המשחק" name="days" active={activeSection} toggle={toggleSection} />
      {activeSection === 'days' && (
        <div className="grid grid-cols-3 gap-2">
          {SEGMENTS.map((seg) => (
            <div key={seg.id} className="bg-white rounded-xl p-4 text-center shadow-sm">
              <span className="text-3xl block mb-1">{seg.icon}</span>
              <span className="text-sm font-bold text-desert-brown block">יום {seg.id}</span>
              <span className="text-xs text-desert-brown/50">{seg.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Danger Zone */}
      <SectionHeader title="אזור מסוכן" name="danger" active={activeSection} toggle={toggleSection} />
      {activeSection === 'danger' && (
        <div className="bg-accent-red/5 rounded-xl p-4 space-y-3 border border-accent-red/20">
          <p className="text-sm font-bold text-accent-red text-center mb-2">
            פעולות אלו לא ניתנות לביטול!
          </p>
          <button
            type="button"
            onClick={() => confirmAction('האם אתם בטוחים שרוצים לאפס את כל הניקוד? פעולה זו לא ניתנת לביטול!', resetAllScores)}
            className="w-full px-4 py-2 bg-accent-red text-white text-sm font-bold rounded-xl"
          >
            🗑️ איפוס כל הניקוד
          </button>
          <button
            type="button"
            onClick={() => confirmAction('האם אתם בטוחים שרוצים לאפס את כל ההשלמות?', async () => {
              const supabase = createClient()
              await supabase.from('completions').delete().neq('id', 0)
              setCompletionCount(0)
            })}
            className="w-full px-4 py-2 bg-accent-red/80 text-white text-sm font-bold rounded-xl"
          >
            🗑️ איפוס כל ההשלמות
          </button>
          <button
            type="button"
            onClick={() => confirmAction('האם אתם בטוחים שרוצים למחוק את כל ההודעות?', async () => {
              const supabase = createClient()
              await supabase.from('game_messages').delete().neq('id', 0)
              setMessageCount(0)
            })}
            className="w-full px-4 py-2 bg-accent-red/60 text-white text-sm font-bold rounded-xl"
          >
            🗑️ מחיקת כל ההודעות
          </button>
        </div>
      )}
    </div>
  )
}
