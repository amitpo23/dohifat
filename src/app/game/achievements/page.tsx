'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { usePlayer } from '@/hooks/usePlayer'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { BackButton } from '@/components/BackButton'

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlocked: boolean
}

export default function AchievementsPage() {
  const { player } = usePlayer()
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [justUnlocked, setJustUnlocked] = useState<string | null>(null)

  useEffect(() => {
    if (!player) return
    const supabase = createClient()

    const loadAchievements = async () => {
      const [triviaRes, photosRes, completionsRes, gamePlaysRes, messagesRes] = await Promise.all([
        supabase.from('trivia_answers').select('id').eq('player_id', player.id).eq('correct', true),
        supabase.from('photos').select('id').eq('player_id', player.id),
        supabase.from('completions').select('id').eq('player_id', player.id),
        supabase.from('game_plays').select('id').eq('player_id', player.id),
        supabase.from('game_messages').select('id').eq('player_id', player.id),
      ])

      const triviaCorrect = triviaRes.data?.length || 0
      const photoCount = photosRes.data?.length || 0
      const completionCount = completionsRes.data?.length || 0
      const gamePlayCount = gamePlaysRes.data?.length || 0
      const messageCount = messagesRes.data?.length || 0

      const badgeList: Achievement[] = [
        {
          id: 'first_trivia',
          name: 'מתחילים!',
          description: 'ענו נכון על שאלת טריוויה ראשונה',
          icon: '🧠',
          unlocked: triviaCorrect >= 1,
        },
        {
          id: 'trivia_master',
          name: 'מלך הטריוויה',
          description: 'ענו נכון על 5 שאלות טריוויה',
          icon: '👑',
          unlocked: triviaCorrect >= 5,
        },
        {
          id: 'trivia_legend',
          name: 'אגדת הטריוויה',
          description: 'ענו נכון על 10 שאלות טריוויה',
          icon: '🏆',
          unlocked: triviaCorrect >= 10,
        },
        {
          id: 'first_photo',
          name: 'צלם מתחיל',
          description: 'העלו תמונה ראשונה לגלריה',
          icon: '📸',
          unlocked: photoCount >= 1,
        },
        {
          id: 'photographer',
          name: 'צלם מקצועי',
          description: 'העלו 5 תמונות לגלריה',
          icon: '🎞️',
          unlocked: photoCount >= 5,
        },
        {
          id: 'first_mission',
          name: 'שליח נאמן',
          description: 'השלימו משימה ראשונה',
          icon: '🎯',
          unlocked: completionCount >= 1,
        },
        {
          id: 'mission_hero',
          name: 'גיבור המשימות',
          description: 'השלימו 5 משימות',
          icon: '🦸',
          unlocked: completionCount >= 5,
        },
        {
          id: 'first_game',
          name: 'גיימר מתחיל',
          description: 'שחקו במשחק מיני ראשון',
          icon: '🎮',
          unlocked: gamePlayCount >= 1,
        },
        {
          id: 'gamer',
          name: 'גיימר מנוסה',
          description: 'שחקו ב-3 משחקי מיני',
          icon: '🕹️',
          unlocked: gamePlayCount >= 3,
        },
        {
          id: 'social',
          name: 'חברותי',
          description: 'שלחו 5 הודעות בצ׳אט',
          icon: '💬',
          unlocked: messageCount >= 5,
        },
        {
          id: 'chatty',
          name: 'פטפטן/ית',
          description: 'שלחו 20 הודעות בצ׳אט',
          icon: '🗣️',
          unlocked: messageCount >= 20,
        },
        {
          id: 'all_rounder',
          name: 'רב-תחומי',
          description: 'השתתפו בטריוויה, משימה, משחקון ותמונה',
          icon: '🌟',
          unlocked: triviaCorrect >= 1 && completionCount >= 1 && gamePlayCount >= 1 && photoCount >= 1,
        },
      ]

      setAchievements(badgeList)
      setLoading(false)
    }

    loadAchievements()
  }, [player])

  const shareAchievement = (badge: Achievement) => {
    const text = `🏅 פתחתי את ההישג "${badge.name}" ${badge.icon} בדוכיפתיות!`
    if (navigator.share) {
      navigator.share({ text }).catch(() => {})
    } else {
      navigator.clipboard.writeText(text).then(() => {
        toast.success('הועתק ללוח!')
      }).catch(() => {})
    }
  }

  const shareAll = () => {
    const unlocked = achievements.filter((a) => a.unlocked)
    const text = `🏅 פתחתי ${unlocked.length} מתוך ${achievements.length} הישגים בדוכיפתיות!\n${unlocked.map((a) => `${a.icon} ${a.name}`).join('\n')}`
    if (navigator.share) {
      navigator.share({ text }).catch(() => {})
    } else {
      navigator.clipboard.writeText(text).then(() => {
        toast.success('הועתק ללוח!')
      }).catch(() => {})
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 bg-desert-brown/5 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  const unlockedCount = achievements.filter((a) => a.unlocked).length
  const unlockedAchievements = achievements.filter((a) => a.unlocked)
  const lockedAchievements = achievements.filter((a) => !a.unlocked)

  return (
    <div className="p-4">
      <BackButton href="/game" label="ראשי" />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-black text-desert-brown flex items-center gap-2">
          🏅 הישגים
        </h1>
        <div className="flex items-center gap-2">
          {unlockedCount > 0 && (
            <button
              type="button"
              onClick={shareAll}
              className="text-xs text-desert-brown/40 hover:text-hoopoe px-2 py-1"
              aria-label="שתף הישגים"
            >
              📤
            </button>
          )}
          <span className="text-sm font-bold px-3 py-1 rounded-full bg-hoopoe/10 text-hoopoe">
            {unlockedCount}/{achievements.length}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-3 bg-desert-brown/10 rounded-full mb-6 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(unlockedCount / achievements.length) * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full bg-gradient-to-l from-hoopoe to-accent-gold rounded-full"
        />
      </div>

      {/* Unlocked section */}
      {unlockedAchievements.length > 0 && (
        <>
          <p className="text-xs font-bold text-accent-teal mb-2">נפתחו ✓</p>
          <div className="space-y-2 mb-6">
            {unlockedAchievements.map((badge, i) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`flex items-center gap-3 p-3 rounded-xl shadow-sm bg-white ${
                  justUnlocked === badge.id ? 'ring-2 ring-accent-gold' : ''
                }`}
                onAnimationComplete={() => {
                  if (justUnlocked === badge.id) {
                    setTimeout(() => setJustUnlocked(null), 2000)
                  }
                }}
              >
                <motion.span
                  className="text-2xl"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: i * 0.06 + 0.1, type: 'spring', stiffness: 200 }}
                >
                  {badge.icon}
                </motion.span>
                <div className="flex-1">
                  <p className="font-bold text-sm text-desert-brown">{badge.name}</p>
                  <p className="text-xs text-desert-brown/50">{badge.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => shareAchievement(badge)}
                  className="text-desert-brown/20 hover:text-hoopoe text-sm px-1"
                  aria-label={`שתף הישג ${badge.name}`}
                >
                  📤
                </button>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Locked section */}
      {lockedAchievements.length > 0 && (
        <>
          <p className="text-xs font-bold text-desert-brown/30 mb-2">נעולים 🔒</p>
          <div className="space-y-2">
            {lockedAchievements.map((badge, i) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: (unlockedAchievements.length + i) * 0.04 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-desert-brown/5 opacity-50"
              >
                <span className="text-2xl">🔒</span>
                <div className="flex-1">
                  <p className="font-bold text-sm text-desert-brown">{badge.name}</p>
                  <p className="text-xs text-desert-brown/50">{badge.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Motivational message */}
      {unlockedCount < achievements.length && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-desert-brown/40 mt-6"
        >
          {unlockedCount === 0
            ? 'התחילו לשחק כדי לפתוח הישגים!'
            : `נשארו עוד ${achievements.length - unlockedCount} הישגים לפתוח 💪`}
        </motion.p>
      )}

      {unlockedCount === achievements.length && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mt-6 p-4 bg-accent-gold/10 rounded-2xl"
        >
          <p className="text-2xl mb-1">🌟</p>
          <p className="text-sm font-black text-accent-gold">פתחתם את כל ההישגים!</p>
          <p className="text-xs text-desert-brown/50">אתם אלופים!</p>
        </motion.div>
      )}
    </div>
  )
}
