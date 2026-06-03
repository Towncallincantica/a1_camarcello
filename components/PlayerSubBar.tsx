'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

interface StatusEffect {
  status_effect_id: string
  status_type: string
  episode_id?: string
  expires_at: string | null
  metadata: { label?: string; icon?: string } | null
}

interface Props {
  playerId: string
  episodeId: string
  teamName?: string | null
}

export function PlayerSubBar({ playerId, episodeId, teamName }: Props) {
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [gpsBlink, setGpsBlink] = useState(false)
  const [statusEffects, setStatusEffects] = useState<StatusEffect[]>([])

  const supabase = useMemo(() => createClient(), [])

  // GPS status + blink ad ogni rilevamento
  useEffect(() => {
    function onGpsOk() {
      setGpsStatus('ok')
      setGpsBlink(true)
      setTimeout(() => setGpsBlink(false), 180)
    }
    function onGpsError() { setGpsStatus('error') }
    window.addEventListener('gps:ok', onGpsOk)
    window.addEventListener('gps:error', onGpsError)
    return () => {
      window.removeEventListener('gps:ok', onGpsOk)
      window.removeEventListener('gps:error', onGpsError)
    }
  }, [])

  // Status effects + realtime
  useEffect(() => {
    supabase
      .from('player_status_effects')
      .select('status_effect_id, status_type, expires_at, metadata')
      .eq('player_id', playerId)
      .eq('episode_id', episodeId)
      .then(({ data, error }) => {
          console.log('SUBBAR effects', { playerId, episodeId, data, error })

        if (data) setStatusEffects(filterActive(data as StatusEffect[]))
      })

    const channel = supabase
      .channel(`status_effects:${playerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'player_status_effects',
          filter: `player_id=eq.${playerId}`,
        },
        (payload) => {
          const effect = payload.new as StatusEffect
          if (effect.episode_id !== undefined && effect.episode_id !== episodeId) return
          setStatusEffects((prev) =>
            filterActive([...prev.filter((e) => e.status_effect_id !== effect.status_effect_id), effect])
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'player_status_effects',
          filter: `player_id=eq.${playerId}`,
        },
        (payload) => {
          const removedId = (payload.old as { status_effect_id?: string }).status_effect_id
          if (!removedId) return
          setStatusEffects((prev) => prev.filter((e) => e.status_effect_id !== removedId))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, playerId, episodeId])

  // Ripulisce a schermo gli effetti scaduti (anche senza evento DB)
  useEffect(() => {
    const interval = setInterval(() => {
      setStatusEffects((prev) => filterActive(prev))
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  const dotColor = gpsStatus === 'ok'
    ? (gpsBlink ? 'rgba(100,210,120,0.15)' : '#64d278')
    : gpsStatus === 'error'
    ? '#e85555'
    : 'rgba(255,255,255,0.18)'

  const dotGlow = gpsStatus === 'ok' && !gpsBlink
    ? '0 0 5px rgba(100,210,120,0.5)'
    : 'none'

  const gpsLabelColor = gpsStatus === 'ok'
    ? 'rgba(100,210,120,0.7)'
    : gpsStatus === 'error'
    ? 'rgba(232,85,85,0.7)'
    : 'rgba(255,255,255,0.3)'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem',
      padding: '0.35rem 1.25rem',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      background: 'rgba(9,8,7,0.6)',
      fontSize: '0.68rem',
      letterSpacing: '0.06em',
      flexWrap: 'wrap',
      minHeight: '1.9rem',
      fontFamily: "'Cinzel', Georgia, serif",
    }}>

      {/* GPS dot + label */}
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.32rem' }}>
        <span style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          background: dotColor,
          display: 'inline-block',
          flexShrink: 0,
          boxShadow: dotGlow,
          transition: 'background 0.15s, box-shadow 0.15s',
        }} />
        <span style={{ color: gpsLabelColor, transition: 'color 0.3s' }}>GPS</span>
      </span>

      {teamName && (
        <span style={{ color: 'rgba(255,255,255,0.08)', userSelect: 'none' }}>·</span>
      )}

      {/* Team — link alla pagina team */}
      {teamName && (
        <a
          href={`/play/${episodeId}/team`}
          style={{
            color: 'rgba(254,234,165,0.55)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            textDecoration: 'none',
            WebkitTapHighlightColor: 'transparent',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(254,234,165,0.9)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(254,234,165,0.55)')}
        >
          <span style={{ fontSize: '0.6rem' }}>◉</span>
          {teamName}
        </a>
      )}

      {/* Status effects */}
      {statusEffects.map((effect) => {
        const icon = effect.metadata?.icon ?? '✨'
        const label = effect.metadata?.label ?? effect.status_type
        return (
          <span key={effect.status_effect_id} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.1rem 0.55rem',
            border: '1px solid rgba(254,234,165,0.18)',
            borderRadius: '999px',
            color: '#feeaa5',
            fontSize: '0.6rem',
            letterSpacing: '0.08em',
            background: 'rgba(254,234,165,0.04)',
          }}>
            <span style={{ fontSize: '0.7rem' }}>{icon}</span>
            {label}
            {effect.expires_at && (
              <span style={{ color: 'rgba(254,234,165,0.4)', fontSize: '0.58rem' }}>
                {formatExpiry(effect.expires_at)}
              </span>
            )}
          </span>
        )
      })}

    </div>
  )
}

function filterActive(effects: StatusEffect[]): StatusEffect[] {
  const now = new Date()
  return effects.filter(
    (e) => !e.expires_at || new Date(e.expires_at) > now
  )
}

function formatExpiry(expiresAt: string): string {
  const diff = Math.max(0, new Date(expiresAt).getTime() - Date.now())
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '<1m'
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h`
}