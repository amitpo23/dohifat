'use client'

import { useState } from 'react'
import { usePlayer } from '@/hooks/usePlayer'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { BackButton } from '@/components/BackButton'

const PROMPT_IDEAS = [
  'אמא ודודה כדוכיפתיות על גמל במדבר',
  'המשפחה בטיול בחלל עם כובעי מסיבה',
  'דוכיפת ענקית שרה קריוקי בערבה',
  'כל המשפחה כגיבורי על במדבר',
  'מסיבת יומהולדת עם גמלים רוקדים',
  'שקיעה קסומה בערבה עם דוכיפתיות',
]

export default function ImaginePage() {
  const { player, team } = usePlayer()
  const [prompt, setPrompt] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleGenerate = async () => {
    if (!prompt.trim() || !player || !team) return
    setLoading(true)
    setImageUrl(null)

    try {
      const res = await fetch('/api/imagine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      })

      const { imageUrl: url, error } = await res.json()
      if (error) throw new Error(error)

      setImageUrl(url)
      setImageLoading(true)
      setSaved(false)
    } catch {
      toast.error('שגיאה ביצירת התמונה')
      setLoading(false)
    }
  }

  return (
    <div className="p-4">
      <BackButton href="/game" label="ראשי" />
      <h1 className="text-xl font-black text-desert-brown mb-2 flex items-center gap-2">
        🎨 תארו את הדוכיפתיות
      </h1>
      <p className="text-sm text-desert-brown/50 mb-4">
        כתבו תיאור ו-AI ייצור תמונה!
      </p>

      {/* Prompt ideas */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PROMPT_IDEAS.map((idea) => (
          <button
            key={idea}
            type="button"
            onClick={() => setPrompt(idea)}
            className="text-xs px-3 py-1.5 rounded-full bg-hoopoe/10 text-hoopoe"
          >
            {idea}
          </button>
        ))}
      </div>

      {/* Prompt input */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="...תארו מה אתם רוצים לראות"
        className="w-full p-3 rounded-xl border-2 border-desert-brown/10 bg-white
                   focus:outline-none focus:border-hoopoe resize-none h-24 text-sm mb-4"
        maxLength={200}
      />

      {/* Generate button */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={!prompt.trim() || loading}
        className="w-full py-3 bg-accent-purple text-white font-bold rounded-xl
                   disabled:opacity-40 transition-all"
      >
        {loading ? '🎨 ...יוצר תמונה' : '!צרו תמונה ✨'}
      </button>

      {/* Result */}
      {imageUrl && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          <p className="text-sm font-bold text-desert-brown mb-2">התוצאה:</p>

          {/* Loading placeholder while image generates */}
          {imageLoading && (
            <div className="w-full aspect-square bg-desert-brown/5 rounded-2xl flex items-center justify-center">
              <div className="text-center">
                <span className="text-4xl block mb-2 animate-pulse">🎨</span>
                <span className="text-sm text-desert-brown/40">...התמונה נוצרת</span>
              </div>
            </div>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={prompt}
            className={`w-full rounded-2xl shadow-lg ${imageLoading ? 'hidden' : ''}`}
            onLoad={() => {
              setImageLoading(false)
              setLoading(false)
              toast.success('!התמונה נוצרה בהצלחה 🎨')
            }}
            onError={() => {
              setImageLoading(false)
              setLoading(false)
              setImageUrl(null)
              toast.error('שגיאה ביצירת התמונה, נסו שוב')
            }}
          />

          {!imageLoading && (
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                disabled={saving || saved || !player || !team}
                onClick={async () => {
                  if (!player || !team) return
                  setSaving(true)
                  try {
                    const res = await fetch(imageUrl)
                    const blob = await res.blob()
                    const formData = new FormData()
                    formData.append('file', blob, 'ai-image.jpg')
                    formData.append('playerId', player.id)
                    formData.append('teamId', String(team.id))
                    const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
                    if (!uploadRes.ok) throw new Error('Save failed')
                    setSaved(true)
                    toast.success('!נשמר בגלריה 📸')
                  } catch {
                    toast.error('שגיאה בשמירה לגלריה')
                  } finally {
                    setSaving(false)
                  }
                }}
                className={`flex-1 py-2 font-bold rounded-xl text-sm transition-all ${
                  saved
                    ? 'bg-accent-teal/10 text-accent-teal'
                    : 'bg-hoopoe text-white disabled:opacity-40'
                }`}
              >
                {saved ? '✓ נשמר בגלריה' : saving ? '...שומר' : '📸 שמרו בגלריה'}
              </button>
              <a
                href={imageUrl}
                download="duchifat-ai.webp"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-desert-brown/10 text-desert-brown font-bold rounded-xl text-sm"
              >
                📥 הורד
              </a>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
