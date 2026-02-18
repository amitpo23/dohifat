'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { usePlayer } from '@/hooks/usePlayer'
import { Header } from '@/components/Header'
import { Timeline } from '@/components/Timeline'
import { BottomNav } from '@/components/BottomNav'
import { LiveFeed } from '@/components/LiveFeed'
import { GameTimer } from '@/components/GameTimer'
import { SurpriseGamePopup } from '@/components/SurpriseGamePopup'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function GameLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isRegistered, isLoading } = usePlayer()

  useEffect(() => {
    if (!isLoading && !isRegistered) {
      router.replace('/')
    }
  }, [isLoading, isRegistered, router])

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-desert-bg">
        <div className="text-4xl animate-pulse">🐦</div>
      </div>
    )
  }

  if (!isRegistered) return null

  return (
    <div className="min-h-dvh bg-desert-bg flex flex-col">
      <Header />
      <Timeline />
      <GameTimer />
      <main className="flex-1 max-w-[480px] w-full mx-auto pb-20 overflow-y-auto">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
      <BottomNav />
      <LiveFeed />
      <SurpriseGamePopup />
    </div>
  )
}
