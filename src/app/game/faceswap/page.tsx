'use client'

import { useState } from 'react'
import { usePlayer } from '@/hooks/usePlayer'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { resizeImage } from '@/lib/image-utils'
import { BackButton } from '@/components/BackButton'

const TEMPLATES = [
  { name: 'מונה ליזה', icon: '🎨', prompt: 'Mona Lisa painting by Leonardo da Vinci' },
  { name: 'סופרהירו', icon: '🦸', prompt: 'Superhero in a cape flying over a city' },
  { name: 'אסטרונאוט/ית', icon: '🚀', prompt: 'Astronaut on the moon with Earth in background' },
  { name: 'שף מפורסם', icon: '👨‍🍳', prompt: 'Famous chef in a professional kitchen' },
  { name: 'רוקסטאר', icon: '🎸', prompt: 'Rock star performing on stage with lights' },
  { name: 'מלכות', icon: '👑', prompt: 'Royal portrait in a palace throne room' },
]

export default function FaceSwapPage() {
  const { player } = usePlayer()
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [sourcePreview, setSourcePreview] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSourceSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSourceFile(file)
    // Show preview
    const url = URL.createObjectURL(file)
    setSourcePreview(url)
    setResultUrl(null)
  }

  const handleSwap = async () => {
    if (!selectedTemplate || !sourceFile || !player) return
    setLoading(true)

    try {
      // Resize before upload
      const resized = await resizeImage(sourceFile, 800)

      // Upload source photo
      const formData = new FormData()
      formData.append('file', resized)
      formData.append('playerId', player.id)
      formData.append('teamId', '0')

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!uploadRes.ok) throw new Error('Upload failed')
      const { url: sourceUrl } = await uploadRes.json()

      // Call face swap API with the template prompt
      const res = await fetch('/api/faceswap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetImageUrl: selectedTemplate,
          swapImageUrl: sourceUrl,
        }),
      })

      const { resultUrl: result, error } = await res.json()
      if (error) throw new Error(error)

      setResultUrl(result)
      toast.success('!החלפת הפנים הצליחה 🎭')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'שגיאה בהחלפת הפנים'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4">
      <BackButton href="/game" label="ראשי" />
      <h1 className="text-xl font-black text-desert-brown mb-4 flex items-center gap-2">
        🎭 החלפת פנים
      </h1>

      {/* Step 1: Upload face */}
      <div className="mb-6">
        <p className="text-sm font-bold text-desert-brown/70 mb-2 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-hoopoe text-white text-xs flex items-center justify-center font-black">1</span>
          העלו תמונת פנים
        </p>
        <label className="block w-full p-4 bg-white rounded-xl shadow-sm text-center cursor-pointer transition-all active:scale-[0.98]">
          {sourcePreview ? (
            <div className="flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sourcePreview}
                alt="תמונת המקור"
                className="w-24 h-24 rounded-full object-cover mx-auto"
              />
              <span className="text-xs text-accent-teal font-bold">לחצו להחלפה</span>
            </div>
          ) : (
            <div className="py-4">
              <span className="text-4xl block mb-2">🤳</span>
              <span className="text-sm text-desert-brown/40">לחצו לצילום או בחירת תמונה</span>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleSourceSelect}
            className="hidden"
          />
        </label>
      </div>

      {/* Step 2: Choose template */}
      <div className="mb-6">
        <p className="text-sm font-bold text-desert-brown/70 mb-2 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-hoopoe text-white text-xs flex items-center justify-center font-black">2</span>
          בחרו סגנון
        </p>
        <div className="grid grid-cols-3 gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() => setSelectedTemplate(t.prompt)}
              className={`p-3 rounded-xl text-center transition-all active:scale-95
                ${selectedTemplate === t.prompt ? 'bg-hoopoe/10 ring-2 ring-hoopoe scale-105' : 'bg-white shadow-sm'}
              `}
            >
              <span className="text-2xl block mb-1">{t.icon}</span>
              <span className="text-xs font-medium text-desert-brown">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 3: Go! */}
      <button
        type="button"
        onClick={handleSwap}
        disabled={!selectedTemplate || !sourceFile || loading}
        className="w-full py-3 bg-hoopoe text-white font-bold rounded-xl
                   disabled:opacity-40 transition-all active:scale-[0.98] text-lg"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">🎭</span>
            ...מעבד, ייקח כמה שניות
          </span>
        ) : (
          '!בואו נחליף פנים 🎭'
        )}
      </button>

      {loading && (
        <div className="mt-4 text-center">
          <div className="w-full h-2 bg-desert-brown/10 rounded-full overflow-hidden">
            <div className="h-full bg-hoopoe rounded-full animate-pulse w-2/3" />
          </div>
          <p className="text-xs text-desert-brown/40 mt-2">העיבוד לוקח עד 30 שניות...</p>
        </div>
      )}

      {/* Result */}
      {resultUrl && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          <p className="text-sm font-bold text-desert-brown mb-2">התוצאה:</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resultUrl}
            alt="תוצאת החלפת פנים"
            className="w-full rounded-2xl shadow-lg"
          />
          <div className="flex gap-2 mt-3">
            <a
              href={resultUrl}
              download="faceswap-result.jpg"
              className="flex-1 py-2 bg-accent-teal text-white font-bold rounded-xl text-center text-sm"
            >
              💾 שמירה
            </a>
            <button
              type="button"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ text: '🎭 החלפת פנים מהדוכיפתיות!', url: resultUrl }).catch(() => {})
                }
              }}
              className="flex-1 py-2 bg-accent-blue text-white font-bold rounded-xl text-sm"
            >
              📤 שיתוף
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
