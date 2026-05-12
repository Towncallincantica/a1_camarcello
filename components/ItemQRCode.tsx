'use client'

import { useMemo } from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface Props {
  itemId: string
  itemName: string
  rarity?: string
  quantity?: number
}

const rarityColors: Record<string, string> = {
  common: 'rgba(255,255,255,0.4)',
  uncommon: '#64d278',
  rare: '#5b9bd5',
  epic: '#b57bee',
  legendary: '#feeaa5',
}

export function ItemQRCode({ itemId, itemName, rarity = 'common', quantity }: Props) {
  const qrValue = useMemo(
    () => JSON.stringify({ type: 'item', item_id: itemId }),
    [itemId]
  )

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '1.5rem',
      border: `1px solid ${rarityColors[rarity] ?? rarityColors.common}33`,
      background: 'rgba(255,255,255,0.02)',
    }}>
      <p style={{
        fontSize: '0.7rem',
        letterSpacing: '0.1em',
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
        margin: 0,
      }}>
        Oggetto
      </p>

      <div style={{
        padding: '0.75rem',
        background: '#fff',
        borderRadius: '2px',
      }}>
        <QRCodeSVG
          value={qrValue}
          size={128}
          level="M"
          includeMargin={false}
        />
      </div>

      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontSize: '0.85rem',
          color: rarityColors[rarity] ?? rarityColors.common,
          letterSpacing: '0.05em',
          margin: '0 0 0.2rem',
        }}>
          {itemName}
        </p>
        {quantity !== undefined && quantity > 1 && (
          <p style={{
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.3)',
            margin: 0,
          }}>
            ×{quantity}
          </p>
        )}
      </div>

      <p style={{
        fontSize: '0.6rem',
        color: 'rgba(255,255,255,0.2)',
        fontFamily: 'Space Mono, monospace',
        margin: 0,
      }}>
        {itemId}
      </p>
    </div>
  )
}