'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  itemId: string
  itemName: string
  rarity?: string
}

export function ItemQRCode({ itemId, itemName, rarity = 'common' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  const qrData = JSON.stringify({ type: 'item', item_id: itemId })

  useEffect(() => {
    let cancelled = false
    import('qrcode').then((QRCode) => {
      if (cancelled || !canvasRef.current) return
      QRCode.toCanvas(canvasRef.current, qrData, {
        width: 200,
        margin: 2,
        color: { dark: '#090807', light: '#f5f0e8' },
      }).then(() => {
        if (!cancelled) setReady(true)
      })
    })
    return () => { cancelled = true }
  }, [qrData])

  function handlePrint() {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR — ${itemName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Space+Mono&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            background: #f5f0e8;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            font-family: 'Cinzel', serif;
          }
          .card {
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 24px;
            text-align: center;
            width: 240px;
          }
          .rarity {
            font-family: 'Space Mono', monospace;
            font-size: 9px;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            color: #888;
            margin-bottom: 12px;
          }
          img { display: block; margin: 0 auto 14px; }
          .name {
            font-size: 13px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 6px;
            line-height: 1.3;
          }
          .id {
            font-family: 'Space Mono', monospace;
            font-size: 7px;
            color: #aaa;
            word-break: break-all;
          }
          @media print {
            body { background: white; }
            .card { border: 1px solid #ccc; box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="rarity">${rarity}</div>
          <img src="${dataUrl}" width="200" height="200" />
          <div class="name">${itemName}</div>
          <div class="id">${itemId}</div>
        </div>
        <script>window.onload = () => window.print()</script>
      </body>
      </html>
    `)
    win.document.close()
  }

  const rarityColor: Record<string, string> = {
    common: 'rgba(255,255,255,0.4)',
    uncommon: '#64d278',
    rare: '#5b9bd5',
    epic: '#b57bee',
    legendary: '#feeaa5',
  }
  const color = rarityColor[rarity] ?? rarityColor.common

  return (
    <div style={{
      marginTop: '1.5rem',
      padding: '1.25rem',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '8px',
    }}>
      <p style={{
        fontFamily: 'Cinzel, serif',
        fontSize: '0.7rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.4)',
        marginBottom: '1rem',
      }}>
        QR Code
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
        {/* Canvas QR */}
        <div style={{
          background: '#f5f0e8',
          borderRadius: '6px',
          padding: '8px',
          display: 'inline-block',
          opacity: ready ? 1 : 0.3,
          transition: 'opacity 0.3s',
        }}>
          <canvas ref={canvasRef} width={200} height={200} />
        </div>

        {/* Info + azioni */}
        <div style={{ flex: 1, minWidth: '140px' }}>
          <p style={{
            fontFamily: 'Space Mono, monospace',
            fontSize: '0.65rem',
            color: color,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '0.4rem',
          }}>
            {rarity}
          </p>
          <p style={{
            fontFamily: 'Space Mono, monospace',
            fontSize: '0.6rem',
            color: 'rgba(255,255,255,0.25)',
            wordBreak: 'break-all',
            marginBottom: '1rem',
            lineHeight: 1.5,
          }}>
            {itemId}
          </p>

          <button
            onClick={handlePrint}
            disabled={!ready}
            style={{
              padding: '0.5rem 1rem',
              background: ready ? 'rgba(254,234,165,0.1)' : 'transparent',
              border: `1px solid ${ready ? 'rgba(254,234,165,0.3)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '6px',
              color: ready ? '#feeaa5' : 'rgba(255,255,255,0.3)',
              fontFamily: 'Cinzel, serif',
              fontSize: '0.7rem',
              letterSpacing: '0.08em',
              cursor: ready ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
            }}
          >
            Stampa QR
          </button>
        </div>
      </div>
    </div>
  )
}