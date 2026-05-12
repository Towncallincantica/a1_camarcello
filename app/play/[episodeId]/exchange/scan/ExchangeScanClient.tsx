'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { initiateExchange } from '../actions'

interface Props {
  episodeId: string
  playerAId: string
}

export function ExchangeScanClient({ episodeId, playerAId }: Props) {
  const scannerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [processing, setProcessing] = useState(false)
  const router = useRouter()
  const scannerInstance = useRef<unknown>(null)

  useEffect(() => {
    if (!scannerRef.current || scanning) return

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      const scanner = new Html5Qrcode('exchange-qr-reader')
      scannerInstance.current = scanner
      setScanning(true)

      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          async (decodedText) => {
            if (processing) return
            setProcessing(true)

            try {
              const data = JSON.parse(decodedText)
              if (data.type !== 'player' || !data.player_id) {
                setError('QR non valido. Scansiona il profilo di un giocatore.')
                setProcessing(false)
                return
              }
              if (data.player_id === playerAId) {
                setError('Non puoi scambiare con te stesso.')
                setProcessing(false)
                return
              }

              await scanner.stop()
              await initiateExchange(episodeId, playerAId, data.player_id)
            } catch {
              setError('QR non riconosciuto.')
              setProcessing(false)
            }
          },
          () => {} // onError silenzioso
        )
        .catch(() => {
          setError('Impossibile accedere alla fotocamera.')
          setScanning(false)
        })
    })

    return () => {
      const s = scannerInstance.current as { stop?: () => Promise<void> } | null
      s?.stop?.().catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%', maxWidth: '320px' }}>
      {/* Scanner viewport */}
      <div style={{
        width: '100%',
        aspectRatio: '1',
        border: '1px solid rgba(254,234,165,0.2)',
        background: 'rgba(255,255,255,0.02)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div id="exchange-qr-reader" ref={scannerRef} style={{ width: '100%', height: '100%' }} />

        {/* Corner brackets */}
        {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
          <div key={corner} style={{
            position: 'absolute',
            width: '20px',
            height: '20px',
            borderColor: '#feeaa5',
            borderStyle: 'solid',
            borderWidth: 0,
            ...(corner === 'top-left' ? { top: 8, left: 8, borderTopWidth: 2, borderLeftWidth: 2 } : {}),
            ...(corner === 'top-right' ? { top: 8, right: 8, borderTopWidth: 2, borderRightWidth: 2 } : {}),
            ...(corner === 'bottom-left' ? { bottom: 8, left: 8, borderBottomWidth: 2, borderLeftWidth: 2 } : {}),
            ...(corner === 'bottom-right' ? { bottom: 8, right: 8, borderBottomWidth: 2, borderRightWidth: 2 } : {}),
          }} />
        ))}

        {processing && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(9,8,7,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#feeaa5',
            fontSize: '0.85rem',
            letterSpacing: '0.06em',
          }}>
            Connessione...
          </div>
        )}
      </div>

      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          background: 'rgba(232,85,85,0.08)',
          border: '1px solid rgba(232,85,85,0.3)',
          color: '#e85555',
          fontSize: '0.82rem',
          textAlign: 'center',
          width: '100%',
          boxSizing: 'border-box',
        }}>
          {error}
        </div>
      )}

      <button
        onClick={() => router.back()}
        style={{
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.4)',
          padding: '0.6rem 1.5rem',
          fontFamily: 'Georgia, serif',
          fontSize: '0.82rem',
          cursor: 'pointer',
          letterSpacing: '0.04em',
        }}
      >
        Annulla
      </button>
    </div>
  )
}