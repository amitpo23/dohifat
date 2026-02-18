'use client'

import { useState, useEffect, useRef } from 'react'
import { usePlayer } from '@/hooks/usePlayer'
import { createClient } from '@/lib/supabase/browser'
import type { Challenge, Completion } from '@/lib/types'
import { toast } from 'sonner'
import { resizeImage, getVideoDuration, MAX_VIDEO_DURATION } from '@/lib/image-utils'
import { vibrateLight } from '@/lib/haptics'
import { playClick } from '@/lib/sounds'
import { motion, AnimatePresence } from 'framer-motion'
import { InfoBanner } from '@/components/InfoBanner'

const DAYS = [
  { id: 1, name: 'יום התמונות', icon: '📸' },
  { id: 2, name: 'יום המשחקים', icon: '🧠' },
  { id: 3, name: 'יום הסיום', icon: '🎉' },
]

const TYPE_CONFIG = {
  photo: { label: 'תמונה', buttonLabel: '📸 צלם', buttonClass: 'bg-hoopoe', tagClass: 'text-hoopoe bg-hoopoe/10' },
  field: { label: 'משימת שטח', buttonLabel: '✓ בוצע', buttonClass: 'bg-accent-teal', tagClass: 'text-accent-teal bg-accent-teal/10' },
  video: { label: 'סרטון', buttonLabel: '🎬 צלם', buttonClass: 'bg-accent-purple', tagClass: 'text-accent-purple bg-accent-purple/10' },
  photo_match: { label: 'חקה תמונה', buttonLabel: '🖼️ חקה', buttonClass: 'bg-accent-gold', tagClass: 'text-accent-gold bg-accent-gold/10' },
} as const

