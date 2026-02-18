'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePlayer } from '@/hooks/usePlayer'
import { createClient } from '@/lib/supabase/browser'
import type { Photo } from '@/lib/types'
import { toast } from 'sonner'
import { useTeams } from '@/hooks/useTeams'
import { resizeImage } from '@/lib/image-utils'
import { motion, AnimatePresence } from 'framer-motion'
import { InfoBanner } from '@/components/InfoBanner'

const PAGE_SIZE = 20

export default function GalleryPage() {
  const { player, team } = usePlayer()
  const { teams } = useTeams()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [votedPhotoId, setVotedPhotoId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null)
  const [filterTeamId, setFilterTeamId] = useState<number | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const fetchPhotos = useCallback(async (offset = 0, append = false) => {
    const supabase = createClient()
    let query = supabase
      .from('photos')
      .select('*, player:players(name, team_id)')
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (filterTeamId) {
      query = query.eq('team_id', filterTeamId)
    }

    const { data } = await query

    if (data) {
      const typed = data as unknown as Photo[]
      if (append) {
        setPhotos((prev) => [...prev, ...typed])
      } else {
        setPhotos(typed)
      }
      setHasMore(typed.length === PAGE_SIZE)
    }
    setLoading(false)
  }, [filterTeamId])

  useEffect(() => {
    setLoading(true)
    fetchPhotos(0, false)
  }, [fetchPhotos])

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('photos-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'photos' },
        async (payload) => {
          const { data } = await supabase
            .from('photos')
            .select('*, player:players(name, team_id)')
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setPhotos((prev) => [data as unknown as Photo, ...prev])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Load existing vote
  useEffect(() => {
    if (!player) return
    const supabase = createClient()
    const loadVote = async () => {
      const { data } = await supabase
        .from('votes')
        .select('target_id')
        .eq('voter_id', player.id)
        .eq('category', 'best_photo')
        .maybeSingle()
      if (data) setVotedPhotoId(data.target_id)
    }
    loadVote()
  }, [player])

  // Infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          fetchPhotos(photos.length, true)
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasMore, loading, photos.length, fetchPhotos])

  const voteForPhoto = async (photoId: string) => {
    if (!player) return
    const supabase = createClient()

    if (votedPhotoId) {
      await supabase
        .from('votes')
        .update({ target_id: photoId })
        .eq('voter_id', player.id)
        .eq('category', 'best_photo')
    } else {
      await supabase.from('votes').insert({
        voter_id: player.id,
        category: 'best_photo',
        target_id: photoId,
      })
    }
    setVotedPhotoId(photoId)
    toast.success('הצבעה נרשמה! 🗳️')
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !player || !team) return

    setUploading(true)

    try {
      const resized = await resizeImage(file, 1200)

      const formData = new FormData()
      formData.append('file', resized)
      formData.append('playerId', player.id)
      formData.append('teamId', String(team.id))

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Upload failed')

      toast.success('!התמונה עלתה בהצלחה 📸')
    } catch {
      toast.error('שגיאה בהעלאת התמונה')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleLike = async (photoId: string) => {
    if (!player) return
    const supabase = createClient()

    const photo = photos.find((p) => p.id === photoId)
    if (!photo) return

    const alreadyLiked = photo.likes.includes(player.id)
    const newLikes = alreadyLiked
      ? photo.likes.filter((id) => id !== player.id)
      : [...photo.likes, player.id]

    await supabase
      .from('photos')
      .update({ likes: newLikes })
      .eq('id', photoId)

    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, likes: newLikes } : p))
    )
  }

  const sharePhoto = (imageUrl: string, caption: string | null) => {
    const text = caption
      ? `🐦 הדוכיפתיות: ${caption}\n${imageUrl}`
      : `🐦 תמונה מהדוכיפתיות!\n${imageUrl}`

    if (navigator.share) {
      navigator.share({ text }).catch(() => {})
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-64 skeleton rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-4">
      <InfoBanner title="מה זה הגלריה?" icon="📸" storageKey="gallery_instructions_seen" defaultOpen={false}>
        <p>גלריית התמונות והסרטונים של כל הקבוצות.</p>
        <p>העלו תמונות וקבלו 10 נקודות! לייקו תמונות שאהבתם.</p>
      </InfoBanner>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-black text-desert-brown flex items-center gap-2">
          📸 גלריה
        </h1>
        <span className="text-sm text-desert-brown/50">{photos.length} תמונות</span>
      </div>

      {/* Team filter */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-hide pb-1">
        <button
          type="button"
          onClick={() => setFilterTeamId(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
            !filterTeamId ? 'bg-hoopoe text-white' : 'bg-white text-desert-brown/60 shadow-sm'
          }`}
        >
          הכל
        </button>
        {teams.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilterTeamId(filterTeamId === t.id ? null : t.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
              filterTeamId === t.id
                ? 'text-white shadow-md'
                : 'bg-white text-desert-brown/60 shadow-sm'
            }`}
            style={filterTeamId === t.id ? { backgroundColor: t.color_bg } : undefined}
          >
            {t.emoji} {t.name}
          </button>
        ))}
      </div>

      {/* Photo grid - 2 columns for more modern look */}
      <div className="columns-2 gap-3 space-y-3">
        {photos.map((photo) => {
          const photoTeam = teams.find((t) => t.id === photo.team_id)
          const isLiked = player ? photo.likes.includes(player.id) : false

          return (
            <motion.div
              key={photo.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="break-inside-avoid bg-white rounded-2xl overflow-hidden shadow-sm"
            >
              <button
                type="button"
                onClick={() => setLightboxPhoto(photo)}
                className="w-full"
                aria-label="הגדל תמונה"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.image_url}
                  alt={photo.ai_caption || 'תמונה מהגלריה'}
                  className="w-full object-cover"
                  loading="lazy"
                />
              </button>
              <div className="p-2.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white"
                    style={{ backgroundColor: photoTeam?.color_bg || '#D4663C' }}
                  >
                    {photoTeam?.emoji}
                  </span>
                  <span className="text-xs font-medium text-desert-brown">
                    {(photo.player as unknown as { name: string })?.name || 'שחקן'}
                  </span>
                </div>

                {photo.ai_caption && (
                  <p className="text-xs text-desert-brown/60 mb-1.5 line-clamp-2">
                    {photo.ai_caption}
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleLike(photo.id)}
                    className="flex items-center gap-0.5 text-xs transition-colors"
                    style={{ color: isLiked ? '#C73E4A' : '#2C181066' }}
                    aria-label={isLiked ? 'הסר לייק' : 'תן לייק'}
                  >
                    {isLiked ? '❤️' : '🤍'} {photo.likes.length}
                  </button>
                  <button
                    type="button"
                    onClick={() => voteForPhoto(photo.id)}
                    className={`flex items-center gap-0.5 text-xs ${
                      votedPhotoId === photo.id ? 'text-accent-gold' : 'text-desert-brown/30'
                    }`}
                    aria-label="הצבע לתמונה"
                  >
                    {votedPhotoId === photo.id ? '⭐' : '☆'}
                  </button>
                  <button
                    type="button"
                    onClick={() => sharePhoto(photo.image_url, photo.ai_caption)}
                    className="text-xs text-desert-brown/30 hover:text-accent-teal"
                    aria-label="שתף"
                  >
                    📤
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Load more trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="py-6 text-center">
          <span className="text-sm text-desert-brown/30">טוען עוד...</span>
        </div>
      )}

      {photos.length === 0 && (
        <div className="text-center py-12 text-desert-brown/40">
          <p className="text-4xl mb-2">📷</p>
          <p className="text-sm">עדיין אין תמונות... היו הראשונים!</p>
        </div>
      )}

      {/* Upload FAB */}
      <label
        className={`
          fixed bottom-20 left-4 w-14 h-14 rounded-full shadow-lg
          flex items-center justify-center text-white text-2xl cursor-pointer
          transition-all z-50
          ${uploading ? 'bg-desert-brown/40' : 'bg-hoopoe hover:bg-hoopoe/90 active:scale-90'}
        `}
        aria-label="העלה תמונה"
      >
        {uploading ? '⏳' : '📸'}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
      </label>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-4"
            onClick={() => setLightboxPhoto(null)}
            onKeyDown={(e) => { if (e.key === 'Escape') setLightboxPhoto(null) }}
            role="dialog"
            aria-label="תצוגה מלאה של תמונה"
          >
            <button
              type="button"
              onClick={() => setLightboxPhoto(null)}
              className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/20 text-white text-xl flex items-center justify-center z-10"
              aria-label="סגור"
            >
              ✕
            </button>
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              src={lightboxPhoto.image_url}
              alt={lightboxPhoto.ai_caption || 'תמונה'}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            {lightboxPhoto.ai_caption && (
              <p className="text-white/80 text-sm mt-3 text-center max-w-sm">
                {lightboxPhoto.ai_caption}
              </p>
            )}
            <div className="flex gap-4 mt-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleLike(lightboxPhoto.id)
                }}
                className="text-white text-lg"
                aria-label="לייק"
              >
                {player && lightboxPhoto.likes.includes(player.id) ? '❤️' : '🤍'} {lightboxPhoto.likes.length}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  sharePhoto(lightboxPhoto.image_url, lightboxPhoto.ai_caption)
                }}
                className="text-white text-lg"
                aria-label="שתף"
              >
                📤
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
