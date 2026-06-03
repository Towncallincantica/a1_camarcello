'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Message {
  message_id: string
  content: string
  created_at: string
  player_id: string
  player: { display_name: string } | null
}

interface Props {
  teamId: string
  episodeId: string
  playerId: string
  displayName: string
  initialMessages: Message[]
  onNewMessage?: () => void
}

export function TeamChat({ teamId, episodeId, playerId, displayName, initialMessages, onNewMessage }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])
  // Cache display_name per player_id già risolti
  const nameCache = useRef<Record<string, string>>({ [playerId]: displayName })

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`team_chat:${teamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_messages',
          filter: `team_id=eq.${teamId}`,
        },
        async (payload) => {
          const msg = payload.new as {
            message_id: string
            content: string
            created_at: string
            player_id: string
          }

          const isOwn = msg.player_id === playerId

          // Risolvi display_name dalla cache o fetch
          let resolvedName = nameCache.current[msg.player_id]
          if (!resolvedName) {
            const { data } = await supabase
              .from('player')
              .select('display_name')
              .eq('player_id', msg.player_id)
              .single()
            resolvedName = data?.display_name ?? '?'
            nameCache.current[msg.player_id] = resolvedName
          }

          setMessages(prev => {
            if (prev.some(m => m.message_id === msg.message_id)) return prev
            return [...prev, { ...msg, player: { display_name: resolvedName } }]
          })

          if (!isOwn) onNewMessage?.()
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, teamId, playerId, displayName])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const content = text.trim()
    if (!content || sending) return

    setSending(true)
    const { data: canChat } = await supabase.rpc('player_can', {
      p_player_id: playerId,
      p_episode_id: episodeId,
      p_capability: 'can_chat',
    })
    if (canChat === false) {
      setBlocked(true)
      setSending(false)
      return
    }

    setText('')
    await supabase.from('team_messages').insert({
      team_id: teamId,
      episode_id: episodeId,
      player_id: playerId,
      content,
    })
    setSending(false)
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      minHeight: 0,
    }}>
      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}>
        {messages.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>
            Nessun messaggio ancora. Inizia la conversazione.
          </p>
        )}

        {messages.map((msg) => {
          const isSelf = msg.player_id === playerId
          const name = msg.player?.display_name ?? '?'
          return (
            <div key={msg.message_id} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: isSelf ? 'flex-end' : 'flex-start',
            }}>
              {!isSelf && (
                <span style={{
                  fontSize: '0.65rem',
                  color: 'rgba(255,255,255,0.35)',
                  marginBottom: '0.2rem',
                  letterSpacing: '0.04em',
                }}>
                  {name}
                </span>
              )}
              <div style={{
                maxWidth: '75%',
                padding: '0.6rem 0.9rem',
                background: isSelf
                  ? 'rgba(254,234,165,0.08)'
                  : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isSelf ? 'rgba(254,234,165,0.2)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: isSelf ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                color: isSelf ? '#feeaa5' : '#e8e4dc',
                fontSize: '0.9rem',
                lineHeight: 1.5,
              }}>
                {msg.content}
              </div>
              <span style={{
                fontSize: '0.6rem',
                color: 'rgba(255,255,255,0.2)',
                marginTop: '0.2rem',
              }}>
                {new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {blocked && (
        <div style={{
          padding: '0.5rem 1.5rem', color: '#e85555', fontSize: '0.78rem',
          background: 'rgba(232,85,85,0.08)', borderTop: '1px solid rgba(232,85,85,0.2)',
        }}>
          Un effetto attivo ti impedisce di parlare.
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSend}
        style={{
          padding: '0.75rem 1.5rem 1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          gap: '0.75rem',
          flexShrink: 0,
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Messaggio..."
          disabled={sending}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '0.65rem 1rem',
            color: '#e8e4dc',
            fontFamily: 'Georgia, serif',
            fontSize: '0.9rem',
            outline: 'none',
            borderRadius: '2px',
          }}
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          style={{
            background: 'rgba(254,234,165,0.08)',
            border: '1px solid rgba(254,234,165,0.25)',
            color: '#feeaa5',
            padding: '0.65rem 1.1rem',
            fontFamily: 'Georgia, serif',
            fontSize: '0.85rem',
            cursor: 'pointer',
            opacity: !text.trim() ? 0.4 : 1,
            transition: 'opacity 0.15s',
            borderRadius: '2px',
          }}
        >
          →
        </button>
      </form>
    </div>
  )
}