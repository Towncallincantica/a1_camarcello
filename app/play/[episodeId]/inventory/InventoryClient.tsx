'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteItem } from './actions'

interface ItemInfo {
  item_id: string
  name: string
  description: string | null
  rarity: string
  category: string | null
  icon_url: string | null
  is_consumable: boolean
  base_value: number | null
}

interface InventoryItem {
  quantity: number
  items: ItemInfo | null
}

interface Props {
  episodeId: string
  playerId: string
  inventory: InventoryItem[]
}

const rarityColors: Record<string, string> = {
  common: 'rgba(255,255,255,0.5)',
  uncommon: '#64d278',
  rare: '#5b9bd5',
  epic: '#b57bee',
  legendary: '#feeaa5',
}

const rarityLabels: Record<string, string> = {
  common: 'Comune',
  uncommon: 'Non comune',
  rare: 'Raro',
  epic: 'Epico',
  legendary: 'Leggendario',
}

type PopupMode = 'actions' | 'details'

export function InventoryClient({ episodeId, playerId, inventory: initialInventory }: Props) {
  const [inventory, setInventory] = useState(initialInventory)
  const [selected, setSelected] = useState<ItemInfo | null>(null)
  const [popup, setPopup] = useState<PopupMode | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function openActions(item: ItemInfo) {
    setSelected(item)
    setPopup('actions')
  }

  function closePopup() {
    setSelected(null)
    setPopup(null)
  }

  function handleDetails() {
    setPopup('details')
  }

  function handleCombine() {
    if (!selected) return
    closePopup()
    router.push(`/play/${episodeId}/combine?preselect=${selected.item_id}`)
  }

  function handleDelete() {
    if (!selected) return
    const itemId = selected.item_id
    startTransition(async () => {
      await deleteItem(episodeId, playerId, itemId)
      // Aggiorna stato locale
      setInventory((prev) => {
        return prev
          .map((inv) => {
            if (inv.items?.item_id !== itemId) return inv
            if (inv.quantity <= 1) return null
            return { ...inv, quantity: inv.quantity - 1 }
          })
          .filter(Boolean) as InventoryItem[]
      })
      closePopup()
    })
  }

  return (
    <>
      {/* Griglia inventario */}
      {inventory.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem', padding: '1.5rem' }}>
          Nessun oggetto ancora.
        </p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.5rem',
          padding: '1rem',
        }}>
          {inventory.map((inv) => {
            if (!inv.items) return null
            const item = inv.items
            const color = rarityColors[item.rarity] ?? rarityColors.common
            return (
              <button
                key={item.item_id}
                onClick={() => openActions(item)}
                style={{
                  position: 'relative',
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${color}33`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '0.75rem 0.5rem 0.6rem',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {/* Immagine o placeholder */}
                <div style={{
                  width: '56px',
                  height: '56px',
                  background: `${color}11`,
                  border: `1px solid ${color}22`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}>
                  {item.icon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.icon_url}
                      alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ color, fontSize: '1.4rem', opacity: 0.5 }}>◈</span>
                  )}
                </div>

                {/* Nome */}
                <p style={{
                  color,
                  fontSize: '0.72rem',
                  lineHeight: 1.3,
                  margin: 0,
                  textAlign: 'center',
                  wordBreak: 'break-word',
                }}>
                  {item.name}
                </p>

                {/* Quantità */}
                <span style={{
                  position: 'absolute',
                  top: '0.3rem',
                  right: '0.4rem',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '0.65rem',
                }}>
                  ×{inv.quantity}
                </span>

                {/* Rarity dot */}
                <span style={{
                  position: 'absolute',
                  bottom: '0.3rem',
                  right: '0.4rem',
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background: color,
                  opacity: 0.7,
                }} />
              </button>
            )
          })}
        </div>
      )}

      {/* Overlay popup */}
      {popup && selected && (
        <div
          onClick={closePopup}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 100,
            padding: '0 0 6rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#111009',
              border: '1px solid rgba(255,255,255,0.08)',
              width: '100%',
              maxWidth: '420px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {/* Item header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: `${rarityColors[selected.rarity] ?? rarityColors.common}11`,
                border: `1px solid ${rarityColors[selected.rarity] ?? rarityColors.common}33`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}>
                {selected.icon_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.icon_url} alt={selected.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: rarityColors[selected.rarity] ?? rarityColors.common, fontSize: '1.2rem', opacity: 0.5 }}>◈</span>
                )}
              </div>
              <div>
                <p style={{ color: rarityColors[selected.rarity] ?? rarityColors.common, fontSize: '0.95rem', margin: 0 }}>
                  {selected.name}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', margin: '0.2rem 0 0' }}>
                  {rarityLabels[selected.rarity] ?? selected.rarity}
                  {selected.category ? ` · ${selected.category}` : ''}
                </p>
              </div>
            </div>

            {/* POPUP AZIONI */}
            {popup === 'actions' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {[
                  { label: 'Dettagli', action: handleDetails, enabled: true },
                  { label: 'Combina', action: handleCombine, enabled: true },
                  { label: 'Elimina', action: handleDelete, enabled: !isPending, danger: true },
                  { label: 'Usa', action: () => {}, enabled: false, soon: true },
                ].map(({ label, action, enabled, danger, soon }) => (
                  <button
                    key={label}
                    onClick={enabled ? action : undefined}
                    disabled={!enabled}
                    style={{
                      padding: '0.75rem',
                      background: danger ? 'rgba(232,85,85,0.06)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${danger ? 'rgba(232,85,85,0.2)' : 'rgba(255,255,255,0.08)'}`,
                      color: !enabled
                        ? 'rgba(255,255,255,0.2)'
                        : danger
                        ? 'rgba(232,85,85,0.7)'
                        : '#e8e4dc',
                      fontFamily: 'Georgia, serif',
                      fontSize: '0.85rem',
                      cursor: enabled ? 'pointer' : 'not-allowed',
                      letterSpacing: '0.04em',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.2rem',
                    }}
                  >
                    {label}
                    {soon && (
                      <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em' }}>
                        prossimamente
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* POPUP DETTAGLI */}
            {popup === 'details' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selected.description && (
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
                    {selected.description}
                  </p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {[
                    { label: 'Rarità', value: rarityLabels[selected.rarity] ?? selected.rarity },
                    selected.category ? { label: 'Categoria', value: selected.category } : null,
                    { label: 'Consumabile', value: selected.is_consumable ? 'Sì' : 'No' },
                    selected.base_value != null ? { label: 'Valore', value: String(selected.base_value) } : null,
                  ].filter(Boolean).map((row) => (
                    <div key={row!.label} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.4rem 0',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}>
                      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem' }}>{row!.label}</span>
                      <span style={{ color: '#e8e4dc', fontSize: '0.78rem' }}>{row!.value}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setPopup('actions')}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.4)',
                    padding: '0.6rem',
                    fontFamily: 'Georgia, serif',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    letterSpacing: '0.04em',
                    marginTop: '0.25rem',
                  }}
                >
                  ← Azioni
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}