import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface TeamRanking {
  team_id: number
  name: string
  emoji: string
  color_bg: string
  color_light: string
  score: number
  completions: number
  trivia_correct: number
  photos: number
  active_players: number
  rank: number
}

export async function GET() {
  const supabase = createServiceClient()

  const [teamsRes, completionsRes, triviaRes, photosRes, playersRes] = await Promise.all([
    supabase.from('teams').select('id, name, emoji, color_bg, color_light, score'),
    supabase.from('completions').select('team_id'),
    supabase
      .from('trivia_answers')
      .select('player_id, correct, players!inner(team_id)')
      .eq('correct', true),
    supabase.from('photos').select('team_id'),
    supabase.from('players').select('team_id'),
  ])

  const teams = teamsRes.data || []

  // Count completions per team
  const completionCounts: Record<number, number> = {}
  for (const row of completionsRes.data || []) {
    completionCounts[row.team_id] = (completionCounts[row.team_id] || 0) + 1
  }

  // Count correct trivia answers per team
  const triviaCounts: Record<number, number> = {}
  for (const row of (triviaRes.data || []) as unknown as { players: { team_id: number } }[]) {
    const teamId = row.players.team_id
    triviaCounts[teamId] = (triviaCounts[teamId] || 0) + 1
  }

  // Count photos per team
  const photoCounts: Record<number, number> = {}
  for (const row of photosRes.data || []) {
    photoCounts[row.team_id] = (photoCounts[row.team_id] || 0) + 1
  }

  // Count players per team
  const playerCounts: Record<number, number> = {}
  for (const row of playersRes.data || []) {
    playerCounts[row.team_id] = (playerCounts[row.team_id] || 0) + 1
  }

  // Build rankings
  const rankings: TeamRanking[] = teams.map((t) => ({
    team_id: t.id,
    name: t.name,
    emoji: t.emoji,
    color_bg: t.color_bg,
    color_light: t.color_light,
    score: t.score,
    completions: completionCounts[t.id] || 0,
    trivia_correct: triviaCounts[t.id] || 0,
    photos: photoCounts[t.id] || 0,
    active_players: playerCounts[t.id] || 0,
    rank: 0,
  }))

  // Sort by multi-criteria tiebreaker
  rankings.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score
    if (a.completions !== b.completions) return b.completions - a.completions
    if (a.trivia_correct !== b.trivia_correct) return b.trivia_correct - a.trivia_correct
    if (a.photos !== b.photos) return b.photos - a.photos
    return b.active_players - a.active_players
  })

  // Assign ranks
  for (let i = 0; i < rankings.length; i++) {
    rankings[i].rank = i + 1
  }

  return NextResponse.json({
    rankings,
    algorithm: 'score > completions > trivia > photos > players',
  })
}
