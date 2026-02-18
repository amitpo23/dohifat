'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef, Suspense } from 'react'
import { usePlayer } from '@/hooks/usePlayer'
import { createClient } from '@/lib/supabase/browser'
import type { Team } from '@/lib/types'

export default function JoinPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center bg-desert-bg">
        <div className="text-6xl animate-pulse">🐦</div>
      </div>
    }>
      <JoinPage />
    </Suspense>
  )
}

function JoinPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isRegistered, isLoading, register } = usePlayer()
  const [name, setName] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [memberCounts, setMemberCounts] = useState<Record<number, number>>({})
  const [teams, setTeams] = useState<Team[]>([])
  const [step, setStep] = useState<'intro' | 'register'>('intro')
  const [qrTeamName, setQrTeamName] = useState<string | null>(null)
  const registerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isLoading && isRegistered) {
      router.replace('/game')
    }
  }, [isLoading, isRegistered, router])

  useEffect(() => {
    const supabase = createClient()

    const loadData = async () => {
      const [teamsRes, playersRes] = await Promise.all([
        supabase.from('teams').select('*').order('id'),
        supabase.from('players').select('team_id'),
      ])

      if (teamsRes.data) {
        const loadedTeams = teamsRes.data as Team[]
        setTeams(loadedTeams)

        // Handle ?team=X query parameter from QR code
        const teamParam = searchParams.get('team')
        if (teamParam) {
          const teamId = Number.parseInt(teamParam, 10)
          const matchedTeam = loadedTeams.find((t) => t.id === teamId)
          if (matchedTeam) {
            setSelectedTeam(teamId)
            setQrTeamName(`${matchedTeam.emoji} ${matchedTeam.name}`)
            setStep('register')
          }
        }
      }

      if (playersRes.data) {
        const counts: Record<number, number> = {}
        for (const row of playersRes.data) {
          counts[row.team_id] = (counts[row.team_id] || 0) + 1
        }
        setMemberCounts(counts)
      }
    }
    loadData()
  }, [searchParams])

  const goToRegister = () => {
    setStep('register')
    setTimeout(() => {
      registerRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('נא להזין שם')
      return
    }
    if (!selectedTeam) {
      setError('נא לבחור קבוצה')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await register(name.trim(), selectedTeam)
      router.replace('/game')
    } catch {
      setError('שגיאה בהרשמה, נסו שוב')
      setSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-desert-bg">
        <div className="text-6xl animate-pulse">🐦</div>
      </div>
    )
  }

  if (isRegistered) return null

  return (
    <div className="min-h-dvh bg-desert-bg flex flex-col items-center">
      {/* Hero Section */}
      <div className="w-full bg-gradient-to-b from-hoopoe/15 via-desert-bg to-desert-bg pt-10 pb-6 px-4">
        <div className="max-w-[480px] mx-auto text-center animate-fade-in">
          {/* Bird Logo */}
          <div className="relative inline-block mb-4">
            <div className="text-8xl leading-none">🐦</div>
            <div className="absolute -top-2 -right-3 text-2xl animate-pulse">✨</div>
            <div className="absolute -bottom-1 -left-3 text-xl animate-pulse" style={{ animationDelay: '0.5s' }}>✨</div>
          </div>

          <h1 className="text-5xl font-black text-desert-brown mb-2">
            הדוכיפתיות
          </h1>
          <p className="text-xl text-hoopoe font-bold">
            סופ&quot;ש יומהולדת בערבה!
          </p>

          {/* Decorative line */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="h-px w-12 bg-hoopoe/30" />
            <span className="text-hoopoe/60 text-sm">🌵</span>
            <div className="h-px w-12 bg-hoopoe/30" />
          </div>
        </div>
      </div>

      {/* Game Structure Section */}
      <div className="w-full max-w-[480px] px-4 pb-5 animate-slide-up">
        <div className="bg-white rounded-2xl shadow-md p-5 space-y-4">
          <h2 className="text-lg font-black text-desert-brown flex items-center gap-2">
            <span className="text-xl">📋</span>
            איך זה עובד?
          </h2>

          <p className="text-sm text-desert-brown/70 leading-relaxed">
            המשחק נמשך <strong className="text-desert-brown">3 ימים</strong> עם <strong className="text-desert-brown">5 תחרויות בכל יום</strong>. השלימו כמה שיותר משימות כדי לצבור נקודות!
          </p>

          <div className="space-y-3 text-sm text-desert-brown/80 leading-relaxed">
            <RuleItem
              icon="📸"
              title="יום 1 - יום התמונות"
              text="5 משימות צילום יצירתיות: צלמו, העלו ושתפו תמונות כדי לצבור נקודות"
            />
            <RuleItem
              icon="🧠"
              title="יום 2 - יום המשחקים"
              text="5 תחרויות של טריוויה, משחקי מהירות, זיכרון וגלגל מזל"
            />
            <RuleItem
              icon="🎉"
              title="יום 3 - יום הסיום"
              text="5 משימות אחרונות וטקס הכתרת המנצחים הגדול!"
            />
          </div>
        </div>
      </div>

      {/* Scoring System Section */}
      <div className="w-full max-w-[480px] px-4 pb-5 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="bg-white rounded-2xl shadow-md p-5">
          <h2 className="text-lg font-black text-desert-brown flex items-center gap-2 mb-4">
            <span className="text-xl">⭐</span>
            דירוג וניקוד
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-accent-teal/10 rounded-xl p-4 text-center">
              <div className="text-3xl mb-2">👤</div>
              <p className="font-bold text-accent-teal text-sm mb-1">ניקוד אישי</p>
              <p className="text-xs text-desert-brown/60 leading-relaxed">
                כל פעולה שלכם צוברת נקודות אישיות. תתחרו על המקום הראשון!
              </p>
            </div>
            <div className="bg-hoopoe/10 rounded-xl p-4 text-center">
              <div className="text-3xl mb-2">👥</div>
              <p className="font-bold text-hoopoe text-sm mb-1">ניקוד קבוצתי</p>
              <p className="text-xs text-desert-brown/60 leading-relaxed">
                הנקודות שלכם מצטברות גם לקבוצה. עבדו יחד כדי לנצח!
              </p>
            </div>
          </div>

          <div className="mt-4 bg-desert-bg rounded-xl p-3 text-center">
            <p className="text-xs text-desert-brown/60">
              יש <strong className="text-desert-brown">2 דירוגים</strong>: טבלת שחקנים אישית + טבלת קבוצות
            </p>
          </div>
        </div>
      </div>

      {/* Prize Section */}
      <div className="w-full max-w-[480px] px-4 pb-6 animate-slide-up" style={{ animationDelay: '0.15s' }}>
        <div className="bg-gradient-to-br from-accent-gold/20 to-hoopoe/10 rounded-2xl shadow-md p-5 text-center">
          <div className="text-4xl mb-2">🏆</div>
          <h2 className="text-lg font-black text-desert-brown mb-2">הפרס</h2>
          <p className="text-sm text-desert-brown/80 leading-relaxed">
            הקבוצה המנצחת והשחקן/ית עם הכי הרבה נקודות יזכו בפרסים!
          </p>
          <p className="text-xs text-desert-brown/50 mt-2">
            הפרסים יחולקו בטקס הסיום ביום האחרון
          </p>
        </div>
      </div>

      {/* CTA to Register */}
      {step === 'intro' && (
        <div className="w-full max-w-[480px] px-4 pb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <button
            type="button"
            onClick={goToRegister}
            className="w-full py-4 rounded-2xl text-white text-xl font-bold
                       bg-hoopoe hover:bg-hoopoe/90 active:scale-[0.98]
                       transition-all duration-150 shadow-lg"
          >
            !בואו נתחיל
          </button>
        </div>
      )}

      {/* Registration Section */}
      {step === 'register' && (
        <div ref={registerRef} className="w-full max-w-[480px] px-4 pb-8 space-y-5 animate-slide-up">
          <div className="bg-white rounded-2xl shadow-md p-5 space-y-5">
            <h2 className="text-lg font-black text-desert-brown flex items-center gap-2">
              <span className="text-xl">✍️</span>
              הרשמה למשחק
            </h2>

            {/* QR team pre-selection banner */}
            {qrTeamName && (
              <div className="p-3 bg-accent-teal/10 rounded-xl text-center">
                <p className="text-sm font-bold text-accent-teal">
                  הצטרפתם לקבוצת {qrTeamName}!
                </p>
                <p className="text-xs text-desert-brown/50 mt-1">
                  הזינו את שמכם ולחצו להצטרף
                </p>
              </div>
            )}

            {/* Name input */}
            <div>
              <label htmlFor="player-name" className="block text-sm font-semibold mb-2 text-desert-brown/80">
                איך קוראים לך?
              </label>
              <input
                id="player-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="השם שלך..."
                className="w-full px-4 py-3 rounded-xl border-2 border-desert-brown/10 bg-desert-bg text-lg
                           focus:outline-none focus:border-hoopoe transition-colors"
                maxLength={20}
              />
            </div>

            {/* Team selection */}
            <div>
              <p className="text-sm font-semibold mb-3 text-desert-brown/80">
                בחרו קבוצה:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {teams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    selected={selectedTeam === team.id}
                    memberCount={memberCounts[team.id] || 0}
                    onSelect={() => setSelectedTeam(team.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-accent-red text-sm font-medium text-center">{error}</p>
          )}

          {/* Join button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !name.trim() || !selectedTeam}
            className="w-full py-4 rounded-2xl text-white text-xl font-bold
                       bg-hoopoe hover:bg-hoopoe/90 active:scale-[0.98]
                       disabled:opacity-40 disabled:cursor-not-allowed
                       transition-all duration-150 shadow-lg"
          >
            {submitting ? '...רגע' : '!יאללה, דוחפים'}
          </button>
        </div>
      )}
    </div>
  )
}

function RuleItem({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="font-bold text-desert-brown text-sm">{title}</p>
        <p>{text}</p>
      </div>
    </div>
  )
}

function TeamCard({
  team,
  selected,
  memberCount,
  onSelect,
}: {
  team: Team
  selected: boolean
  memberCount: number
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`
        relative p-4 rounded-2xl border-3 transition-all duration-200
        flex flex-col items-center gap-1 text-center
        ${selected
          ? 'border-desert-brown shadow-lg scale-[1.03]'
          : 'border-transparent shadow-sm hover:shadow-md'
        }
      `}
      style={{
        backgroundColor: selected ? team.color_light : `${team.color_light}99`,
        borderColor: selected ? team.color_bg : 'transparent',
      }}
    >
      <span className="text-3xl">{team.emoji}</span>
      <span className="text-sm font-bold" style={{ color: team.color_bg }}>
        {team.name}
      </span>
      <span className="text-xs text-desert-brown/50">
        {memberCount} {memberCount === 1 ? 'שחקן' : 'שחקנים'}
      </span>
      {selected && (
        <div
          className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs"
          style={{ backgroundColor: team.color_bg }}
        >
          ✓
        </div>
      )}
    </button>
  )
}
