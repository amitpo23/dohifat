'use client'

import { useState } from 'react'
import { usePlayer } from '@/hooks/usePlayer'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { resizeImage } from '@/lib/image-utils'
import { BackButton } from '@/components/BackButton'

const PROMPT_IDEAS = [
  'הדוכיפתיות רוקדות במדבר',
  'טיול משפחתי בין הכוכבים',
  'מסיבת יומהולדת עם גמלים',
  'שקיעה קסומה בערבה',
]

const TEXT_VIDEO_IDEAS = [
  'דוכיפת עפה מעל המדבר בשקיעה',
  'חתול חמוד רוקד על הירח',
  'עיר עתידנית צפה בעננים',
  'דרקון אש עף מעל טירה',
]

type Tab = 'image' | 'text'

export default function VideoPage() {
  const { player, team } = usePlayer()
  const [activeTab, setActiveTab] = useState<Tab>('image')
  
  // Image to video state
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [sourcePreview, setSourcePreview] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Text to video state
  const [textPrompt, setTextPrompt] = useState('')
  const [textVideoUrl, setTextVideoUrl] = useState<string | null>(null)
  const [textLoading, setTextLoading] = useState(false)
  const [textSaving, setTextSaving] = useState(false)
  const [textSaved, setTextSaved] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSourceFile(file)
    setSourcePreview(URL.createObjectURL(file))
  }

  const handleImageToVideo = async () => {
    if (!sourceFile || !player || !team) return
    setLoading(true)

    try {
      const resized = await resizeImage(sourceFile, 800)
      const formData = new FormData()
      formData.append('file', resized)
      formData.append('playerId', player.id)
      formData.append('teamId', '0')

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      const { url: uploadedUrl } = await uploadRes.json()

      const res = await fetch('/api/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: uploadedUrl,
          prompt: prompt.trim() || undefined,
        }),
      })

      const { videoUrl: url, error } = await res.json()
      if (error) throw new Error(error)

      setVideoUrl(url)
      setSaved(false)
      toast.success('!הסרטון נוצר בהצלחה 🎬')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'שגיאה ביצירת הסרטון'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleTextToVideo = async () => {
    if (!textPrompt.trim() || !player) return
    setTextLoading(true)

    try {
      // Generate image from text first via Pollinations
      const encodedPrompt = encodeURIComponent(textPrompt.trim())
      const seed = Math.floor(Math.random() * 1_000_000)
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true&model=flux`

      // Pre-fetch to generate
      await fetch(imageUrl, { method: 'HEAD' }).catch(() => {})

      // Now send to video API
      const res = await fetch('/api/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          prompt: textPrompt.trim(),
        }),
      })

      const { videoUrl: url, error } = await res.json()
      if (error) throw new Error(error)

      setTextVideoUrl(url)
      setTextSaved(false)
      toast.success('!הסרטון נוצר בהצלחה 🎬')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'שגיאה ביצירת הסרטון'
      toast.error(msg)
    } finally {
      setTextLoading(false)
    }
  }

  const saveVideo = async (url: string, isSaving: boolean, setIsSaving: (v: boolean) => void, setIsSaved: (v: boolean) => void) => {
    if (!player || !team || isSaving) return
    setIsSaving(true)
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const formData = new FormData()
      formData.append('file', new File([blob], 'ai-video.mp4', { type: 'video/mp4' }))
      formData.append('playerId', player.id)
      formData.append('teamId', String(team.id))
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!uploadRes.ok) throw new Error('Save failed')
      setIsSaved(true)
      toast.success('!נשמר בגלריה 🎬')
    } catch {
      toast.error('שגיאה בשמירה לגלריה')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-4" dir="rtl">
      <BackButton href="/game" label="ראשי" />
      <h1 className="text-xl font-black text-desert-brown mb-4 flex items-center gap-2">
        🎬 יצירת סרטון AI
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('image')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'image'
              ? 'bg-accent-purple text-white shadow-md'
              : 'bg-gray-100 text-desert-brown/60'
          }`}
        >
          📷 תמונה לסרטון
        </button>
        <button
          onClick={() => setActiveTab('text')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'text'
              ? 'bg-accent-purple text-white shadow-md'
              : 'bg-gray-100 text-desert-brown/60'
          }`}
        >
          ✏️ טקסט לסרטון
        </button>
      </div>

      {/* === IMAGE TO VIDEO TAB === */}
      {activeTab === 'image' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-sm text-desert-brown/50 mb-4">
            העלו תמונה וכתבו מה תרצו שיקרה בסרטון!
          </p>

          <p className="text-sm text-desert-brown/60 mb-2">📷 העלו תמונה:</p>
          <label className="block w-full p-4 bg-white rounded-xl shadow-sm text-center cursor-pointer mb-4">
            {sourcePreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sourcePreview} alt="תמונת מקור" className="w-full max-h-48 object-contain rounded-lg" />
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setSourceFile(null); setSourcePreview(null) }}
                  className="absolute top-1 left-1 w-6 h-6 bg-accent-red text-white rounded-full text-xs"
                >✕</button>
              </div>
            ) : (
              <span className="text-sm text-desert-brown/40">📸 לחצו לבחירת תמונה</span>
            )}
            <input type="file" accept="image/*" capture="user" onChange={handleFileSelect} className="hidden" />
          </label>

          <p className="text-sm text-desert-brown/60 mb-2">תארו מה יקרה בסרטון:</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {PROMPT_IDEAS.map((idea) => (
              <button key={idea} type="button" onClick={() => setPrompt(idea)}
                className="text-xs px-3 py-1.5 rounded-full bg-hoopoe/10 text-hoopoe">
                {idea}
              </button>
            ))}
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="...תארו מה יקרה בסרטון"
            className="w-full p-3 rounded-xl border-2 border-desert-brown/10 bg-white focus:outline-none focus:border-hoopoe resize-none h-20 text-sm mb-4"
            maxLength={300}
          />

          <button
            type="button"
            onClick={handleImageToVideo}
            disabled={!sourceFile || loading}
            className="w-full py-3 bg-accent-purple text-white font-bold rounded-xl disabled:opacity-40 transition-all"
          >
            {loading ? '🎬 ...יוצר סרטון (עד 2 דקות)' : '!צרו סרטון ✨'}
          </button>

          {videoUrl && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
              <p className="text-sm font-bold text-desert-brown mb-2">התוצאה:</p>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={videoUrl} controls autoPlay loop playsInline className="w-full rounded-2xl shadow-lg" />
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  disabled={saving || saved || !player || !team}
                  onClick={() => saveVideo(videoUrl, saving, setSaving, setSaved)}
                  className={`flex-1 py-2 font-bold rounded-xl text-sm transition-all ${saved ? 'bg-accent-teal/10 text-accent-teal' : 'bg-hoopoe text-white disabled:opacity-40'}`}
                >
                  {saved ? '✓ נשמר בגלריה' : saving ? '...שומר' : '📸 שמרו בגלריה'}
                </button>
                <a href={videoUrl} download="duchifat-video.mp4" target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2 bg-desert-brown/10 text-desert-brown font-bold rounded-xl text-sm">
                  📥 הורד
                </a>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* === TEXT TO VIDEO TAB === */}
      {activeTab === 'text' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-sm text-desert-brown/50 mb-4">
            כתבו תיאור ו-AI ייצור תמונה ויהפוך אותה לסרטון!
          </p>

          <p className="text-sm text-desert-brown/60 mb-2">רעיונות:</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {TEXT_VIDEO_IDEAS.map((idea) => (
              <button key={idea} type="button" onClick={() => setTextPrompt(idea)}
                className="text-xs px-3 py-1.5 rounded-full bg-accent-purple/10 text-accent-purple">
                {idea}
              </button>
            ))}
          </div>

          <textarea
            value={textPrompt}
            onChange={(e) => setTextPrompt(e.target.value)}
            placeholder="...תארו את הסצנה שתרצו ליצור"
            className="w-full p-3 rounded-xl border-2 border-desert-brown/10 bg-white focus:outline-none focus:border-accent-purple resize-none h-24 text-sm mb-4"
            maxLength={300}
          />

          <button
            type="button"
            onClick={handleTextToVideo}
            disabled={!textPrompt.trim() || textLoading}
            className="w-full py-3 bg-accent-purple text-white font-bold rounded-xl disabled:opacity-40 transition-all"
          >
            {textLoading ? '🎬 ...יוצר תמונה + סרטון (עד 3 דקות)' : '!צרו סרטון מטקסט ✨'}
          </button>

          {textVideoUrl && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
              <p className="text-sm font-bold text-desert-brown mb-2">התוצאה:</p>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={textVideoUrl} controls autoPlay loop playsInline className="w-full rounded-2xl shadow-lg" />
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  disabled={textSaving || textSaved || !player || !team}
                  onClick={() => saveVideo(textVideoUrl, textSaving, setTextSaving, setTextSaved)}
                  className={`flex-1 py-2 font-bold rounded-xl text-sm transition-all ${textSaved ? 'bg-accent-teal/10 text-accent-teal' : 'bg-hoopoe text-white disabled:opacity-40'}`}
                >
                  {textSaved ? '✓ נשמר בגלריה' : textSaving ? '...שומר' : '📸 שמרו בגלריה'}
                </button>
                <a href={textVideoUrl} download="duchifat-text-video.mp4" target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2 bg-desert-brown/10 text-desert-brown font-bold rounded-xl text-sm">
                  📥 הורד
                </a>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  )
}
