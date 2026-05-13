'use client'

import { useState, useEffect, useRef, useMemo, useTransition } from 'react'
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
}

export function TeamChat({ teamId, episodeId, playerId, displayName, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [text, setText] = useState('')
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])

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

          // Evita duplicati (il mittente ha già il messaggio in stato via optimistic)
          setMessages((prev) => {
            if (prev.some((m) => m.message_id === msg.message_id)) return prev
            return [...prev, {
              ...msg,
              player: msg.player_id === playerId
                ? { display_name: displayName }
                : { display_name: '...' },
            }]
          })

          // Se il messaggio è di un altro player, recupera il display_name reale
          if (msg.player_id !== playerId) {
            const { data } = await supabase
              .from('player')
              .select('display_name')
              .eq('player_id', msg.player_id)
              .single()

            if (data?.display_name) {
              setMessages((prev) =>
                prev.map(m =>
                  m.message_id === msg.message_id
                    ? { ...m, player: { display_name: data.display_name } }
                    : m
                )
              )
            }
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, teamId, playerId, displayName])

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const content = text.trim()
    if (!content) return

    // Ottimistic update
    const optimistic: Message = {
      message_id: crypto.randomUUID(),
      content,
      created_at: new Date().toISOString(),
      player_id: playerId,
      player: { display_name: displayName },
    }
    setMessages((prev) => [...prev, optimistic])
    setText('')

    startTransition(async () => {
      await supabase.from('team_messages').insert({
        team_id: teamId,
        episode_id: episodeId,
        player_id: playerId,
        content,
      })
    })
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
          disabled={isPending}
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
          disabled={isPending || !text.trim()}
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