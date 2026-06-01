'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { combineItems } from './actions'

interface ItemInfo {
  item_id: string
  name: string
  description: string | null
  rarity: string
  category: string | null
  is_consumable: boolean
}

interface InventoryItem {
  quantity: number
  items: ItemInfo | null
}

interface RecipeItem {
  item_id: string
  items: { item_id: string; name: string; rarity: string } | null
}

interface RecipeOutput {
  item_id: string
  quantity: number
  items: { item_id: string; name: string; rarity: string; description: string | null; icon_url: string | null } | null
}

interface Recipe {
  recipe_id: string
  name: string
  result_message: string
  combination_recipe_inputs: RecipeItem[]
  combination_recipe_outputs: RecipeOutput[]
}

interface Props {
  episodeId: string
  playerId: string
  inventory: InventoryItem[]
  recipes: Recipe[]
  preselect?: string | null
}

const rarityColors: Record<string, string> = {
  common: 'rgba(255,255,255,0.5)',
  uncommon: '#64d278',
  rare: '#5b9bd5',
  epic: '#b57bee',
  legendary: '#feeaa5',
}

export function CombineClient({ episodeId, inventory, recipes, preselect }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    preselect ? new Set([preselect]) : new Set()
  )
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [craftedItem, setCraftedItem] = useState<{ name: string; rarity: string; description: string | null; icon_url: string | null } | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Countdown popup combinazione → torna alla mappa
  useEffect(() => {
    if (!craftedItem) return
    const t = setTimeout(() => {
      setCraftedItem(null)
      router.push(`/play/${episodeId}`)
    }, 5000)
    return () => clearTimeout(t)
  }, [craftedItem, episodeId, router])

  function toggleSelect(itemId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
    setResult(null)
  }

  function findMatchingRecipe(): Recipe | null {
    for (const recipe of recipes) {
      const inputs = recipe.combination_recipe_inputs.map((i) => i.item_id).sort()
      const sel = [...selected].sort()
      if (inputs.length === sel.length && inputs.every((id, i) => id === sel[i])) {
        return recipe
      }
    }
    return null
  }

  function handleCombine() {
    const recipe = findMatchingRecipe()
    if (!recipe) {
      setResult({ success: false, message: 'Nessuna combinazione trovata con questi oggetti.' })
      return
    }

    startTransition(async () => {
      const res = await combineItems(episodeId, recipe.recipe_id)
      if (res.success) {
        setSelected(new Set())
        const out = recipe.combination_recipe_outputs[0]?.items ?? null
        setCraftedItem(out
          ? { name: out.name, rarity: out.rarity, description: out.description, icon_url: out.icon_url }
          : { name: 'Oggetto creato', rarity: 'common', description: null, icon_url: null })
      } else {
        setResult({ success: false, message: res.error })
      }
    })
  }

  const matchingRecipe = findMatchingRecipe()

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {craftedItem && (() => {
        const rColor = rarityColors[craftedItem.rarity] ?? rarityColors.common
        return (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(9,8,7,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', maxWidth: 320, width: '100%' }}>
              <div style={{
                width: 130, height: 130, border: `1px solid ${rColor}`,
                boxShadow: `0 0 24px ${rColor}40`, background: 'rgba(255,255,255,0.03)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              }}>
                {craftedItem.icon_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={craftedItem.icon_url} alt={craftedItem.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '2.5rem', color: rColor, opacity: 0.4 }}>◈</span>}
              </div>
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.14em', color: rColor, textTransform: 'uppercase' }}>
                  {craftedItem.rarity}
                </span>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '1rem', color: '#feeaa5' }}>
                  {craftedItem.name}
                </span>
                {craftedItem.description && (
                  <span style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                    {craftedItem.description}
                  </span>
                )}
              </div>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)' }}>
                AGGIUNTO ALL'INVENTARIO
              </span>
              <a href={`/play/${episodeId}/inventory`} style={{
                textDecoration: 'none', textAlign: 'center', padding: '0.55rem 1rem',
                border: `1px solid ${rColor}55`, background: `${rColor}11`, color: '#feeaa5',
                fontFamily: "'Cinzel', serif", fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                Vedi inventario
              </a>
              <div style={{ width: '100%', height: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 1, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: rColor, animation: 'drainBarCombine 5s linear forwards' }} />
              </div>
              <style>{`@keyframes drainBarCombine { from { width: 100%; } to { width: 0%; } }`}</style>
            </div>
          </div>
        )
      })()}

      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', margin: 0 }}>
        Seleziona gli oggetti da combinare.
      </p>

      {inventory.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>
          Nessun oggetto disponibile.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {inventory.map((inv) => {
            if (!inv.items) return null
            const item = inv.items
            const isSelected = selected.has(item.item_id)
            const color = rarityColors[item.rarity] ?? rarityColors.common
            return (
              <button
                key={item.item_id}
                onClick={() => toggleSelect(item.item_id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: isSelected ? 'rgba(254,234,165,0.06)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isSelected ? 'rgba(254,234,165,0.35)' : color + '22'}`,
                  color: '#e8e4dc',
                  fontFamily: 'Georgia, serif',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <span style={{ color }}>{item.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}>×{inv.quantity}</span>
                  <span style={{ color: isSelected ? '#feeaa5' : 'rgba(255,255,255,0.2)', fontSize: '1rem' }}>
                    {isSelected ? '◈' : '◇'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Anteprima ricetta */}
      {selected.size > 0 && (
        <div style={{
          padding: '0.875rem 1rem',
          border: `1px solid ${matchingRecipe ? 'rgba(100,210,120,0.3)' : 'rgba(255,255,255,0.07)'}`,
          background: matchingRecipe ? 'rgba(100,210,120,0.04)' : 'rgba(255,255,255,0.02)',
        }}>
          {matchingRecipe ? (
            <div>
              <p style={{ color: '#64d278', fontSize: '0.82rem', margin: '0 0 0.4rem', letterSpacing: '0.04em' }}>
                ✓ {matchingRecipe.name}
              </p>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {matchingRecipe.combination_recipe_outputs.map((o) => (
                  <span key={o.item_id} style={{
                    fontSize: '0.75rem',
                    color: rarityColors[o.items?.rarity ?? 'common'],
                    border: `1px solid ${rarityColors[o.items?.rarity ?? 'common']}44`,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                  }}>
                    {o.items?.name ?? '?'} ×{o.quantity}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', margin: 0 }}>
              Nessuna ricetta con questi oggetti.
            </p>
          )}
        </div>
      )}

      {/* Risultato */}
      {result && (
        <div style={{
          padding: '0.75rem 1rem',
          background: result.success ? 'rgba(100,210,120,0.06)' : 'rgba(232,85,85,0.06)',
          border: `1px solid ${result.success ? 'rgba(100,210,120,0.25)' : 'rgba(232,85,85,0.25)'}`,
          color: result.success ? '#64d278' : '#e85555',
          fontSize: '0.85rem',
          textAlign: 'center',
        }}>
          {result.message}
        </div>
      )}

      <button
        onClick={handleCombine}
        disabled={isPending || selected.size === 0}
        style={{
          background: selected.size > 0 ? 'rgba(254,234,165,0.08)' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${selected.size > 0 ? 'rgba(254,234,165,0.3)' : 'rgba(255,255,255,0.07)'}`,
          color: selected.size > 0 ? '#feeaa5' : 'rgba(255,255,255,0.2)',
          padding: '0.875rem',
          fontFamily: 'Georgia, serif',
          fontSize: '0.9rem',
          cursor: selected.size > 0 ? 'pointer' : 'not-allowed',
          letterSpacing: '0.06em',
          transition: 'all 0.15s',
          opacity: isPending ? 0.5 : 1,
        }}
      >
        {isPending ? 'Combinazione...' : 'Combina'}
      </button>
    </div>
  )
}