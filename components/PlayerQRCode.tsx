'use client'

import { useMemo } from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface Props {
  playerId: string
  displayName: string
}

export function PlayerQRCode({ playerId, displayName }: Props) {
  const qrValue = useMemo(
    () => JSON.stringify({ type: 'player', player_id: playerId }),
    [playerId]
  )

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1rem',
      padding: '2rem',
      border: '1px solid rgba(254,234,165,0.15)',
      background: 'rgba(255,255,255,0.02)',
    }}>
      <p style={{
        fontSize: '0.7rem',
        letterSpacing: '0.1em',
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
        margin: 0,
      }}>
        Il tuo codice
      </p>

      <div style={{
        padding: '1rem',
        background: '#fff',
        borderRadius: '2px',
      }}>
        <QRCodeSVG
          value={qrValue}
          size={160}
          level="M"
          includeMargin={false}
        />
      </div>

      <p style={{
        fontSize: '0.85rem',
        color: '#feeaa5',
        letterSpacing: '0.05em',
        margin: 0,
      }}>
        {displayName}
      </p>

      <p style={{
        fontSize: '0.6rem',
        color: 'rgba(255,255,255,0.2)',
        fontFamily: 'Space Mono, monospace',
        margin: 0,
      }}>
        {playerId}
      </p>
    </div>
  )
}