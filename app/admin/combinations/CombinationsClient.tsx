'use client'

import { useState, useTransition, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

type ItemRef = {
  item_id: string
  name: string
  icon_url: string | null
  rarity: Rarity
  category?: string | null
}

type RecipeInput = {
  input_id: string
  item_id: string
  items: ItemRef | null
}

type RecipeOutput = {
  output_id: string
  item_id: string
  quantity: number
  items: ItemRef | null
}

type Recipe = {
  recipe_id: string
  name: string
  result_message: string
  is_active: boolean
  episode_id: string | null
  created_at: string
  combination_recipe_inputs: RecipeInput[]
  combination_recipe_outputs: RecipeOutput[]
}

type FormInput = { item_id: string }
type FormOutput = { item_id: string; quantity: string }

type RecipeForm = {
  name: string
  result_message: string
  is_active: boolean
  episode_id: string
  inputs: FormInput[]
  outputs: FormOutput[]
}

const EMPTY_FORM: RecipeForm = {
  name: '',
  result_message: '',
  is_active: true,
  episode_id: '',
  inputs: [{ item_id: '' }],
  outputs: [{ item_id: '', quantity: '1' }],
}

const RARITY_CONFIG: Record<Rarity, { color: string; bg: string }> = {
  common:    { color: 'rgba(255,255,255,0.5)',  bg: 'rgba(255,255,255,0.05)' },
  uncommon:  { color: '#64d278',               bg: 'rgba(100,210,120,0.08)' },
  rare:      { color: '#5b9bd5',               bg: 'rgba(91,155,213,0.08)'  },
  epic:      { color: '#b57bee',               bg: 'rgba(181,123,238,0.08)' },
  legendary: { color: '#feeaa5',               bg: 'rgba(254,234,165,0.08)' },
}

const ADVENTURE_ID = process.env.NEXT_PUBLIC_ADVENTURE_ID!

function ItemPill({ item }: { item: ItemRef }) {
  const cfg = RARITY_CONFIG[item.rarity] ?? RARITY_CONFIG.common
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.4rem',
      padding: '0.25rem 0.5rem', borderRadius: '6px',
      border: `1px solid ${cfg.color}33`, background: cfg.bg,
    }}>
      {item.icon_url
        ? <img src={item.icon_url} alt={item.name} style={{ width: '18px', height: '18px', borderRadius: '3px', objectFit: 'cover' }} />
        : <span style={{ fontSize: '0.85rem', opacity: 0.4 }}>⬡</span>
      }
      <span style={{ fontSize: '0.78rem', color: cfg.color }}>{item.name}</span>
    </div>
  )
}

