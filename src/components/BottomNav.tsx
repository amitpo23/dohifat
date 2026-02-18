'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IoTrophyOutline, IoTrophy } from 'react-icons/io5'
import { IoCameraOutline, IoCamera } from 'react-icons/io5'
import { IoFlagOutline, IoFlag } from 'react-icons/io5'
import { IoHelpCircleOutline, IoHelpCircle } from 'react-icons/io5'
import { IoGameControllerOutline, IoGameController } from 'react-icons/io5'
import { IoChatbubbleOutline, IoChatbubble } from 'react-icons/io5'

const tabs = [
  {
    href: '/game',
    label: 'תוצאות',
    icon: IoTrophyOutline,
    activeIcon: IoTrophy,
  },
  {
    href: '/game/gallery',
    label: 'גלריה',
    icon: IoCameraOutline,
    activeIcon: IoCamera,
  },
  {
    href: '/game/missions',
    label: 'משימות',
    icon: IoFlagOutline,
    activeIcon: IoFlag,
  },
  {
    href: '/game/trivia',
    label: 'טריוויה',
    icon: IoHelpCircleOutline,
    activeIcon: IoHelpCircle,
  },
  {
    href: '/game/games',
    label: 'משחקים',
    icon: IoGameControllerOutline,
    activeIcon: IoGameController,
  },
  {
    href: '/game/chat',
    label: 'צ׳אט',
    icon: IoChatbubbleOutline,
    activeIcon: IoChatbubble,
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-sm border-t border-desert-brown/10 safe-bottom z-50" aria-label="ניווט ראשי">
      <div className="max-w-[480px] mx-auto flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const isActive = tab.href === '/game'
            ? pathname === '/game'
            : pathname.startsWith(tab.href)
          const Icon = isActive ? tab.activeIcon : tab.icon

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className={`
                flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all
                ${isActive
                  ? 'text-hoopoe scale-110'
                  : 'text-desert-brown/40 hover:text-desert-brown/60 active:scale-95'}
              `}
            >
              <Icon size={isActive ? 24 : 22} />
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
              {isActive && <span className="w-1 h-1 rounded-full bg-hoopoe" />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
