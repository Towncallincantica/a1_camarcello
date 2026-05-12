'use client'

import { useState, useEffect, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { selectItem, confirmExchange, cancelExchange } from '../actions'

interface ItemInfo {
  item_id: string
  name: string
  rarity: string
  category: string | null
}

interface InventoryItem {
  quantity: number
  items: ItemInfo | null
}

interface Props {
  episodeId: string
  sessionId: string
  playerId: string
  displayName: string
  otherDisplayName: string
  isA: boolean
  status: string
  myConfirmed: boolean
  otherConfirmed: boolean
  myItem: ItemInfo | null
  otherItem: ItemInfo | null
  inventory: InventoryItem[]
}

const rarityColors: Record<string, string> = {
  common: 'rgba(255,255,255,0.5)',
  uncommon: '#64d278',
  rare: '#5b9bd5',
  epic: '#b57bee',
  legendary: '#feeaa5',
}

export function ExchangeSessionClient({
  episodeId,
  sessionId,
  playerId,
  displayName,
  otherDisplayName,
  status: initialStatus,
  myConfirmed: initialMyConfirmed,
  otherConfirmed: initialOtherConfirmed,
  myItem: initialMyItem,
  otherItem: initialOtherItem,
  inventory,
}: Props) {
  const [status, setStatus] = useState(initialStatus)
  const [myConfirmed, setMyConfirmed] = useState(initialMyConfirmed)
  const [otherConfirmed, setOtherConfirmed] = useState(initialOtherConfirmed)
  const [myItem, setMyItem] = useState<ItemInfo | null>(initialMyItem)
  const [otherItem, setOtherItem] = useState<ItemInfo | null>(initialOtherItem)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // Realtime aggiornamenti sessione
  useEffect(() => {
    const channel = supabase
      .channel(`exchange_session:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'exchange_sessions',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const s = payload.new as {
            status: string
            player_a_confirmed: boolean
            player_b_confirmed: boolean
          }
          setStatus(s.status)
          setMyConfirmed(s.player_a_confirmed)
          setOtherConfirmed(s.player_b_confirmed)

          if (s.status === 'completed' || s.status === 'cancelled') {
            setTimeout(() => router.push(`/play/${episodeId}`), 1500)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, sessionId, episodeId, router])

  function handleSelectItem(item: ItemInfo) {
    setMyItem(item)
    startTransition(async () => {
      await selectItem(episodeId, sessionId, playerId, item.item_id)
    })
  }

  function handleConfirm() {
    setMyConfirmed(true)
    startTransition(async () => {
      await confirmExchange(episodeId, sessionId, playerId)
    })
  }

  function handleCancel() {
    startTransition(async () => {
      await cancelExchange(episodeId, sessionId)
    })
  }

  // Stati terminali
  if (status === 'completed') {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
        <div style={{ color: '#64d278', fontSize: '2rem', marginBottom: '1rem' }}>✓</div>
        <p style={{ color: '#64d278', fontSize: '1rem', letterSpacing: '0.06em' }}>Scambio completato</p>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', marginTop: '0.5rem' }}>Ritorno alla storia...</p>
      </div>
    )
  }

  if (status === 'cancelled') {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Scambio annullato.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Riepilogo scambio */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        gap: '1rem',
        alignItems: 'center',
      }}>
        {/* Il mio item */}
        <div style={{
          padding: '1rem',
          border: `1px solid ${myItem ? 'rgba(254,234,165,0.2)' : 'rgba(255,255,255,0.07)'}`,
          background: 'rgba(255,255,255,0.02)',
          minHeight: '80px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}>
          <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', margin: '0 0 0.4rem' }}>
            {displayName}
          </p>
          {myItem ? (
            <>
              <p style={{ color: rarityColors[myItem.rarity] ?? rarityColors.common, fontSize: '0.85rem', margin: 0 }}>
                {myItem.name}
              </p>
              {myItem.category && (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', margin: '0.2rem 0 0' }}>
                  {myItem.category}
                </p>
              )}
            </>
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem', margin: 0 }}>
              Scegli un oggetto ↓
            </p>
          )}
          {myConfirmed && (
            <span style={{ color: '#64d278', fontSize: '0.65rem', marginTop: '0.4rem' }}>✓ confermato</span>
          )}
        </div>

        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '1.2rem' }}>⇄</span>

        {/* Item dell'altro player */}
        <div style={{
          padding: '1rem',
          border: `1px solid ${otherItem ? 'rgba(254,234,165,0.2)' : 'rgba(255,255,255,0.07)'}`,
          background: 'rgba(255,255,255,0.02)',
          minHeight: '80px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}>
          <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', margin: '0 0 0.4rem' }}>
            {otherDisplayName}
          </p>
          {otherItem ? (
            <>
              <p style={{ color: rarityColors[otherItem.rarity] ?? rarityColors.common, fontSize: '0.85rem', margin: 0 }}>
                {otherItem.name}
              </p>
              {otherItem.category && (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', margin: '0.2rem 0 0' }}>
                  {otherItem.category}
                </p>
              )}
            </>
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem', margin: 0 }}>
              In attesa...
            </p>
          )}
          {otherConfirmed && (
            <span style={{ color: '#64d278', fontSize: '0.65rem', marginTop: '0.4rem' }}>✓ confermato</span>
          )}
        </div>
      </div>

      {/* Selezione item dal proprio inventario */}
      {!myConfirmed && (
        <section>
          <h2 style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: '0.7rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '0.75rem',
          }}>
            Il tuo inventario
          </h2>

          {inventory.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>
              Nessun oggetto disponibile.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {inventory.map((inv) => {
                if (!inv.items) return null
                const item = inv.items
                const isSelected = myItem?.item_id === item.item_id
                const color = rarityColors[item.rarity] ?? rarityColors.common
                return (
                  <button
                    key={item.item_id}
                    onClick={() => handleSelectItem(item)}
                    disabled={isPending}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      background: isSelected ? 'rgba(254,234,165,0.06)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isSelected ? 'rgba(254,234,165,0.3)' : color + '22'}`,
                      color: '#e8e4dc',
                      fontFamily: 'Georgia, serif',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <div>
                      <span style={{ color }}>{item.name}</span>
                      {item.category && (
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', marginLeft: '0.5rem' }}>
                          {item.category}
                        </span>
                      )}
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}>
                      ×{inv.quantity}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Azioni */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {!myConfirmed && (
          <button
            onClick={handleConfirm}
            disabled={isPending || !myItem}
            style={{
              background: myItem ? 'rgba(254,234,165,0.08)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${myItem ? 'rgba(254,234,165,0.3)' : 'rgba(255,255,255,0.07)'}`,
              color: myItem ? '#feeaa5' : 'rgba(255,255,255,0.25)',
              padding: '0.875rem',
              fontFamily: 'Georgia, serif',
              fontSize: '0.9rem',
              cursor: myItem ? 'pointer' : 'not-allowed',
              letterSpacing: '0.06em',
              transition: 'all 0.15s',
            }}
          >
            {isPending ? 'Attendi...' : 'Conferma Scambio'}
          </button>
        )}

        {myConfirmed && !otherConfirmed && (
          <p style={{
            textAlign: 'center',
            color: 'rgba(255,255,255,0.35)',
            fontSize: '0.85rem',
            padding: '0.875rem',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            In attesa di {otherDisplayName}...
          </p>
        )}

        <button
          onClick={handleCancel}
          disabled={isPending}
          style={{
            background: 'transparent',
            border: '1px solid rgba(232,85,85,0.2)',
            color: 'rgba(232,85,85,0.6)',
            padding: '0.75rem',
            fontFamily: 'Georgia, serif',
            fontSize: '0.82rem',
            cursor: 'pointer',
            letterSpacing: '0.04em',
          }}
        >
          Annulla scambio
        </button>
      </div>
    </div>
  )
}