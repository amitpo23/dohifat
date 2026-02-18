'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface InfoBannerProps {
  title: string
  icon: string
  children: React.ReactNode
  storageKey?: string
  defaultOpen?: boolean
}

export function InfoBanner({ title, icon, children, storageKey, defaultOpen = true }: InfoBannerProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (storageKey) {
      const seen = localStorage.getItem(storageKey)
      setOpen(seen ? false : defaultOpen)
    } else {
      setOpen(defaultOpen)
    }
  }, [storageKey, defaultOpen])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (storageKey && !next) {
      localStorage.setItem(storageKey, '1')
    }
  }

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-2 w-full text-right"
        aria-expanded={open}
      >
        <span className="w-6 h-6 rounded-full bg-hoopoe/10 flex items-center justify-center text-xs text-hoopoe font-bold shrink-0">
          ?
        </span>
        <span className="text-xs font-bold text-desert-brown/50 flex-1">{icon} {title}</span>
        <span className="text-xs text-desert-brown/30">{open ? '▲' : '▼'}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-3 bg-hoopoe/5 rounded-xl border border-hoopoe/10">
              <div className="text-xs text-desert-brown/70 leading-relaxed space-y-1">
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
