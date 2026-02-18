'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePlayer } from '@/hooks/usePlayer'
import { useTeams } from '@/hooks/useTeams'
import { createClient } from '@/lib/supabase/browser'
import { vibrateLight } from '@/lib/haptics'
import { playClick } from '@/lib/sounds'
import { resizeImage } from '@/lib/image-utils'
import { motion, AnimatePresence } from 'framer-motion'
import { InfoBanner } from '@/components/InfoBanner'

interface Message {
  id: number
  player_id: string | null
  team_id: number | null
  text: string
  image_url: string | null
  created_at: string
  player?: { name: string }
}

export default function ChatPage() {
  const { player, team } = usePlayer()
  const { teams } = useTeams()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback((smooth = true) => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant',
    })
  }, [])

  useEffect(() => {
    const supabase = createClient()

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('game_messages')
        .select('*, player:players(name)')
        .order('created_at', { ascending: true })
        .limit(100)

      if (data) {
        setMessages(data as Message[])
        setTimeout(() => scrollToBottom(false), 100)
      }
    }

    fetchMessages()

    const channel = supabase
      .channel('chat-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_messages' },
        async (payload) => {
          const { data } = await supabase
            .from('game_messages')
            .select('*, player:players(name)')
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setMessages((prev) => [...prev, data as Message])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [scrollToBottom])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150
    if (isNearBottom) {
      scrollToBottom()
    }
  }, [messages, scrollToBottom])

  // Track scroll position for scroll-to-bottom button
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const handleScroll = () => {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150
      setShowScrollBtn(!isNearBottom && messages.length > 5)
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [messages.length])

  const sendMessage = async (imageUrl?: string) => {
    if ((!text.trim() && !imageUrl) || !player || !team || sending) return
    setSending(true)
    vibrateLight()
    playClick()

    const supabase = createClient()
    await supabase.from('game_messages').insert({
      player_id: player.id,
      team_id: team.id,
      text: imageUrl ? (text.trim() || '📸') : text.trim(),
      image_url: imageUrl || null,
    })

    setText('')
    setSending(false)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !player || !team) return
    setUploading(true)

    const supabase = createClient()
    const path = `chat/${Date.now()}_${player.id}.jpg`

    const resized = await resizeImage(file, 800)

    const { error } = await supabase.storage
      .from('photos')
      .upload(path, resized, { contentType: 'image/jpeg' })

    if (error) {
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)
    await sendMessage(urlData.publicUrl)
    setUploading(false)

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-10rem)]">
      <div className="p-4 pb-2">
        <InfoBanner title="צ׳אט קבוצתי" icon="💬" storageKey="chat_instructions_seen" defaultOpen={false}>
          <p>שלחו הודעות, תמונות וסטיקרים לכל המשתתפים במשחק!</p>
        </InfoBanner>
        <h1 className="text-xl font-black text-desert-brown flex items-center gap-2">
          💬 צ&apos;אט קבוצתי
        </h1>
        {messages.length > 0 && (
          <p className="text-[10px] text-desert-brown/30 mt-0.5">
            {messages.length} הודעות
          </p>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 space-y-2 relative">
        {messages.map((msg, i) => {
          const msgTeam = teams.find((t) => t.id === msg.team_id)
          const isMe = msg.player_id === player?.id
          const isSystem = !msg.player_id
          const prevMsg = messages[i - 1]
          const showTimeDivider = i === 0 || (prevMsg && new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 300_000)

          return (
            <div key={msg.id}>
              {showTimeDivider && (
                <div className="text-center py-2">
                  <span className="text-[10px] text-desert-brown/30 bg-desert-bg px-2 py-0.5 rounded-full">
                    {new Date(msg.created_at).toLocaleString('he-IL', {
                      hour: '2-digit',
                      minute: '2-digit',
                      ...(i === 0 ? { day: 'numeric', month: 'short' } : {}),
                    })}
                  </span>
                </div>
              )}

              {isSystem ? (
                <div className="text-center py-2">
                  <span className="text-xs font-bold text-hoopoe bg-hoopoe/10 px-3 py-1 rounded-full">
                    {msg.text}
                  </span>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                      isMe
                        ? 'bg-hoopoe/10 shadow-sm rounded-bl-sm'
                        : 'bg-white shadow-sm rounded-br-sm'
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-xs">{msgTeam?.emoji}</span>
                      <span className="text-xs font-bold" style={{ color: msgTeam?.color_bg }}>
                        {(msg.player as unknown as { name: string })?.name}
                      </span>
                    </div>
                    {msg.image_url && (
                      <div className="mb-1 rounded-lg overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={msg.image_url}
                          alt=""
                          className="max-w-full max-h-[200px] object-cover rounded-lg"
                          loading="lazy"
                        />
                      </div>
                    )}
                    {msg.text && msg.text !== '📸' && (
                      <p className="text-sm text-desert-brown">{msg.text}</p>
                    )}
                    <p className="text-[10px] text-desert-brown/30 mt-0.5">
                      {new Date(msg.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          )
        })}

        {messages.length === 0 && (
          <div className="text-center py-16 text-desert-brown/40">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <p className="text-5xl mb-3">💬</p>
              <p className="text-base font-bold text-desert-brown/50 mb-1">עדיין אין הודעות</p>
              <p className="text-sm text-desert-brown/30">התחילו את השיחה! שלחו הודעה או תמונה</p>
            </motion.div>
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            type="button"
            onClick={() => scrollToBottom()}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-hoopoe text-white
                       w-8 h-8 rounded-full shadow-lg flex items-center justify-center text-sm z-30"
            aria-label="גלול למטה"
          >
            ↓
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="p-3 border-t border-desert-brown/10 bg-white">
        {uploading && (
          <div className="flex items-center gap-2 mb-2 text-xs text-desert-brown/50">
            <span className="animate-spin">⏳</span>
            <span>מעלה תמונה...</span>
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-2 bg-hoopoe/10 text-hoopoe rounded-xl text-lg disabled:opacity-40"
          >
            📷
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="...כתבו הודעה"
            maxLength={200}
            className="flex-1 px-3 py-2 rounded-xl border border-desert-brown/10 text-sm
                       focus:outline-none focus:border-hoopoe"
          />
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={!text.trim() || sending}
            className="px-4 py-2 bg-hoopoe text-white font-bold rounded-xl text-sm disabled:opacity-40"
          >
            שלח
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoUpload}
          className="hidden"
        />
      </div>
    </div>
  )
}
