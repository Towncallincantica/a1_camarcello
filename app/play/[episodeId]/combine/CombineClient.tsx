'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
  items: { item_id: string; name: string; rarity: string } | null
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

export function CombineClient({ episodeId, playerId, inventory, recipes, preselect }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    preselect ? new Set([preselect]) : new Set()
  )
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const inventoryMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const inv of inventory) {
      if (inv.items) m.set(inv.items.item_id, inv.quantity)
    }
    return m
  }, [inventory])

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
      for (const input of recipe.combination_recipe_inputs) {
        const qty = inventoryMap.get(input.item_id) ?? 0
        if (qty <= 1) {
          await supabase
            .from('player_episode_inventory')
            .delete()
            .eq('player_id', playerId)
            .eq('item_id', input.item_id)
            .eq('episode_id', episodeId)
        } else {
          await supabase
            .from('player_episode_inventory')
            .update({ quantity: qty - 1 })
            .eq('player_id', playerId)
            .eq('item_id', input.item_id)
            .eq('episode_id', episodeId)
        }
      }

      for (const output of recipe.combination_recipe_outputs) {
        const existing = await supabase
          .from('player_episode_inventory')
          .select('quantity')
          .eq('player_id', playerId)
          .eq('item_id', output.item_id)
          .eq('episode_id', episodeId)
          .single()

        if (existing.data) {
          await supabase
            .from('player_episode_inventory')
            .update({ quantity: existing.data.quantity + output.quantity })
            .eq('player_id', playerId)
            .eq('item_id', output.item_id)
            .eq('episode_id', episodeId)
        } else {
          await supabase
            .from('player_episode_inventory')
            .insert({
              player_id: playerId,
              item_id: output.item_id,
              episode_id: episodeId,
              quantity: output.quantity,
            })
        }
      }

      setResult({ success: true, message: recipe.result_message || 'Combinazione riuscita!' })
      setSelected(new Set())
      setTimeout(() => router.refresh(), 800)
    })
  }

  const matchingRecipe = findMatchingRecipe()

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

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