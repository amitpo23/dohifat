'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlayer } from '@/hooks/usePlayer'
import { createClient } from '@/lib/supabase/browser'
import Link from 'next/link'

const BACKGROUNDS = [
  { id: 'beach', label: 'חוף ים', emoji: '🏖️', prompt: 'same person but placed on a beautiful tropical beach with turquoise water and palm trees' },
  { id: 'space', label: 'חלל', emoji: '🚀', prompt: 'same person but placed in outer space with stars, galaxies and nebulas in background' },
  { id: 'city', label: 'עיר', emoji: '🌆', prompt: 'same person but placed in a modern city skyline at sunset with skyscrapers' },
  { id: 'forest', label: 'יער', emoji: '🌲', prompt: 'same person but placed in an enchanted magical forest with glowing lights' },
  { id: 'castle', label: 'טירה', emoji: '🏰', prompt: 'same person but placed in front of a majestic medieval castle' },
  { id: 'underwater', label: 'מתחת למים', emoji: '🐠', prompt: 'same person but placed underwater with colorful coral reef and tropical fish' },
  { id: 'mountains', label: 'הרים', emoji: '⛰️', prompt: 'same person but placed on a mountain peak with dramatic clouds and sunrise' },
  { id: 'party', label: 'מסיבה', emoji: '🎉', prompt: 'same person but placed at an epic party with confetti, lights and decorations' },
]

export default function BackgroundPage() {
  const { player } = usePlayer()
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedBg, setSelectedBg] = useState<string | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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
    if (!selectedImage || (!selectedBg && !customPrompt.trim())) return
    setLoading(true)
    setError('')
    setResultUrl(null)

    const bg = BACKGROUNDS.find(b => b.id === selectedBg)
    const prompt = customPrompt.trim() 
      ? `same person but background changed to: ${customPrompt.trim()}`
      : bg?.prompt || ''

    try {
      const res = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: selectedImage, prompt }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResultUrl(data.resultUrl)

      if (player) {
        const supabase = createClient()
        await supabase.from('score_log').insert({
          player_id: player.id,
          points: 5,
          reason: 'background_replace',
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהחלפת רקע')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto" dir="rtl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/game/games" className="text-desert-brown/50 hover:text-desert-brown">←</Link>
        <h1 className="text-xl font-black text-desert-brown">🏝️ החלפת רקע</h1>
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

      {/* Background picker */}
      {selectedImage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 shadow-sm mb-4"
        >
          <h2 className="font-bold text-desert-brown mb-3">בחרו רקע:</h2>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {BACKGROUNDS.map(bg => (
              <button
                key={bg.id}
                onClick={() => { setSelectedBg(bg.id); setCustomPrompt('') }}
                className={`p-3 rounded-xl text-center transition-all ${
                  selectedBg === bg.id
                    ? 'bg-hoopoe/20 ring-2 ring-hoopoe scale-105'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="text-2xl mb-1">{bg.emoji}</div>
                <div className="text-xs font-medium text-desert-brown">{bg.label}</div>
              </button>
            ))}
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="או כתבו רקע מותאם אישית..."
              value={customPrompt}
              onChange={e => { setCustomPrompt(e.target.value); setSelectedBg(null) }}
              className="w-full p-3 rounded-xl bg-gray-50 text-desert-brown text-sm border-none outline-none focus:ring-2 focus:ring-hoopoe"
            />
          </div>
        </motion.div>
      )}

      {/* Generate */}
      {selectedImage && (selectedBg || customPrompt.trim()) && !loading && !resultUrl && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={handleGenerate}
          className="w-full py-3 bg-hoopoe text-white font-bold rounded-2xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all mb-4"
        >
          🏝️ החלפת רקע!
        </motion.button>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin text-4xl mb-3">🌍</div>
          <p className="text-desert-brown/60">מחליף רקע... (10-20 שניות)</p>
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
              <a href={resultUrl} download="new-background.png" target="_blank" className="flex-1 py-2 bg-hoopoe text-white text-center font-bold rounded-xl text-sm">💾 שמירה</a>
              <button onClick={() => { setResultUrl(null); setSelectedBg(null); setCustomPrompt('') }} className="flex-1 py-2 bg-gray-100 text-desert-brown text-center font-bold rounded-xl text-sm">🔄 רקע אחר</button>
            </div>
            <p className="text-center text-xs text-hoopoe mt-2">+5 נקודות! ⭐</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
