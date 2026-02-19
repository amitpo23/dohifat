'use client'

import { useState, useEffect, useRef } from 'react'
import { usePlayer } from '@/hooks/usePlayer'
import { createClient } from '@/lib/supabase/browser'
import type { TriviaQuestion } from '@/lib/types'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { playCorrect, playWrong, playTick } from '@/lib/sounds'
import { vibrateSuccess, vibrateError, vibrateLight } from '@/lib/haptics'
import { InfoBanner } from '@/components/InfoBanner'

const ANSWER_TIME = 15_000
const SPEED_BONUS_THRESHOLD = 5_000

export default function TriviaPage() {
  const { player, team } = usePlayer()
  const [questions, setQuestions] = useState<TriviaQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answeredIds, setAnsweredIds] = useState<Set<number>>(new Set())
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [timeLeft, setTimeLeft] = useState(ANSWER_TIME)
  const [questionStartTime, setQuestionStartTime] = useState(0)
  const [loading, setLoading] = useState(true)
  const [transitioning, setTransitioning] = useState(false)

  // Refs to avoid stale closures
  const answeredIdsRef = useRef(answeredIds)
  answeredIdsRef.current = answeredIds
  const selectedAnswerRef = useRef(selectedAnswer)
  selectedAnswerRef.current = selectedAnswer

  // Load questions from DB + previously answered
  useEffect(() => {
    if (!player) return
    const supabase = createClient()

    const loadData = async () => {
      const [questionsRes, answeredRes] = await Promise.all([
        supabase
          .from('trivia_questions')
          .select('*')
          .eq('active', true)
          .order('id'),
        supabase
          .from('trivia_answers')
          .select('question_id')
          .eq('player_id', player.id)
          .not('question_id', 'is', null),
      ])

      if (questionsRes.data) {
        const qs = questionsRes.data as TriviaQuestion[]
        setQuestions(qs)

        const answered = new Set<number>()
        if (answeredRes.data) {
          for (const a of answeredRes.data) {
            if (a.question_id) answered.add(a.question_id as number)
          }
        }
        setAnsweredIds(answered)
        answeredIdsRef.current = answered

        // Find first unanswered question
        const firstUnanswered = qs.findIndex((q) => !answered.has(q.id))
        if (firstUnanswered >= 0) {
          setCurrentIndex(firstUnanswered)
        }
      }
      setLoading(false)
    }

    loadData()
  }, [player])

  // Timer
  useEffect(() => {
    if (showResult || transitioning || questions.length === 0) return
    const question = questions[currentIndex]
    if (!question || answeredIdsRef.current.has(question.id)) return

    setTimeLeft(ANSWER_TIME)
    setQuestionStartTime(Date.now())

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 100
        if (next <= 0) {
          clearInterval(interval)
          if (selectedAnswerRef.current === null) {
            setShowResult(true)
            toast.error('!נגמר הזמן ⏰')
          }
          return 0
        }
        if (next <= 5000 && next % 1000 === 0) {
          playTick()
          vibrateLight()
        }
        return next
      })
    }, 100)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, showResult, transitioning, questions.length])

  const handleAnswer = async (choiceIndex: number) => {
    if (selectedAnswer !== null || !player || !team || showResult) return
    if (questions.length === 0) return

    const question = questions[currentIndex]
    const isCorrect = choiceIndex === question.correct_index
    const elapsed = Date.now() - questionStartTime

    let points = 0
    if (isCorrect) {
      points = question.points
      if (elapsed < SPEED_BONUS_THRESHOLD) {
        points += 5
      }
    }

    setSelectedAnswer(choiceIndex)
    setShowResult(true)

    if (isCorrect) {
      playCorrect()
      vibrateSuccess()
    } else {
      playWrong()
      vibrateError()
    }

    // Update answered set immediately
    const newAnswered = new Set([...answeredIds, question.id])
    setAnsweredIds(newAnswered)
    answeredIdsRef.current = newAnswered

    // Save answer
    const supabase = createClient()
    await supabase.from('trivia_answers').insert({
      player_id: player.id,
      question_index: currentIndex,
      question_id: question.id,
      correct: isCorrect,
      points_earned: points,
    })

    // Award points if correct
    if (points > 0) {
      await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: team.id,
          playerId: player.id,
          points,
          reason: `trivia:q${question.id}`,
        }),
      })
      toast.success(`+${points} נקודות! ${elapsed < SPEED_BONUS_THRESHOLD ? '⚡ בונוס מהירות!' : '🎉'}`)
    } else {
      toast.error('לא נכון... 😅')
    }
  }

  const goNext = () => {
    // Use ref for latest answeredIds (avoids stale closure)
    const currentAnswered = answeredIdsRef.current

    // Find next unanswered
    let next = currentIndex + 1
    while (next < questions.length && currentAnswered.has(questions[next].id)) {
      next++
    }

    if (next >= questions.length) {
      // All done - re-render will show completion screen
      setShowResult(false)
      setSelectedAnswer(null)
      return
    }

    // Transition: hide current, then show next
    setTransitioning(true)
    setShowResult(false)
    setSelectedAnswer(null)

    // Small delay to let React clear the old state before showing new question
    setTimeout(() => {
      setCurrentIndex(next)
      setTransitioning(false)
    }, 150)
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[300px]">
        <div className="text-4xl animate-pulse">🐦</div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="p-4 text-center py-16">
        <p className="text-5xl mb-4">❓</p>
        <h2 className="text-2xl font-black text-desert-brown mb-2">אין שאלות</h2>
        <p className="text-desert-brown/60">עדיין לא נוספו שאלות טריוויה</p>
      </div>
    )
  }

  const allAnswered = questions.every((q) => answeredIdsRef.current.has(q.id))

  if (allAnswered) {
    return (
      <div className="p-4 text-center py-16">
        <p className="text-5xl mb-4">🎉</p>
        <h2 className="text-2xl font-black text-desert-brown mb-2">כל הכבוד!</h2>
        <p className="text-desert-brown/60">סיימתם את כל שאלות הטריוויה</p>
      </div>
    )
  }

  const question = questions[currentIndex]
  if (!question) return null

  const timerPercent = (timeLeft / ANSWER_TIME) * 100
  const answerColors = ['#D4663C', '#1B998B', '#C73E4A', '#7B2D8E']

  return (
    <div className="p-4">
      <InfoBanner title="איך משחקים טריוויה?" icon="🧠" storageKey="trivia_instructions_seen">
        <p>ענו על שאלות ידע כללי. יש לכם <strong>15 שניות</strong> לכל שאלה.</p>
        <p>תשובה נכונה = נקודות בהתאם לרמת הקושי.</p>
        <p>תשובה תוך 5 שניות = <strong>בונוס 5 נקודות!</strong></p>
      </InfoBanner>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-black text-desert-brown">❓ טריוויה</h1>
        <span className="text-sm text-desert-brown/50">
          {currentIndex + 1}/{questions.length}
        </span>
      </div>

      {/* Timer bar */}
      <div className="h-2 bg-desert-brown/10 rounded-full overflow-hidden mb-4">
        <motion.div
          className="h-full rounded-full"
          style={{
            backgroundColor: timerPercent > 30 ? '#1B998B' : timerPercent > 10 ? '#D4943C' : '#C73E4A',
          }}
          animate={{ width: `${timerPercent}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Category */}
      <div className="mb-3">
        <span className="text-xs font-bold px-2 py-1 rounded-full bg-hoopoe/10 text-hoopoe">
          {question.category}
        </span>
      </div>

      {/* Question + Choices */}
      {!transitioning && (
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          <h2 className="text-lg font-bold text-desert-brown mb-6 leading-relaxed">
            {question.question}
          </h2>

          <div className="grid grid-cols-1 gap-3">
            {question.options.map((option, i) => {
              const isSelected = selectedAnswer === i
              const isCorrect = i === question.correct_index
              let bg = answerColors[i % answerColors.length]
              let opacity = '1'

              if (showResult) {
                if (isCorrect) {
                  bg = '#22C55E'
                } else if (isSelected && !isCorrect) {
                  bg = '#EF4444'
                } else {
                  opacity = '0.3'
                }
              }

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleAnswer(i)}
                  disabled={showResult || transitioning}
                  className="p-4 rounded-2xl text-white font-bold text-right transition-all active:scale-[0.97]"
                  style={{ backgroundColor: bg, opacity }}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Transition loading */}
      {transitioning && (
        <div className="flex items-center justify-center py-16">
          <div className="text-2xl animate-pulse">🧠</div>
        </div>
      )}

      {/* Next button */}
      {showResult && !transitioning && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          <button
            type="button"
            onClick={goNext}
            className="w-full py-3 bg-desert-brown text-white font-bold rounded-2xl active:scale-[0.98] transition-transform"
          >
            שאלה הבאה ←
          </button>
        </motion.div>
      )}
    </div>
  )
}
