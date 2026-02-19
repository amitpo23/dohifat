'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlayer } from '@/hooks/usePlayer'
import { createClient } from '@/lib/supabase/browser'
import Link from 'next/link'

const EFFECTS = [
  { id: 'crown', label: 'כתר', emoji: '👑', prompt: 'add a golden royal crown on the persons head, keep everything else the same' },
  { id: 'sunglasses', label: 'משקפי שמש', emoji: '😎', prompt: 'add cool reflective sunglasses on the persons face, keep everything else the same' },
  { id: 'hat', label: 'כובע מסיבה', emoji: '🎩', prompt: 'add a colorful party hat on the persons head, keep everything else the same' },
  { id: 'mustache', label: 'שפם', emoji: '🥸', prompt: 'add a big funny curly mustache on the persons face, keep everything else the same' },
  { id: 'sparkles', label: 'ניצוצות', emoji: '✨', prompt: 'add magical sparkles and glitter effects all around the person, fairy dust' },
  { id: 'flowers', label: 'כתר פרחים', emoji: '🌺', prompt: 'add a beautiful flower crown wreath on the persons head' },
  { id: 'superhero', label: 'גיבור על', emoji: '🦸', prompt: 'transform person into a superhero with cape and mask, heroic pose' },
  { id: 'vintage', label: 'וינטג\'', emoji: '📷', prompt: 'make the photo look like vintage 1970s polaroid with warm tones and light leaks' },
  { id: 'neon', label: 'ניאון', emoji: '💜', prompt: 'add neon glow effects around the person, cyberpunk neon lights pink and blue' },
  { id: 'angel', label: 'מלאך', emoji: '😇', prompt: 'add angel wings and golden halo above the persons head' },
  { id: 'fire', label: 'אש', emoji: '🔥', prompt: 'add dramatic fire and flames effects around the person' },
  { id: 'rainbow', label: 'קשת', emoji: '🌈', prompt: 'add a beautiful rainbow behind the person with colorful light effects' },
]

export default function PhotoboothPage() {
  const { player } = usePlayer()
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedEffect, setSelectedEffect] = useState<string | null>(null)
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
    if (!selectedImage || !selectedEffect) return
    setLoading(true)
    setError('')
    setResultUrl(null)

    const effect = EFFECTS.find(e => e.id === selectedEffect)
    if (!effect) return

    try {
      const res = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: selectedImage, prompt: effect.prompt }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResultUrl(data.resultUrl)

      if (player) {
        const supabase = createClient()
        await supabase.from('score_log').insert({
          player_id: player.id,
          points: 5,
          reason: 'photobooth',
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת האפקט')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto" dir="rtl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/game/games" className="text-desert-brown/50 hover:text-desert-brown">←</Link>
        <h1 className="text-xl font-black text-desert-brown">📸 פוטובוט</h1>
      </div>

      {/* Upload */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-4 shadow-sm mb-4"
      >
        <input ref={fileRef} type="file" accept="image/*" capture="user" onChange={handleUpload} className="hidden" />
        {selectedImage ? (
          <div className="relative">
            <img src={selectedImage} alt="selfie" className="w-full rounded-xl max-h-64 object-cover" />
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
            🤳 צלמו סלפי או העלו תמונה
          </button>
        )}
      </motion.div>

      {/* Effects grid */}
      {selectedImage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 shadow-sm mb-4"
        >
          <h2 className="font-bold text-desert-brown mb-3">בחרו אפקט:</h2>
          <div className="grid grid-cols-4 gap-2">
            {EFFECTS.map(effect => (
              <button
                key={effect.id}
                onClick={() => setSelectedEffect(effect.id)}
                className={`p-2.5 rounded-xl text-center transition-all ${
                  selectedEffect === effect.id
                    ? 'bg-hoopoe/20 ring-2 ring-hoopoe scale-105'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="text-xl mb-0.5">{effect.emoji}</div>
                <div className="text-[10px] font-medium text-desert-brown leading-tight">{effect.label}</div>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Generate */}
      {selectedImage && selectedEffect && !loading && !resultUrl && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={handleGenerate}
          className="w-full py-3 bg-gradient-to-r from-hoopoe to-accent-gold text-white font-bold rounded-2xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all mb-4"
        >
          📸 יצירת אפקט!
        </motion.button>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="animate-bounce text-4xl mb-3">📸</div>
          <p className="text-desert-brown/60">מייצר אפקט... (10-20 שניות)</p>
        </div>
      )}

      {error && (
        <div className="bg-accent-red/10 text-accent-red p-3 rounded-xl text-center text-sm mb-4">{error}</div>
      )}

      <AnimatePresence>
        {resultUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-4 shadow-sm"
          >
            <h2 className="font-bold text-desert-brown mb-3">🎉 התוצאה:</h2>
            <img src={resultUrl} alt="result" className="w-full rounded-xl mb-3" />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!player || saving || saved) return
                  setSaving(true)
                  try {
                    const res = await fetch(resultUrl!)
                    const blob = await res.blob()
                    const formData = new FormData()
                    formData.append('file', blob, 'photobooth.jpg')
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
              <button onClick={() => { setResultUrl(null); setSelectedEffect(null); setSaved(false) }} className="flex-1 py-2 bg-gray-100 text-desert-brown text-center font-bold rounded-xl text-sm">🔄 אפקט אחר</button>
            </div>
            <p className="text-center text-xs text-hoopoe mt-2">+5 נקודות! ⭐</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
