import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB
const POINTS_COOLDOWN_MS = 30_000 // 30 seconds between point awards
const MAX_DAILY_PHOTO_POINTS = 5 // Max photos that award points per day
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

export async function POST(req: Request) {
  const supabase = createServiceClient()

  const formData = await req.formData()
  const file = formData.get('file') as File
  const playerId = formData.get('playerId') as string
  const teamId = formData.get('teamId') as string
  const segment = formData.get('segment') as string | null

  if (!file || !playerId || !teamId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const isImage = file.type.startsWith('image/')
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type)

  // Validate file type
  if (!isImage && !isVideo) {
    return NextResponse.json({ error: 'Only images and videos allowed' }, { status: 400 })
  }

  // Validate file size
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `File too large (max ${isVideo ? '50MB' : '10MB'})` },
      { status: 400 }
    )
  }

  // Validate player exists
  const { data: playerCheck } = await supabase
    .from('players')
    .select('id')
    .eq('id', playerId)
    .single()

  if (!playerCheck) {
    return NextResponse.json({ error: 'Player not found' }, { status: 403 })
  }

  const extension = isVideo ? (file.name.split('.').pop() || 'mp4') : 'jpg'
  const fileName = isVideo
    ? `videos/${Date.now()}_${playerId}.${extension}`
    : `${playerId}/${Date.now()}.jpg`

  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(fileName, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('photos')
    .getPublicUrl(fileName)

  const parsedTeamId = Number.parseInt(teamId, 10)

  // Insert photo/media record
  const { data: photo, error: insertError } = await supabase
    .from('photos')
    .insert({
      player_id: playerId,
      team_id: parsedTeamId,
      image_url: publicUrl,
      segment: segment ? Number.parseInt(segment, 10) : null,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Rate limit: check how many photo_upload points this player got today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data: recentUploads } = await supabase
    .from('score_log')
    .select('created_at')
    .eq('player_id', playerId)
    .eq('reason', 'photo_upload')
    .gte('created_at', todayStart.toISOString())
    .order('created_at', { ascending: false })

  const uploadCount = recentUploads?.length || 0
  const lastUploadTime = recentUploads?.[0]?.created_at
    ? new Date(recentUploads[0].created_at).getTime()
    : 0

  const canAwardPoints =
    uploadCount < MAX_DAILY_PHOTO_POINTS &&
    Date.now() - lastUploadTime > POINTS_COOLDOWN_MS

  if (canAwardPoints) {
    await supabase.from('score_log').insert({
      team_id: parsedTeamId,
      player_id: playerId,
      points: 10,
      reason: 'photo_upload',
    })

    await supabase.rpc('increment_team_score', {
      team_id_input: parsedTeamId,
      points_input: 10,
    })
  }

  return NextResponse.json({ url: publicUrl, photo, pointsAwarded: canAwardPoints })
}
