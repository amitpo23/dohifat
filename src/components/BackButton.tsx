'use client'

import Link from 'next/link'

interface BackButtonProps {
  href: string
  label: string
}

export function BackButton({ href, label }: BackButtonProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-desert-brown/50 font-bold mb-3 active:text-desert-brown transition-colors"
    >
      <span>→</span>
      <span>{label}</span>
    </Link>
  )
}