export default function CombinationsClient({
  initialRecipes,
  allItems,
}: {
  initialRecipes: Recipe[]
  allItems: ItemRef[]
}) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [form, setForm] = useState<RecipeForm>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  function openCreate() {
    setEditingRecipe(null)
    setForm(EMPTY_FORM)
    setError(null)
    setModalOpen(true)
  }

  function openEdit(recipe: Recipe) {
    setEditingRecipe(recipe)
    setForm({
      name: recipe.name,
      result_message: recipe.result_message,
      is_active: recipe.is_active,
      episode_id: recipe.episode_id ?? '',
      inputs: recipe.combination_recipe_inputs.length > 0
        ? recipe.combination_recipe_inputs.map(i => ({ item_id: i.item_id }))
        : [{ item_id: '' }],
      outputs: recipe.combination_recipe_outputs.length > 0
        ? recipe.combination_recipe_outputs.map(o => ({ item_id: o.item_id, quantity: o.quantity.toString() }))
        : [{ item_id: '', quantity: '1' }],
    })
    setError(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingRecipe(null)
    setError(null)
  }

  // Input row handlers
  function addInput() { setForm(f => ({ ...f, inputs: [...f.inputs, { item_id: '' }] })) }
  function removeInput(idx: number) { setForm(f => ({ ...f, inputs: f.inputs.filter((_, i) => i !== idx) })) }
  function setInputItem(idx: number, item_id: string) {
    setForm(f => ({ ...f, inputs: f.inputs.map((inp, i) => i === idx ? { item_id } : inp) }))
  }

  // Output row handlers
  function addOutput() { setForm(f => ({ ...f, outputs: [...f.outputs, { item_id: '', quantity: '1' }] })) }
  function removeOutput(idx: number) { setForm(f => ({ ...f, outputs: f.outputs.filter((_, i) => i !== idx) })) }
  function setOutputItem(idx: number, item_id: string) {
    setForm(f => ({ ...f, outputs: f.outputs.map((out, i) => i === idx ? { ...out, item_id } : out) }))
  }
  function setOutputQty(idx: number, quantity: string) {
    setForm(f => ({ ...f, outputs: f.outputs.map((out, i) => i === idx ? { ...out, quantity } : out) }))
  }

  function validate(): string | null {
    if (!form.name.trim()) return 'Il nome è obbligatorio.'
    if (form.inputs.some(i => !i.item_id)) return 'Seleziona tutti gli oggetti in input.'
    if (form.outputs.some(o => !o.item_id)) return 'Seleziona tutti gli oggetti in output.'
    if (new Set(form.inputs.map(i => i.item_id)).size !== form.inputs.length) return 'Input duplicati.'
    return null
  }

  function handleSave() {
    const err = validate()
    if (err) { setError(err); return }

    startTransition(async () => {
      setError(null)

      if (editingRecipe) {
        // Update recipe
        const { error: recipeErr } = await supabase
          .from('combination_recipes')
          .update({
            name: form.name.trim(),
            result_message: form.result_message.trim(),
            is_active: form.is_active,
            episode_id: form.episode_id || null,
          })
          .eq('recipe_id', editingRecipe.recipe_id)

        if (recipeErr) { setError(recipeErr.message); return }

        // Delete old inputs/outputs, reinsert
        await supabase.from('combination_recipe_inputs').delete().eq('recipe_id', editingRecipe.recipe_id)
        await supabase.from('combination_recipe_outputs').delete().eq('recipe_id', editingRecipe.recipe_id)

        const { error: inErr } = await supabase.from('combination_recipe_inputs').insert(
          form.inputs.map(i => ({ recipe_id: editingRecipe.recipe_id, item_id: i.item_id }))
        )
        if (inErr) { setError(inErr.message); return }

        const { error: outErr } = await supabase.from('combination_recipe_outputs').insert(
          form.outputs.map(o => ({ recipe_id: editingRecipe.recipe_id, item_id: o.item_id, quantity: parseInt(o.quantity) || 1 }))
        )
        if (outErr) { setError(outErr.message); return }

      } else {
        // Insert recipe
        const { data: newRecipe, error: recipeErr } = await supabase
          .from('combination_recipes')
          .insert({
            adventure_id: ADVENTURE_ID,
            name: form.name.trim(),
            result_message: form.result_message.trim(),
            is_active: form.is_active,
            episode_id: form.episode_id || null,
          })
          .select('recipe_id')
          .single()

        if (recipeErr || !newRecipe) { setError(recipeErr?.message ?? 'Errore creazione ricetta'); return }

        const { error: inErr } = await supabase.from('combination_recipe_inputs').insert(
          form.inputs.map(i => ({ recipe_id: newRecipe.recipe_id, item_id: i.item_id }))
        )
        if (inErr) { setError(inErr.message); return }

        const { error: outErr } = await supabase.from('combination_recipe_outputs').insert(
          form.outputs.map(o => ({ recipe_id: newRecipe.recipe_id, item_id: o.item_id, quantity: parseInt(o.quantity) || 1 }))
        )
        if (outErr) { setError(outErr.message); return }
      }

      closeModal()
      router.refresh()
    })
  }

  function handleDelete(recipeId: string) {
    startTransition(async () => {
      // inputs/outputs hanno FK cascade oppure li eliminiamo esplicitamente
      await supabase.from('combination_recipe_inputs').delete().eq('recipe_id', recipeId)
      await supabase.from('combination_recipe_outputs').delete().eq('recipe_id', recipeId)
      const { error: err } = await supabase.from('combination_recipes').delete().eq('recipe_id', recipeId)
      if (err) { alert(err.message); return }
      setRecipes(rs => rs.filter(r => r.recipe_id !== recipeId))
      setDeleteConfirm(null)
    })
  }

  const s = {
    btn: (variant: 'primary' | 'ghost' | 'danger'): React.CSSProperties => ({
      padding: '0.45rem 1rem', borderRadius: '6px',
      border: variant === 'primary' ? 'none' : `1px solid ${variant === 'danger' ? 'rgba(255,80,80,0.4)' : 'rgba(255,255,255,0.12)'}`,
      background: variant === 'primary' ? '#e8af48' : variant === 'danger' ? 'rgba(255,80,80,0.08)' : 'rgba(255,255,255,0.04)',
      color: variant === 'primary' ? '#090807' : variant === 'danger' ? '#ff6060' : '#e8e4dc',
      fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: variant === 'primary' ? 600 : 400,
      cursor: 'pointer', letterSpacing: '0.03em',
    }),
    input: {
      width: '100%', background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
      padding: '0.5rem 0.75rem', color: '#e8e4dc',
      fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box',
    } as React.CSSProperties,
    label: {
      display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)',
      marginBottom: '0.3rem', letterSpacing: '0.06em', textTransform: 'uppercase',
    } as React.CSSProperties,
    sectionTitle: {
      fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em',
      textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)',
      paddingBottom: '0.4rem', marginBottom: '0.875rem', marginTop: '1.5rem',
    } as React.CSSProperties,
    iconBtn: {
      background: 'none', border: 'none', color: 'rgba(255,80,80,0.5)',
      cursor: 'pointer', fontSize: '1rem', padding: '0 0.25rem', lineHeight: 1,
    } as React.CSSProperties,
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.3rem', color: '#feeaa5', fontWeight: 400 }}>Combinazioni</h1>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.2rem' }}>{recipes.length} ricette</p>
        </div>
        <button style={s.btn('primary')} onClick={openCreate}>+ Nuova ricetta</button>
      </div>

      {/* Recipes list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {recipes.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.875rem' }}>
            Nessuna ricetta.
          </div>
        )}
        {recipes.map(recipe => (
          <div key={recipe.recipe_id} style={{
            background: 'rgba(255,255,255,0.02)',
            border: `1px solid ${recipe.is_active ? 'rgba(254,234,165,0.1)' : 'rgba(255,255,255,0.05)'}`,
            borderRadius: '8px', padding: '1rem 1.25rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Nome + stato */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.95rem', color: recipe.is_active ? '#feeaa5' : 'rgba(255,255,255,0.3)' }}>
                    {recipe.name}
                  </span>
                  {!recipe.is_active && (
                    <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)' }}>
                      inattiva
                    </span>
                  )}
                </div>

                {/* Input → Output */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {recipe.combination_recipe_inputs.map(inp => inp.items && (
                      <ItemPill key={inp.input_id} item={inp.items} />
                    ))}
                  </div>

                  <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '1rem', margin: '0 0.25rem' }}>→</span>

                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {recipe.combination_recipe_outputs.map(out => out.items && (
                      <div key={out.output_id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <ItemPill item={out.items} />
                        {out.quantity > 1 && (
                          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>×{out.quantity}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {recipe.result_message && (
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', marginTop: '0.4rem', fontStyle: 'italic' }}>
                    "{recipe.result_message}"
                  </p>
                )}
              </div>

              {/* Azioni */}
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <button style={s.btn('ghost')} onClick={() => openEdit(recipe)}>Modifica</button>
                {deleteConfirm === recipe.recipe_id ? (
                  <>
                    <button style={s.btn('danger')} onClick={() => handleDelete(recipe.recipe_id)} disabled={isPending}>Conferma</button>
                    <button style={s.btn('ghost')} onClick={() => setDeleteConfirm(null)}>Annulla</button>
                  </>
                ) : (
                  <button style={s.btn('danger')} onClick={() => setDeleteConfirm(recipe.recipe_id)}>Elimina</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', width: '100%', maxWidth: '580px', maxHeight: '92vh', overflowY: 'auto', padding: '1.75rem' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.05rem', color: '#feeaa5', fontWeight: 400 }}>
                {editingRecipe ? 'Modifica ricetta' : 'Nuova ricetta'}
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {/* ── Identità ── */}
            <p style={s.sectionTitle}>Identità</p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={s.label}>Nome ricetta *</label>
              <input
                type="text" value={form.name} autoFocus
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={s.input} placeholder="Chiave + Lucchetto"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={s.label}>Messaggio risultato</label>
              <textarea
                value={form.result_message}
                onChange={e => setForm(f => ({ ...f, result_message: e.target.value }))}
                rows={2} style={{ ...s.input, resize: 'vertical' }}
                placeholder="Hai aperto il passaggio segreto…"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={s.label}>Stato</label>
                <select value={form.is_active ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))} style={s.input}>
                  <option value="true">Attiva</option>
                  <option value="false">Inattiva</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Episode ID (opzionale)</label>
                <input
                  type="text" value={form.episode_id}
                  onChange={e => setForm(f => ({ ...f, episode_id: e.target.value }))}
                  style={{ ...s.input, fontFamily: 'Space Mono, monospace', fontSize: '0.78rem' }}
                  placeholder="— valida per tutti"
                />
              </div>
            </div>

            {/* ── Input ── */}
            <p style={s.sectionTitle}>Oggetti richiesti (input)</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {form.inputs.map((inp, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select
                    value={inp.item_id}
                    onChange={e => setInputItem(idx, e.target.value)}
                    style={{ ...s.input, flex: 1 }}
                  >
                    <option value="">— seleziona oggetto</option>
                    {allItems.map(item => (
                      <option key={item.item_id} value={item.item_id}>{item.name}</option>
                    ))}
                  </select>
                  {form.inputs.length > 1 && (
                    <button style={s.iconBtn} onClick={() => removeInput(idx)} title="Rimuovi">✕</button>
                  )}
                </div>
              ))}
            </div>
            <button style={{ ...s.btn('ghost'), fontSize: '0.78rem' }} onClick={addInput}>+ Aggiungi input</button>

            {/* ── Output ── */}
            <p style={s.sectionTitle}>Oggetti prodotti (output)</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {form.outputs.map((out, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select
                    value={out.item_id}
                    onChange={e => setOutputItem(idx, e.target.value)}
                    style={{ ...s.input, flex: 1 }}
                  >
                    <option value="">— seleziona oggetto</option>
                    {allItems.map(item => (
                      <option key={item.item_id} value={item.item_id}>{item.name}</option>
                    ))}
                  </select>
                  <input
                    type="number" value={out.quantity} min={1}
                    onChange={e => setOutputQty(idx, e.target.value)}
                    style={{ ...s.input, width: '70px', flexShrink: 0 }}
                    title="Quantità"
                  />
                  {form.outputs.length > 1 && (
                    <button style={s.iconBtn} onClick={() => removeOutput(idx)} title="Rimuovi">✕</button>
                  )}
                </div>
              ))}
            </div>
            <button style={{ ...s.btn('ghost'), fontSize: '0.78rem' }} onClick={addOutput}>+ Aggiungi output</button>

            {error && (
              <div style={{ margin: '1rem 0', padding: '0.6rem 0.9rem', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: '6px', color: '#ff8080', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button style={s.btn('ghost')} onClick={closeModal}>Annulla</button>
              <button style={s.btn('primary')} onClick={handleSave} disabled={isPending}>
                {isPending ? 'Salvataggio…' : editingRecipe ? 'Aggiorna' : 'Crea'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}