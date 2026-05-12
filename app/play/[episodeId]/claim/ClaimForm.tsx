'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { completeTarget } from '../actions'

interface Item {
  item_id: string
  name: string
  description: string | null
  rarity: string
  is_consumable: boolean
  category: string | null
}

interface Props {
  episodeId: string
  nodeId: string
  targetId: string
  item: Item
  alreadyClaimed: boolean
}

const rarityColors: Record<string, string> = {
  common: 'rgba(255,255,255,0.5)',
  uncommon: '#64d278',
  rare: '#5b9bd5',
  epic: '#b57bee',
  legendary: '#feeaa5',
}

export function ClaimForm({ episodeId, nodeId, targetId, item, alreadyClaimed }: Props) {
  const [claimed, setClaimed] = useState(alreadyClaimed)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClaim() {
    startTransition(async () => {
      await completeTarget(episodeId, nodeId, targetId)
      setClaimed(true)
      setTimeout(() => router.push(`/play/${episodeId}`), 1500)
    })
  }

  const rarityColor = rarityColors[item.rarity] ?? rarityColors.common

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Item card */}
      <div style={{
        padding: '1.5rem',
        border: `1px solid ${rarityColor}33`,
        background: 'rgba(255,255,255,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{
            color: rarityColor,
            fontSize: '1.1rem',
            letterSpacing: '0.05em',
            margin: 0,
          }}>
            {item.name}
          </h2>
          <span style={{
            fontSize: '0.65rem',
            letterSpacing: '0.08em',
            color: rarityColor,
            textTransform: 'uppercase',
            border: `1px solid ${rarityColor}55`,
            padding: '0.15rem 0.5rem',
            borderRadius: '999px',
          }}>
            {item.rarity}
          </span>
        </div>

        {item.category && (
          <span style={{
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.06em',
          }}>
            {item.category}
          </span>
        )}

        {item.description && (
          <p style={{
            fontSize: '0.85rem',
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.6,
            margin: 0,
          }}>
            {item.description}
          </p>
        )}

        {item.is_consumable && (
          <span style={{
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.04em',
          }}>
            Consumabile
          </span>
        )}
      </div>

      {/* Claim button / stato */}
      {claimed ? (
        <div style={{
          padding: '1rem',
          textAlign: 'center',
          color: '#64d278',
          fontSize: '0.9rem',
          letterSpacing: '0.06em',
          border: '1px solid rgba(100,210,120,0.2)',
          background: 'rgba(100,210,120,0.05)',
        }}>
          ✓ Oggetto nell&apos;inventario
        </div>
      ) : (
        <button
          onClick={handleClaim}
          disabled={isPending}
          style={{
            background: 'rgba(254,234,165,0.08)',
            border: '1px solid rgba(254,234,165,0.3)',
            color: '#feeaa5',
            padding: '0.875rem',
            fontSize: '0.9rem',
            letterSpacing: '0.08em',
            fontFamily: 'Georgia, serif',
            cursor: isPending ? 'wait' : 'pointer',
            opacity: isPending ? 0.5 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {isPending ? 'Raccolta...' : 'Raccogli'}
        </button>
      )}
    </div>
  )
}