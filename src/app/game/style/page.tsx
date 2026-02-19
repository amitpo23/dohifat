'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlayer } from '@/hooks/usePlayer'
import { createClient } from '@/lib/supabase/browser'
import Link from 'next/link'

const STYLES = [
  { id: 'cartoon', label: 'קריקטורה', emoji: '🎨', prompt: 'transform into cartoon style illustration, vibrant colors, clean lines' },
  { id: 'oil', label: 'ציור שמן', emoji: '🖼️', prompt: 'transform into classical oil painting style, rich textures, dramatic lighting' },
  { id: 'anime', label: 'אנימה', emoji: '🇯🇵', prompt: 'transform into anime style, big eyes, colorful, Japanese animation style' },
  { id: 'watercolor', label: 'צבעי מים', emoji: '💧', prompt: 'transform into watercolor painting, soft edges, flowing colors' },
  { id: 'pixel', label: 'פיקסל ארט', emoji: '👾', prompt: 'transform into pixel art style, 16-bit retro game aesthetic' },
  { id: 'sketch', label: 'רישום עיפרון', emoji: '✏️', prompt: 'transform into pencil sketch drawing, black and white, detailed shading' },
  { id: 'pop_art', label: 'פופ ארט', emoji: '🎭', prompt: 'transform into pop art style like Andy Warhol, bold colors, halftone dots' },
  { id: 'ghibli', label: 'סטודיו ג\'יבלי', emoji: '🌿', prompt: 'transform into Studio Ghibli anime style, soft pastels, dreamy atmosphere' },
]

export default function StyleTransferPage() {
  const { player } = usePlayer()
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setSelectedImage(reader.result as string)
    reader.readAsDataURL(file)
    setResultUrl(null)
    setError('')
  }

  const handleGenerate = async () => {
    if (!selectedImage || !selectedStyle) return
    setLoading(true)
    setError('')
    setResultUrl(null)

    const style = STYLES.find(s => s.id === selectedStyle)
    if (!style) return

    try {
      // First upload image to get a URL
      const uploadRes = await fetch(selectedImage)
      const blob = await uploadRes.blob()
      const formData = new FormData()
      formData.append('file', blob, 'photo.jpg')

      // Use the base64 directly with Pollinations
      const res = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: selectedImage,
          prompt: style.prompt,
        }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResultUrl(data.resultUrl)

      // Award points
      if (player) {
        const supabase = createClient()
        await supabase.from('score_log').insert({
          player_id: player.id,
          points: 5,
          reason: 'style_transfer',
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת הסגנון')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto" dir="rtl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/game/games" className="text-desert-brown/50 hover:text-desert-brown">←</Link>
        <h1 className="text-xl font-black text-desert-brown">🎨 העברת סגנון</h1>
      </div>

      {/* Upload */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-4 shadow-sm mb-4"
      >
        <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        {selectedImage ? (
          <div className="relative">
            <img src={selectedImage} alt="uploaded" className="w-full rounded-xl max-h-64 object-cover" />
            <button
              onClick={() => { setSelectedImage(null); setResultUrl(null) }}
              className="absolute top-2 left-2 bg-white/80 rounded-full w-8 h-8 flex items-center justify-center text-sm"
            >✕</button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full py-12 border-2 border-dashed border-desert-brown/20 rounded-xl text-desert-brown/50 hover:border-hoopoe hover:text-hoopoe transition-colors"
          >
            📷 לחצו להעלאת תמונה
          </button>
        )}
      </motion.div>

      {/* Style picker */}
      {selectedImage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 shadow-sm mb-4"
        >
          <h2 className="font-bold text-desert-brown mb-3">בחרו סגנון:</h2>
          <div className="grid grid-cols-4 gap-2">
            {STYLES.map(style => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                className={`p-3 rounded-xl text-center transition-all ${
                  selectedStyle === style.id
                    ? 'bg-hoopoe/20 ring-2 ring-hoopoe scale-105'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="text-2xl mb-1">{style.emoji}</div>
                <div className="text-xs font-medium text-desert-brown">{style.label}</div>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Generate button */}
      {selectedImage && selectedStyle && !loading && !resultUrl && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={handleGenerate}
          className="w-full py-3 bg-hoopoe text-white font-bold rounded-2xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all mb-4"
        >
          ✨ יצירת סגנון!
        </motion.button>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin text-4xl mb-3">🎨</div>
          <p className="text-desert-brown/60">יוצר את הסגנון... (10-20 שניות)</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-accent-red/10 text-accent-red p-3 rounded-xl text-center text-sm mb-4">
          {error}
        </div>
      )}

      {/* Result */}
      <AnimatePresence>
        {resultUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-4 shadow-sm"
          >
            <h2 className="font-bold text-desert-brown mb-3">🎉 התוצאה:</h2>
            <img src={resultUrl} alt="styled" className="w-full rounded-xl mb-3" />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!player || saving || saved) return
                  setSaving(true)
                  try {
                    const res = await fetch(resultUrl!)
                    const blob = await res.blob()
                    const formData = new FormData()
                    formData.append('file', blob, 'styled-photo.jpg')
                    formData.append('playerId', player.id)
                    formData.append('teamId', '0')
                    const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
                    if (!uploadRes.ok) throw new Error('Save failed')
                    setSaved(true)
                  } catch { setError('שגיאה בשמירה') }
                  finally { setSaving(false) }
                }}
                disabled={saving || saved}
                className={`flex-1 py-2 text-center font-bold rounded-xl text-sm ${saved ? 'bg-green-500 text-white' : 'bg-hoopoe text-white'}`}
              >
                {saved ? '✅ נשמר בגלריה!' : saving ? '⏳ שומר...' : '💾 שמירה לגלריה'}
              </button>
              <button
                onClick={() => { setResultUrl(null); setSelectedStyle(null); setSaved(false) }}
                className="flex-1 py-2 bg-gray-100 text-desert-brown text-center font-bold rounded-xl text-sm"
              >
                🔄 נסו סגנון אחר
              </button>
            </div>
            <p className="text-center text-xs text-hoopoe mt-2">+5 נקודות! ⭐</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
