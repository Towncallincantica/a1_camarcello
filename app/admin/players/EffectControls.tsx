'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { applyEffect, clearEffects } from './effectActions'

// Catalogo preset per i test. blocks = capability bloccate.
const PRESETS: {
  status_type: string
  label: string
  icon: string
  blocks: string[]
}[] = [
  { status_type: 'poisoned',   label: 'Avvelenato',   icon: '☠️', blocks: ['can_exchange'] },
  { status_type: 'bound',      label: 'Immobilizzato', icon: '🪢', blocks: ['can_claim'] },
  { status_type: 'contagious', label: 'Contagiato',   icon: '🦠', blocks: ['can_join_team'] },
  { status_type: 'silenced',   label: 'Silenziato',   icon: '🤐', blocks: ['can_chat'] },
  { status_type: 'blindness',  label: 'Cecità',       icon: '🌑', blocks: ['can_use_map'] },
  { status_type: 'invisible',  label: 'Invisibile',   icon: '👻', blocks: ['is_visible'] },
]

const DURATIONS: { label: string; min: number | null }[] = [
  { label: '5m', min: 5 },
  { label: '30m', min: 30 },
  { label: '∞', min: null },
]

export function EffectControls({
  playerId, episodeId,
}: { playerId: string; episodeId: string | null }) {
  const [duration, setDuration] = useState<number | null>(30)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [, start] = useTransition()
  const router = useRouter()

  if (!episodeId) {
    return (
      <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.72rem' }}>
        Player non iscritto a nessun episodio — impossibile applicare effetti.
      </span>
    )
  }

  const apply = (p: typeof PRESETS[number]) => {
    if (busy) return
    setError(null)
    setBusy(p.status_type)
    start(async () => {
      const res = await applyEffect(playerId, episodeId, p.status_type,
        { label: p.label, icon: p.icon, blocks: p.blocks }, duration)
      setBusy(null)
      if (!res.ok) { setError(res.error); return }
      router.refresh()
    })
  }

  const clear = () => {
    if (busy) return
    setError(null)
    setBusy('__clear__')
    start(async () => {
      const res = await clearEffects(playerId, episodeId)
      setBusy(null)
      if (!res.ok) { setError(res.error); return }
      router.refresh()
    })
  }

  return (
    <div style={{ marginTop: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.6rem' }}>
      {/* Durata */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.68rem', letterSpacing: '0.06em' }}>DURATA</span>
        {DURATIONS.map((d) => (
          <button key={d.label} onClick={() => setDuration(d.min)} style={{
            background: duration === d.min ? 'rgba(254,234,165,0.15)' : 'transparent',
            border: `1px solid ${duration === d.min ? 'rgba(254,234,165,0.4)' : 'rgba(255,255,255,0.12)'}`,
            color: duration === d.min ? '#feeaa5' : 'rgba(255,255,255,0.4)',
            fontSize: '0.7rem', padding: '0.15rem 0.55rem', cursor: 'pointer', borderRadius: '2px',
          }}>
            {d.label}
          </button>
        ))}
      </div>

      {/* Preset */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {PRESETS.map((p) => (
          <button key={p.status_type} onClick={() => apply(p)} disabled={!!busy} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#e8e4dc', fontSize: '0.72rem',
            padding: '0.25rem 0.6rem', cursor: busy ? 'default' : 'pointer',
            borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '0.3rem',
            opacity: busy && busy !== p.status_type ? 0.5 : 1,
          }}>
            <span>{p.icon}</span>{p.label}
          </button>
        ))}
        <button onClick={clear} disabled={!!busy} style={{
          background: 'transparent', border: '1px solid rgba(232,85,85,0.25)',
          color: 'rgba(232,85,85,0.6)', fontSize: '0.72rem',
          padding: '0.25rem 0.6rem', cursor: busy ? 'default' : 'pointer', borderRadius: '2px',
        }}>
          ✕ pulisci
        </button>
      </div>

      {error && (
        <div style={{ marginTop: '0.4rem', color: '#e85555', fontSize: '0.72rem' }}>{error}</div>
      )}
    </div>
  )
}