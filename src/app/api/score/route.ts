import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createServiceClient()

  const { teamId, playerId, points, reason } = await req.json()

  if (!teamId || !points || !reason) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Log the score
  await supabase.from('score_log').insert({
    team_id: teamId,
    player_id: playerId || null,
    points,
    reason,
  })

  // Update team score atomically
  await supabase.rpc('increment_team_score', {
    team_id_input: teamId,
    points_input: points,
  })

  return NextResponse.json({ ok: true })
}
