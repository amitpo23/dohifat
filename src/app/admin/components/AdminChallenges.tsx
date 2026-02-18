'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { SEGMENTS } from '@/lib/schedule'
import { toast } from 'sonner'
import type { Challenge, ChallengeType } from '@/lib/types'

const TYPE_OPTIONS: { value: ChallengeType; label: string }[] = [
  { value: 'photo', label: '📸 תמונה' },
  { value: 'field', label: '🎯 משימת שטח' },
  { value: 'video', label: '🎬 וידאו' },
  { value: 'photo_match', label: '🖼️ תמונה זהה' },
]

const TYPE_LABELS: Record<ChallengeType, { emoji: string; label: string }> = {
  photo: { emoji: '📸', label: 'תמונה' },
  field: { emoji: '🎯', label: 'שטח' },
  video: { emoji: '🎬', label: 'וידאו' },
  photo_match: { emoji: '🖼️', label: 'תמונה זהה' },
}

interface AdminChallengesProps {
  challenges: Challenge[]
  setChallenges: React.Dispatch<React.SetStateAction<Challenge[]>>
}

export function AdminChallenges({ challenges, setChallenges }: AdminChallengesProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [segmentFilter, setSegmentFilter] = useState(0)
  const [uploadingRef, setUploadingRef] = useState(false)
  const refImageInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    key: '',
    segment: 1,
    title: '',
    description: '',
    points: 10,
    type: 'field' as ChallengeType,
    icon: '🎯',
    sort_order: 0,
    reference_image: '',
  })

  const resetForm = () => {
    setForm({ key: '', segment: 1, title: '', description: '', points: 10, type: 'field', icon: '🎯', sort_order: 0, reference_image: '' })
    setEditingId(null)
    setShowForm(false)
  }

  const startEdit = (c: Challenge) => {
    setForm({
      key: c.key,
      segment: c.segment,
      title: c.title,
      description: c.description || '',
      points: c.points,
      type: c.type,
      icon: c.icon,
      sort_order: c.sort_order,
      reference_image: c.reference_image || '',
    })
    setEditingId(c.id)
    setShowForm(true)
  }

  const uploadReferenceImage = async (file: File) => {
    setUploadingRef(true)
    const supabase = createClient()
    const fileName = `reference/${Date.now()}_${file.name}`
    const arrayBuffer = await file.arrayBuffer()

    const { error } = await supabase.storage
      .from('photos')
      .upload(fileName, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      toast.error('שגיאה בהעלאת תמונת מקור')
      setUploadingRef(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName)

    setForm((prev) => ({ ...prev, reference_image: publicUrl }))
    toast.success('תמונת מקור הועלתה')
    setUploadingRef(false)
  }

  const removeReferenceImage = () => {
    setForm((prev) => ({ ...prev, reference_image: '' }))
    if (refImageInputRef.current) {
      refImageInputRef.current.value = ''
    }
  }

  const save = async () => {
    const supabase = createClient()
    const payload = {
      key: form.key,
      segment: form.segment,
      title: form.title,
      description: form.description || null,
      points: form.points,
      type: form.type,
      icon: form.icon,
      sort_order: form.sort_order,
      reference_image: form.reference_image || null,
    }

    if (editingId) {
      const { data } = await supabase
        .from('challenges')
        .update(payload)
        .eq('id', editingId)
        .select()
        .single()

      if (data) {
        setChallenges((prev) => prev.map((c) => (c.id === editingId ? data as Challenge : c)))
        toast.success('משימה עודכנה')
      }
    } else {
      const { data } = await supabase
        .from('challenges')
        .insert({ ...payload, active: true })
        .select()
        .single()

      if (data) {
        setChallenges((prev) => [...prev, data as Challenge])
        toast.success('משימה נוספה')
      }
    }
    resetForm()
  }

  const toggleActive = async (c: Challenge) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('challenges')
      .update({ active: !c.active })
      .eq('id', c.id)
      .select()
      .single()

    if (data) {
      setChallenges((prev) => prev.map((item) => (item.id === c.id ? data as Challenge : item)))
    }
  }

  const deleteChallenge = async (id: number) => {
    const supabase = createClient()
    await supabase.from('challenges').delete().eq('id', id)
    setChallenges((prev) => prev.filter((c) => c.id !== id))
    toast.success('משימה נמחקה')
  }

  const filtered = segmentFilter === 0
    ? challenges
    : challenges.filter((c) => c.segment === segmentFilter)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => setSegmentFilter(0)}
            className={`px-2 py-1 rounded-lg text-xs font-bold ${segmentFilter === 0 ? 'bg-hoopoe text-white' : 'bg-desert-brown/10 text-desert-brown'}`}
          >
            הכל
          </button>
          {SEGMENTS.map((seg) => (
            <button
              key={seg.id}
              type="button"
              onClick={() => setSegmentFilter(seg.id)}
              className={`px-2 py-1 rounded-lg text-xs font-bold ${segmentFilter === seg.id ? 'bg-hoopoe text-white' : 'bg-desert-brown/10 text-desert-brown'}`}
            >
              {seg.icon} יום {seg.id}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => { resetForm(); setShowForm(true) }}
          className="px-3 py-1.5 bg-accent-teal text-white text-xs font-bold rounded-xl"
        >
          + הוסף
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 space-y-3">
          <h3 className="font-bold text-desert-brown text-sm">
            {editingId ? 'עריכת משימה' : 'משימה חדשה'}
          </h3>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="שם המשימה..."
            className="w-full p-2 border border-desert-brown/10 rounded-lg text-sm"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="תיאור המשימה (אופציונלי)..."
            className="w-full p-2 border border-desert-brown/10 rounded-lg text-sm resize-none h-16"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-desert-brown/50 block mb-1">מפתח (ייחודי)</label>
              <input
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                placeholder="s1p1"
                className="w-full p-2 border border-desert-brown/10 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-desert-brown/50 block mb-1">יום</label>
              <select
                value={form.segment}
                onChange={(e) => setForm({ ...form, segment: Number(e.target.value) })}
                className="w-full p-2 border border-desert-brown/10 rounded-lg text-sm"
              >
                {SEGMENTS.map((seg) => (
                  <option key={seg.id} value={seg.id}>{seg.icon} יום {seg.id} - {seg.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-desert-brown/50 block mb-1">סוג</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as ChallengeType })}
                className="w-full p-2 border border-desert-brown/10 rounded-lg text-sm"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-desert-brown/50 block mb-1">נקודות</label>
              <input
                type="number"
                value={form.points}
                onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
                className="w-full p-2 border border-desert-brown/10 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-desert-brown/50 block mb-1">אייקון</label>
              <input
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="w-full p-2 border border-desert-brown/10 rounded-lg text-sm text-center text-lg"
                maxLength={4}
              />
            </div>
            <div>
              <label className="text-xs text-desert-brown/50 block mb-1">סדר</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                className="w-full p-2 border border-desert-brown/10 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Reference image upload for photo_match type */}
          {form.type === 'photo_match' && (
            <div className="space-y-2">
              <label className="text-xs text-desert-brown/50 block">תמונת מקור (להשוואה)</label>
              {form.reference_image ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.reference_image}
                    alt="תמונת מקור"
                    className="w-20 h-20 object-cover rounded-lg border border-desert-brown/10"
                  />
                  <button
                    type="button"
                    onClick={removeReferenceImage}
                    className="px-3 py-1.5 bg-accent-red/10 text-accent-red text-xs font-bold rounded-lg"
                  >
                    הסר תמונה
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    ref={refImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) uploadReferenceImage(file)
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => refImageInputRef.current?.click()}
                    disabled={uploadingRef}
                    className="px-4 py-2 bg-accent-gold/10 text-accent-gold text-sm font-bold rounded-lg disabled:opacity-40"
                  >
                    {uploadingRef ? '⏳ מעלה...' : '🖼️ העלה תמונת מקור'}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={!form.title || !form.key}
              className="px-4 py-2 bg-accent-teal text-white text-sm font-bold rounded-lg disabled:opacity-40"
            >
              {editingId ? 'עדכן' : 'הוסף'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-desert-brown/10 text-desert-brown text-sm font-bold rounded-lg"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((c) => {
          const typeInfo = TYPE_LABELS[c.type] || TYPE_LABELS.field
          return (
            <div
              key={c.id}
              className={`bg-white rounded-xl shadow-sm p-3 ${!c.active ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start gap-2">
                <span className="text-xl">{c.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-desert-brown truncate">{c.title}</p>
                  {c.description && (
                    <p className="text-xs text-desert-brown/50 mt-0.5 line-clamp-1">{c.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-hoopoe/10 text-hoopoe">
                      יום {c.segment}
                    </span>
                    <span className="text-xs text-desert-brown/40">{c.points} נק׳</span>
                    <span className="text-xs text-desert-brown/40">
                      {typeInfo.emoji} {typeInfo.label}
                    </span>
                    {c.type === 'photo_match' && c.reference_image && (
                      <span className="text-xs text-accent-gold">🖼️</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleActive(c)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold ${
                      c.active ? 'bg-accent-teal/10 text-accent-teal' : 'bg-desert-brown/10 text-desert-brown/40'
                    }`}
                  >
                    {c.active ? '✓' : '✗'}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    className="w-8 h-8 bg-accent-gold/10 text-accent-gold rounded-lg text-xs font-bold"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteChallenge(c.id)}
                    className="w-8 h-8 bg-accent-red/10 text-accent-red rounded-lg text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-desert-brown/40 text-center py-4">אין משימות למקטע זה</p>
      )}
    </div>
  )
}
