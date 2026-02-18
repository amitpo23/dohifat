'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/browser'
import type { TriviaQuestion } from '@/lib/types'

interface AdminTriviaProps {
  questions: TriviaQuestion[]
  setQuestions: React.Dispatch<React.SetStateAction<TriviaQuestion[]>>
}

export function AdminTrivia({ questions, setQuestions }: AdminTriviaProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    question: '',
    opt0: '',
    opt1: '',
    opt2: '',
    opt3: '',
    correctIndex: 0,
    points: 10,
    category: '',
  })

  const resetForm = () => {
    setFormData({ question: '', opt0: '', opt1: '', opt2: '', opt3: '', correctIndex: 0, points: 10, category: '' })
    setEditingId(null)
    setShowForm(false)
  }

  const startEdit = (q: TriviaQuestion) => {
    setFormData({
      question: q.question,
      opt0: q.options[0] || '',
      opt1: q.options[1] || '',
      opt2: q.options[2] || '',
      opt3: q.options[3] || '',
      correctIndex: q.correct_index,
      points: q.points,
      category: q.category || '',
    })
    setEditingId(q.id)
    setShowForm(true)
  }

  const save = async () => {
    const supabase = createClient()
    const payload = {
      question: formData.question,
      options: [formData.opt0, formData.opt1, formData.opt2, formData.opt3],
      correct_index: formData.correctIndex,
      points: formData.points,
      category: formData.category || null,
    }

    if (editingId) {
      const { data } = await supabase
        .from('trivia_questions')
        .update(payload)
        .eq('id', editingId)
        .select()
        .single()

      if (data) {
        setQuestions((prev) => prev.map((q) => (q.id === editingId ? data as TriviaQuestion : q)))
      }
    } else {
      const { data } = await supabase
        .from('trivia_questions')
        .insert(payload)
        .select()
        .single()

      if (data) {
        setQuestions((prev) => [...prev, data as TriviaQuestion])
      }
    }
    resetForm()
  }

  const toggleActive = async (q: TriviaQuestion) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('trivia_questions')
      .update({ active: !q.active })
      .eq('id', q.id)
      .select()
      .single()

    if (data) {
      setQuestions((prev) => prev.map((item) => (item.id === q.id ? data as TriviaQuestion : item)))
    }
  }

  const deleteQuestion = async (id: number) => {
    const supabase = createClient()
    await supabase.from('trivia_questions').delete().eq('id', id)
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={() => { resetForm(); setShowForm(true) }}
          className="px-4 py-2 bg-accent-teal text-white text-sm font-bold rounded-xl"
        >
          + הוסף שאלה
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 space-y-3">
          <h3 className="font-bold text-desert-brown text-sm">
            {editingId ? 'עריכת שאלה' : 'שאלה חדשה'}
          </h3>
          <textarea
            value={formData.question}
            onChange={(e) => setFormData({ ...formData, question: e.target.value })}
            placeholder="טקסט השאלה..."
            className="w-full p-2 border border-desert-brown/10 rounded-lg text-sm resize-none h-16"
          />
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-1">
                <input
                  type="radio"
                  name="correct"
                  checked={formData.correctIndex === i}
                  onChange={() => setFormData({ ...formData, correctIndex: i })}
                  className="accent-accent-teal"
                />
                <input
                  value={formData[`opt${i}` as keyof typeof formData] as string}
                  onChange={(e) => setFormData({ ...formData, [`opt${i}`]: e.target.value })}
                  placeholder={`תשובה ${i + 1}`}
                  className="flex-1 p-2 border border-desert-brown/10 rounded-lg text-sm"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={formData.points}
              onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
              placeholder="נקודות"
              className="w-20 p-2 border border-desert-brown/10 rounded-lg text-sm"
            />
            <input
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="קטגוריה"
              className="flex-1 p-2 border border-desert-brown/10 rounded-lg text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={!formData.question || !formData.opt0 || !formData.opt1 || !formData.opt2 || !formData.opt3}
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
        {questions.map((q) => (
          <div
            key={q.id}
            className={`bg-white rounded-xl shadow-sm p-3 ${!q.active ? 'opacity-50' : ''}`}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-desert-brown truncate">{q.question}</p>
                <div className="flex items-center gap-2 mt-1">
                  {q.category && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-hoopoe/10 text-hoopoe">
                      {q.category}
                    </span>
                  )}
                  <span className="text-xs text-desert-brown/40">{q.points} נק׳</span>
                  <span className="text-xs text-desert-brown/40">
                    {q.options.length} תשובות
                  </span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleActive(q)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold ${
                    q.active ? 'bg-accent-teal/10 text-accent-teal' : 'bg-desert-brown/10 text-desert-brown/40'
                  }`}
                >
                  {q.active ? '✓' : '✗'}
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(q)}
                  className="w-8 h-8 bg-accent-gold/10 text-accent-gold rounded-lg text-xs font-bold"
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => deleteQuestion(q.id)}
                  className="w-8 h-8 bg-accent-red/10 text-accent-red rounded-lg text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