export default function MissionsPage() {
  const { player, team } = usePlayer()
  const [allChallenges, setAllChallenges] = useState<Challenge[]>([])
  const [completions, setCompletions] = useState<Completion[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [activeChallenge, setActiveChallenge] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState(1)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [confirmChallenge, setConfirmChallenge] = useState<Challenge | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const fetchChallenges = async () => {
      const { data } = await supabase
        .from('challenges')
        .select('*')
        .eq('active', true)
        .order('segment')
        .order('sort_order')

      if (data) setAllChallenges(data as Challenge[])
    }

    fetchChallenges()
  }, [])

  useEffect(() => {
    if (!team) return
    const supabase = createClient()

    const fetchCompletions = async () => {
      const { data } = await supabase
        .from('completions')
        .select('*')
        .eq('team_id', team.id)

      if (data) {
        setCompletions(data as Completion[])
      }
      setLoading(false)
    }

    fetchCompletions()

    const channel = supabase
      .channel('completions-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'completions' },
        (payload) => {
          if (payload.new.team_id === team.id) {
            setCompletions((prev) => [...prev, payload.new as Completion])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [team])

  const challenges = allChallenges.filter((c) => c.segment === selectedDay)

  const handleComplete = async (challenge: Challenge, file?: File) => {
    if (!player || !team) return
    setCompleting(challenge.key)
    vibrateLight()
    playClick()

    try {
      if (file) {
        const isVideo = file.type.startsWith('video/')
        const processedFile = isVideo ? file : await resizeImage(file, 1200)

        const formData = new FormData()
        formData.append('file', processedFile)
        formData.append('playerId', player.id)
        formData.append('teamId', String(team.id))
        formData.append('segment', String(challenge.segment))

        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        if (!res.ok) throw new Error('Upload failed')
      }

      const supabase = createClient()
      const { error } = await supabase.from('completions').insert({
        challenge_key: challenge.key,
        team_id: team.id,
        player_id: player.id,
        points: challenge.points,
        segment: challenge.segment,
      })

      if (error) {
        if (error.code === '23505') {
          toast.error('המשימה כבר הושלמה!')
        } else {
          throw error
        }
        return
      }

      await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: team.id,
          playerId: player.id,
          points: challenge.points,
          reason: `mission:${challenge.key}`,
        }),
      })

      toast.success(`+${challenge.points} נקודות! 🎉`)
    } catch {
      toast.error('שגיאה, נסו שוב')
    } finally {
      setCompleting(null)
      setActiveChallenge(null)
      cleanupPreviews()
    }
  }

  const cleanupPreviews = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
    setPreviewUrl(null)
    setPreviewFile(null)
    setVideoPreviewUrl(null)
    setVideoFile(null)
    setConfirmChallenge(null)
  }

  // --- Photo selection ---
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeChallenge) return

    const challenge = allChallenges.find((c) => c.key === activeChallenge)
    if (!challenge) return

    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setPreviewFile(file)
    setConfirmChallenge(challenge)

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const confirmPhotoUpload = () => {
    if (confirmChallenge && previewFile) {
      handleComplete(confirmChallenge, previewFile)
    }
  }

  const cancelPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPreviewFile(null)
    // Keep confirmChallenge for photo_match so we go back to the reference view
    if (confirmChallenge?.type !== 'photo_match') {
      setConfirmChallenge(null)
      setActiveChallenge(null)
    }
  }

  // --- Video selection ---
  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeChallenge) return

    const challenge = allChallenges.find((c) => c.key === activeChallenge)
    if (!challenge) return

    try {
      const duration = await getVideoDuration(file)
      if (duration > MAX_VIDEO_DURATION) {
        toast.error(`הסרטון ארוך מדי! (${Math.round(duration)} שניות, מקסימום ${MAX_VIDEO_DURATION})`)
        return
      }
    } catch {
      // If metadata check fails, allow upload anyway
    }

    const url = URL.createObjectURL(file)
    setVideoPreviewUrl(url)
    setVideoFile(file)
    setConfirmChallenge(challenge)

    if (videoInputRef.current) videoInputRef.current.value = ''
  }

  const confirmVideoUpload = () => {
    if (confirmChallenge && videoFile) {
      handleComplete(confirmChallenge, videoFile)
    }
  }

  const cancelVideoPreview = () => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
    setVideoPreviewUrl(null)
    setVideoFile(null)
    setConfirmChallenge(null)
    setActiveChallenge(null)
  }

  // --- Field task ---
  const handleFieldComplete = (challenge: Challenge) => {
    setConfirmChallenge(challenge)
  }

  const confirmFieldComplete = () => {
    if (confirmChallenge) {
      handleComplete(confirmChallenge)
    }
  }

  // --- Photo match ---
  const openPhotoMatch = (challenge: Challenge) => {
    setConfirmChallenge(challenge)
    setActiveChallenge(challenge.key)
  }

  const completedKeys = new Set(completions.map((c) => c.challenge_key))
  const completedCount = challenges.filter((c) => completedKeys.has(c.key)).length
  const totalCompleted = allChallenges.filter((c) => completedKeys.has(c.key)).length

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-desert-brown/5 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-4">
      <InfoBanner title="מהן המשימות?" icon="🎯" storageKey="missions_instructions_seen">
        <p>השלימו משימות צילום, סרטון ושטח כדי לצבור נקודות לקבוצה.</p>
        <p>לחצו על כל משימה לפרטים נוספים. כל משימה ניתנת להשלמה פעם אחת לקבוצה.</p>
      </InfoBanner>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-black text-desert-brown flex items-center gap-2">
          🎯 משימות
        </h1>
        <span className="text-sm text-desert-brown/50">
          {totalCompleted}/{allChallenges.length} הושלמו
        </span>
      </div>

      {/* Day tabs */}
      <div className="flex gap-2 mb-4">
        {DAYS.map((day) => {
          const dayCount = allChallenges.filter((c) => c.segment === day.id).length
          const dayCompleted = allChallenges.filter((c) => c.segment === day.id && completedKeys.has(c.key)).length
          return (
            <button
              key={day.id}
              type="button"
              onClick={() => setSelectedDay(day.id)}
              className={`flex-1 py-2.5 rounded-xl text-center transition-all ${
                selectedDay === day.id
                  ? 'bg-hoopoe text-white shadow-md'
                  : 'bg-white text-desert-brown shadow-sm'
              }`}
            >
              <span className="text-lg block">{day.icon}</span>
              <span className="text-[10px] font-bold block">{day.name}</span>
              {dayCount > 0 && (
                <span className={`text-[9px] block ${
                  selectedDay === day.id ? 'text-white/70' : 'text-desert-brown/40'
                }`}>
                  {dayCompleted}/{dayCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-desert-brown/10 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-hoopoe rounded-full transition-all duration-500"
          style={{ width: `${(completedCount / Math.max(challenges.length, 1)) * 100}%` }}
        />
      </div>

      {/* Challenges */}
      <div className="space-y-2">
        {challenges.map((challenge, i) => {
          const isCompleted = completedKeys.has(challenge.key)
          const isLoading = completing === challenge.key
          const config = TYPE_CONFIG[challenge.type] || TYPE_CONFIG.field
          const hasDescription = Boolean(challenge.description)
          const isExpanded = expandedKey === challenge.key

          return (
            <motion.div
              key={challenge.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`p-3 rounded-2xl bg-white shadow-sm transition-all ${isCompleted ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{challenge.icon}</span>
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => hasDescription && setExpandedKey(isExpanded ? null : challenge.key)}
                    className="text-right w-full"
                  >
                    <p className={`text-sm font-medium ${isCompleted ? 'line-through text-desert-brown/40' : 'text-desert-brown'}`}>
                      {challenge.title}
                      {hasDescription && (
                        <span className="text-desert-brown/30 mr-1 text-[10px]">
                          {isExpanded ? ' ▲' : ' ▼'}
                        </span>
                      )}
                    </p>
                  </button>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${config.tagClass}`}>
                      {config.label}
                    </span>
                    <span className="text-xs text-desert-brown/40">{challenge.points} נק׳</span>
                    {challenge.type === 'photo_match' && challenge.reference_image && (
                      <span className="text-[10px] text-accent-gold">🖼️</span>
                    )}
                  </div>
                </div>

                {isCompleted ? (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-lg">
                    ✅
                  </motion.span>
                ) : isLoading ? (
                  <span className="text-lg animate-pulse">⏳</span>
                ) : challenge.type === 'photo' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveChallenge(challenge.key)
                      fileInputRef.current?.click()
                    }}
                    className={`px-3 py-1.5 ${config.buttonClass} text-white text-xs font-bold rounded-xl active:scale-95 transition-transform`}
                  >
                    {config.buttonLabel}
                  </button>
                ) : challenge.type === 'video' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveChallenge(challenge.key)
                      videoInputRef.current?.click()
                    }}
                    className={`px-3 py-1.5 ${config.buttonClass} text-white text-xs font-bold rounded-xl active:scale-95 transition-transform`}
                  >
                    {config.buttonLabel}
                  </button>
                ) : challenge.type === 'photo_match' ? (
                  <button
                    type="button"
                    onClick={() => openPhotoMatch(challenge)}
                    className={`px-3 py-1.5 ${config.buttonClass} text-white text-xs font-bold rounded-xl active:scale-95 transition-transform`}
                  >
                    {config.buttonLabel}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleFieldComplete(challenge)}
                    className={`px-3 py-1.5 ${config.buttonClass} text-white text-xs font-bold rounded-xl active:scale-95 transition-transform`}
                  >
                    {config.buttonLabel}
                  </button>
                )}
              </div>

              {/* Expandable description */}
              <AnimatePresence>
                {isExpanded && challenge.description && (
                  <motion.p
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="text-xs text-desert-brown/60 mt-2 mr-8 leading-relaxed overflow-hidden"
                  >
                    {challenge.description}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {challenges.length === 0 && (
        <div className="text-center py-12 text-desert-brown/40">
          <p className="text-4xl mb-2">{DAYS.find((d) => d.id === selectedDay)?.icon}</p>
          <p className="text-sm">אין משימות ליום הזה עדיין</p>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoSelect}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        onChange={handleVideoSelect}
        className="hidden"
      />

      {/* Photo Preview Dialog (photo + photo_match) */}
      <AnimatePresence>
        {previewUrl && confirmChallenge && (confirmChallenge.type === 'photo' || confirmChallenge.type === 'photo_match') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-6"
            onClick={cancelPreview}
            onKeyDown={(e) => { if (e.key === 'Escape') cancelPreview() }}
            role="dialog"
            aria-label="תצוגה מקדימה של תמונה"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-2xl p-4 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={() => {}}
              role="document"
            >
              <h3 className="text-sm font-black text-desert-brown text-center mb-3">
                {confirmChallenge.icon} {confirmChallenge.title}
              </h3>

              {/* Side by side for photo_match */}
              {confirmChallenge.type === 'photo_match' && confirmChallenge.reference_image && (
                <div className="mb-2">
                  <p className="text-[10px] text-desert-brown/40 text-center mb-1">המקור:</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={confirmChallenge.reference_image}
                    alt="תמונה מקורית"
                    className="w-full max-h-[150px] object-contain rounded-lg bg-desert-brown/5 border-2 border-accent-gold/30"
                  />
                </div>
              )}

              <div className="rounded-xl overflow-hidden mb-3">
                <p className="text-[10px] text-desert-brown/40 text-center mb-1">
                  {confirmChallenge.type === 'photo_match' ? 'הגרסה שלכם:' : ''}
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="תצוגה מקדימה"
                  className="w-full max-h-[200px] object-contain bg-desert-brown/5"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={cancelPreview}
                  className="flex-1 py-2.5 bg-desert-brown/10 text-desert-brown text-sm font-bold rounded-xl"
                >
                  בחר אחרת
                </button>
                <button
                  type="button"
                  onClick={confirmPhotoUpload}
                  disabled={completing !== null}
                  className={`flex-1 py-2.5 text-white text-sm font-bold rounded-xl disabled:opacity-40 ${
                    confirmChallenge.type === 'photo_match' ? 'bg-accent-gold' : 'bg-hoopoe'
                  }`}
                >
                  {completing ? '⏳ מעלה...' : `📸 שלח (+${confirmChallenge.points})`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Preview Dialog */}
      <AnimatePresence>
        {videoPreviewUrl && confirmChallenge && confirmChallenge.type === 'video' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-6"
            onClick={cancelVideoPreview}
            onKeyDown={(e) => { if (e.key === 'Escape') cancelVideoPreview() }}
            role="dialog"
            aria-label="תצוגה מקדימה של סרטון"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-2xl p-4 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={() => {}}
              role="document"
            >
              <h3 className="text-sm font-black text-desert-brown text-center mb-3">
                {confirmChallenge.icon} {confirmChallenge.title}
              </h3>
              <div className="rounded-xl overflow-hidden mb-3 bg-desert-brown/5">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  src={videoPreviewUrl}
                  controls
                  playsInline
                  className="w-full max-h-[300px] object-contain"
                >
                  <track kind="captions" />
                </video>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={cancelVideoPreview}
                  className="flex-1 py-2.5 bg-desert-brown/10 text-desert-brown text-sm font-bold rounded-xl"
                >
                  בחר סרטון אחר
                </button>
                <button
                  type="button"
                  onClick={confirmVideoUpload}
                  disabled={completing !== null}
                  className="flex-1 py-2.5 bg-accent-purple text-white text-sm font-bold rounded-xl disabled:opacity-40"
                >
                  {completing ? '⏳ מעלה...' : `🎬 שלח (+${confirmChallenge.points})`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Field Task Confirmation Dialog */}
      <AnimatePresence>
        {confirmChallenge && confirmChallenge.type === 'field' && !previewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-6"
            onClick={() => setConfirmChallenge(null)}
            onKeyDown={(e) => { if (e.key === 'Escape') setConfirmChallenge(null) }}
            role="dialog"
            aria-label="אישור השלמת משימה"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl text-center"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={() => {}}
              role="document"
            >
              <span className="text-4xl block mb-2">{confirmChallenge.icon}</span>
              <h3 className="text-base font-black text-desert-brown mb-1">
                {confirmChallenge.title}
              </h3>
              {confirmChallenge.description && (
                <p className="text-xs text-desert-brown/60 mb-2">{confirmChallenge.description}</p>
              )}
              <p className="text-sm text-desert-brown/50 mb-4">
                ביצעתם את המשימה? תקבלו {confirmChallenge.points} נקודות!
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmChallenge(null)}
                  className="flex-1 py-2.5 bg-desert-brown/10 text-desert-brown text-sm font-bold rounded-xl"
                >
                  עוד לא
                </button>
                <button
                  type="button"
                  onClick={confirmFieldComplete}
                  disabled={completing !== null}
                  className="flex-1 py-2.5 bg-accent-teal text-white text-sm font-bold rounded-xl disabled:opacity-40"
                >
                  {completing ? '⏳' : '✓ כן, ביצענו!'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo Match Reference Dialog */}
      <AnimatePresence>
        {confirmChallenge && confirmChallenge.type === 'photo_match' && !previewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-6"
            onClick={() => { setConfirmChallenge(null); setActiveChallenge(null) }}
            onKeyDown={(e) => { if (e.key === 'Escape') { setConfirmChallenge(null); setActiveChallenge(null) } }}
            role="dialog"
            aria-label="משימת חיקוי תמונה"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-2xl p-4 max-w-sm w-full shadow-2xl text-center"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={() => {}}
              role="document"
            >
              <h3 className="text-sm font-black text-desert-brown mb-3">
                {confirmChallenge.icon} {confirmChallenge.title}
              </h3>
              {confirmChallenge.reference_image ? (
                <div className="rounded-xl overflow-hidden mb-3 border-4 border-accent-gold/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={confirmChallenge.reference_image}
                    alt="תמונה לחיקוי"
                    className="w-full max-h-[280px] object-contain bg-desert-brown/5"
                  />
                </div>
              ) : (
                <div className="p-8 bg-desert-brown/5 rounded-xl mb-3">
                  <p className="text-3xl mb-2">🖼️</p>
                  <p className="text-desert-brown/40 text-sm">תמונת הייחוס תתווסף בקרוב...</p>
                </div>
              )}
              {confirmChallenge.description && (
                <p className="text-xs text-desert-brown/60 mb-3">{confirmChallenge.description}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setConfirmChallenge(null); setActiveChallenge(null) }}
                  className="flex-1 py-2.5 bg-desert-brown/10 text-desert-brown text-sm font-bold rounded-xl"
                >
                  חזרה
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!confirmChallenge.reference_image}
                  className="flex-1 py-2.5 bg-accent-gold text-white text-sm font-bold rounded-xl disabled:opacity-40"
                >
                  📸 צלם תמונה דומה!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
