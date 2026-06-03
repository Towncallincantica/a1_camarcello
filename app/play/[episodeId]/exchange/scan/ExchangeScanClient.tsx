'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { initiateExchange } from '../actions'
import { claimItemByQR, type ClaimResult } from '../../qrActions'

interface Props {
  episodeId: string
  playerAId: string
}

const RARITY_COLOR: Record<string, string> = {
  common: 'rgba(255,255,255,0.5)',
  uncommon: '#64d278',
  rare: '#6ab0f5',
  epic: '#c084fc',
  legendary: '#feeaa5',
}

export function ExchangeScanClient({ episodeId, playerAId }: Props) {
  const scannerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [claimedItem, setClaimedItem] = useState<Extract<ClaimResult, { success: true }>['item'] | null>(null)
  const router = useRouter()
  const scannerInstance = useRef<unknown>(null)
  const hasScanned = useRef(false)
  const scannerRunning = useRef(false)
  const popupTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-dismiss popup dopo 5s
  useEffect(() => {
    if (!claimedItem) return
    popupTimer.current = setTimeout(() => {
      setClaimedItem(null)
      router.back()
    }, 5000)
    return () => {
      if (popupTimer.current) clearTimeout(popupTimer.current)
    }
  }, [claimedItem, router])

  useEffect(() => {
    if (!scannerRef.current || scanning) return

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      const scanner = new Html5Qrcode('exchange-qr-reader')
      scannerInstance.current = scanner
      scannerRunning.current = true
      setScanning(true)

      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          async (decodedText) => {
            if (hasScanned.current) return
            hasScanned.current = true
            setProcessing(true)

            let parsed: { type?: string; player_id?: string; item_id?: string } | null = null
            try {
              parsed = JSON.parse(decodedText)
            } catch {
              setError('QR non riconosciuto.')
              hasScanned.current = false
              setProcessing(false)
              return
            }

            // Ferma scanner
            try {
              scannerRunning.current = false
              await scanner.stop()
            } catch { /* già fermo */ }

            // --- Routing per tipo ---
            if (parsed?.type === 'player') {
              if (!parsed.player_id) {
                setError('QR giocatore non valido.')
                hasScanned.current = false
                setProcessing(false)
                return
              }
              if (parsed.player_id === playerAId) {
                setError('Non puoi scambiare con te stesso.')
                hasScanned.current = false
                setProcessing(false)
                return
              }
              const res = await initiateExchange(episodeId, parsed.player_id)
              if (!res.ok) {
                setError(res.error)
                hasScanned.current = false
                setProcessing(false)
                return
              }
              router.push(`/play/${episodeId}/exchange/${res.sessionId}`)
              return
            }

            if (parsed?.type === 'item') {
              if (!parsed.item_id) {
                setError('QR oggetto non valido.')
                hasScanned.current = false
                setProcessing(false)
                return
              }
              const result = await claimItemByQR(episodeId, parsed.item_id)
              if (!result.success) {
                setError(result.error)
                hasScanned.current = false
                setProcessing(false)
                return
              }
              setProcessing(false)
              setClaimedItem(result.item)
              return
            }

            setError('QR non riconosciuto. Tipo non supportato.')
            hasScanned.current = false
            setProcessing(false)
          },
          () => {}
        )
        .catch(() => {
          setError('Impossibile accedere alla fotocamera.')
          setScanning(false)
        })
    })

    return () => {
      if (scannerRunning.current) {
        scannerRunning.current = false
        const s = scannerInstance.current as { stop?: () => Promise<void> } | null
        s?.stop?.().catch(() => {})
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // --- Popup item raccolto ---
  if (claimedItem) {
    const rarityColor = RARITY_COLOR[claimedItem.rarity] ?? RARITY_COLOR.common
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
        width: '100%',
        maxWidth: '320px',
        animation: 'fadeIn 0.3s ease',
      }}>
        <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>

        {/* Immagine item */}
        <div style={{
          width: '140px',
          height: '140px',
          border: `1px solid ${rarityColor}`,
          boxShadow: `0 0 24px ${rarityColor}40`,
          background: 'rgba(255,255,255,0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {claimedItem.image_url || claimedItem.icon_url ? (
            <img
              src={claimedItem.image_url ?? claimedItem.icon_url ?? ''}
              alt={claimedItem.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: '3rem', opacity: 0.3 }}>◈</span>
          )}
        </div>

        {/* Info */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: rarityColor, textTransform: 'uppercase' }}>
            {claimedItem.rarity}
          </div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.2rem', color: '#feeaa5' }}>
            {claimedItem.name}
          </div>
          {claimedItem.description && (
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, maxWidth: '260px' }}>
              {claimedItem.description}
            </div>
          )}
        </div>

        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>
          Aggiunto all'inventario
        </div>

        {/* Progress bar 5s */}
        <div style={{ width: '100%', height: '2px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            background: rarityColor,
            animation: 'drain 5s linear forwards',
          }} />
        </div>
        <style>{`@keyframes drain { from { width: 100%; } to { width: 0%; } }`}</style>
      </div>
    )
  }

  // --- Scanner ---
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%', maxWidth: '320px' }}>
      <div style={{
        width: '100%',
        aspectRatio: '1',
        border: '1px solid rgba(254,234,165,0.2)',
        background: 'rgba(255,255,255,0.02)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div id="exchange-qr-reader" ref={scannerRef} style={{ width: '100%', height: '100%' }} />

        {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((corner) => (
          <div key={corner} style={{
            position: 'absolute',
            width: '20px',
            height: '20px',
            borderColor: '#feeaa5',
            borderStyle: 'solid',
            borderWidth: 0,
            ...(corner === 'top-left'     ? { top: 8,    left: 8,  borderTopWidth: 2,    borderLeftWidth: 2  } : {}),
            ...(corner === 'top-right'    ? { top: 8,    right: 8, borderTopWidth: 2,    borderRightWidth: 2 } : {}),
            ...(corner === 'bottom-left'  ? { bottom: 8, left: 8,  borderBottomWidth: 2, borderLeftWidth: 2  } : {}),
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
            {processing ? 'Raccolta...' : 'Connessione...'}
          </div>
        )}
      </div>

      <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
        Scansiona il QR di un giocatore o di un oggetto
      </p>

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