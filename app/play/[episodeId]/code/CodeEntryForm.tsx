'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { verifyCode } from '../actions'

interface Target {
  target_id: string
  node_id: string
  payload: Record<string, unknown>
}

interface Props {
  episodeId: string
  targetId: string | null
  nodeId: string | null
  targets: Target[]
}

export function CodeEntryForm({ episodeId, targetId, nodeId, targets }: Props) {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<{ success: boolean; message?: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return

    // Se targetId è noto, verifica direttamente
    if (targetId && nodeId) {
      startTransition(async () => {
        const res = await verifyCode(episodeId, nodeId, targetId, code)
        setResult(res)
        if (res.success) {
          setTimeout(() => router.push(`/play/${episodeId}`), 1200)
        }
      })
      return
    }

    // Altrimenti prova tutti i target code_entry dell'episodio
    startTransition(async () => {
      for (const target of targets) {
        const res = await verifyCode(episodeId, target.node_id, target.target_id, code)
        if (res.success) {
          setResult(res)
          setTimeout(() => router.push(`/play/${episodeId}`), 1200)
          return
        }
      }
      setResult({ success: false, message: 'Codice non riconosciuto.' })
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <input
        type="text"
        value={code}
        onChange={(e) => {
          setCode(e.target.value.toUpperCase())
          setResult(null)
        }}
        placeholder="ES. CHIAVE42"
        autoComplete="off"
        autoCapitalize="characters"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '2px',
          padding: '1rem 1.25rem',
          color: '#feeaa5',
          fontSize: '1.4rem',
          letterSpacing: '0.2em',
          fontFamily: 'Space Mono, monospace',
          textAlign: 'center',
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />

      {result && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: '2px',
          background: result.success
            ? 'rgba(100,210,120,0.08)'
            : 'rgba(232,85,85,0.08)',
          border: `1px solid ${result.success ? 'rgba(100,210,120,0.3)' : 'rgba(232,85,85,0.3)'}`,
          color: result.success ? '#64d278' : '#e85555',
          fontSize: '0.85rem',
          textAlign: 'center',
        }}>
          {result.success ? '✓ Codice accettato' : result.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !code.trim() || result?.success === true}
        style={{
          background: 'rgba(254,234,165,0.08)',
          border: '1px solid rgba(254,234,165,0.3)',
          color: '#feeaa5',
          padding: '0.875rem',
          fontSize: '0.9rem',
          letterSpacing: '0.08em',
          fontFamily: 'Georgia, serif',
          cursor: isPending ? 'wait' : 'pointer',
          opacity: isPending || !code.trim() ? 0.5 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        {isPending ? 'Verifica...' : 'Conferma'}
      </button>
    </form>
  )
}