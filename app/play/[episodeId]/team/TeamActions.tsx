'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createTeam, joinTeam, leaveTeam } from './actions'

const C = {
  gold: '#feeaa5',
  text: '#e8e4dc',
  err: '#e85555',
  font: 'Georgia, serif',
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{
      marginTop: '0.6rem', padding: '0.5rem 0.75rem',
      background: 'rgba(232,85,85,0.08)', border: '1px solid rgba(232,85,85,0.25)',
      color: C.err, fontSize: '0.78rem', fontFamily: C.font,
    }}>
      {msg}
    </div>
  )
}

// ── Crea team ──────────────────────────────────────────────────────────────
export function CreateTeamForm({ episodeId }: { episodeId: string }) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const router = useRouter()

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed || pending) return
    setError(null)
    start(async () => {
      const res = await createTeam(episodeId, trimmed)
      if (!res.ok) { setError(res.error); return }
      router.refresh()
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
          placeholder="Nome del team"
          disabled={pending}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.12)', padding: '0.75rem 1rem',
            color: C.text, fontFamily: C.font, fontSize: '0.9rem', outline: 'none',
          }}
        />
        <button onClick={submit} disabled={pending || !name.trim()} style={{
          background: 'rgba(254,234,165,0.08)', border: '1px solid rgba(254,234,165,0.3)',
          color: C.gold, padding: '0.75rem 1.25rem', fontFamily: C.font, fontSize: '0.85rem',
          cursor: pending ? 'default' : 'pointer', letterSpacing: '0.05em',
          opacity: pending || !name.trim() ? 0.5 : 1,
        }}>
          {pending ? '…' : 'Crea'}
        </button>
      </div>
      {error && <ErrorBox msg={error} />}
    </div>
  )
}

// ── Unisciti ───────────────────────────────────────────────────────────────
export function JoinTeamList({
  episodeId, teams,
}: { episodeId: string; teams: { team_id: string; name: string }[] }) {
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, start] = useTransition()
  const router = useRouter()

  const join = (teamId: string) => {
    if (pendingId) return
    setError(null)
    setPendingId(teamId)
    start(async () => {
      const res = await joinTeam(episodeId, teamId)
      setPendingId(null)
      if (!res.ok) { setError(res.error); return }
      router.refresh()
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {teams.map((t) => (
        <button key={t.team_id} onClick={() => join(t.team_id)} disabled={!!pendingId} style={{
          width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)', color: C.text,
          padding: '0.875rem 1rem', fontFamily: C.font, fontSize: '0.9rem',
          cursor: pendingId ? 'default' : 'pointer', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          opacity: pendingId && pendingId !== t.team_id ? 0.5 : 1,
        }}>
          <span>{t.name}</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
            {pendingId === t.team_id ? '…' : 'Entra →'}
          </span>
        </button>
      ))}
      {error && <ErrorBox msg={error} />}
    </div>
  )
}

// ── Lascia ─────────────────────────────────────────────────────────────────
export function LeaveTeamButton({ episodeId }: { episodeId: string }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const router = useRouter()

  const leave = () => {
    if (pending) return
    setError(null)
    start(async () => {
      const res = await leaveTeam(episodeId)
      if (!res.ok) { setError(res.error); return }
      router.refresh()
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      <button onClick={leave} disabled={pending} style={{
        background: 'transparent', border: '1px solid rgba(232,85,85,0.25)',
        color: 'rgba(232,85,85,0.6)', padding: '0.35rem 0.75rem',
        fontFamily: C.font, fontSize: '0.72rem',
        cursor: pending ? 'default' : 'pointer', letterSpacing: '0.04em',
      }}>
        {pending ? '…' : 'Lascia'}
      </button>
      {error && <ErrorBox msg={error} />}
    </div>
  )
}