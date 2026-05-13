'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  playerId: string
  episodeId: string
}

export function ExchangeRedirectListener({ playerId, episodeId }: Props) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const channel = supabase
  .channel(`exchange:${playerId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'exchange_sessions',
      filter: `player_b_id=eq.${playerId}`,
    },
    (payload) => {
      console.log('🔔 Exchange event received:', payload)  // ← aggiungi
      const session = payload.new as { session_id: string; episode_id: string }
      if (session.episode_id !== episodeId) return
      router.push(`/play/${episodeId}/exchange/${session.session_id}`)
    }
  )
  .subscribe((status) => {
    console.log('📡 Realtime status:', status)  // ← aggiungi
  })

    return () => { supabase.removeChannel(channel) }
  }, [supabase, playerId, episodeId, router])

  return null
}