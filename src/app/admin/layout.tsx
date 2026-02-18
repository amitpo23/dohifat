'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ADMIN_PIN = '1234'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [authenticated, setAuthenticated] = useState(false)
  const [pin, setPin] = useState('')
  const router = useRouter()

  // Check localStorage for saved auth
  if (typeof window !== 'undefined' && !authenticated) {
    const savedPin = localStorage.getItem('duchifatiot_admin')
    if (savedPin === ADMIN_PIN) {
      setAuthenticated(true)
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-dvh bg-desert-bg flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
          <h1 className="text-2xl font-black text-desert-brown mb-2">🔐 כניסת מנהל</h1>
          <p className="text-sm text-desert-brown/50 mb-6">הזינו את הקוד</p>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="קוד..."
            className="w-full px-4 py-3 rounded-xl border-2 border-desert-brown/10 text-center text-2xl
                       tracking-widest focus:outline-none focus:border-hoopoe mb-4"
            maxLength={4}
          />
          <button
            type="button"
            onClick={() => {
              if (pin === ADMIN_PIN) {
                localStorage.setItem('duchifatiot_admin', pin)
                setAuthenticated(true)
              }
            }}
            className="w-full py-3 bg-hoopoe text-white font-bold rounded-xl"
          >
            כניסה
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-desert-bg">
      <header className="bg-desert-brown text-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">🐦 ניהול הדוכיפתיות</h1>
        <button
          type="button"
          onClick={() => router.push('/game')}
          className="text-sm bg-white/20 px-3 py-1 rounded-lg"
        >
          חזרה למשחק
        </button>
      </header>
      <main className="max-w-4xl mx-auto p-6">
        {children}
      </main>
    </div>
  )
}
