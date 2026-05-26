'use client'

import { useState, useTransition, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ItemQRCode } from './ItemQRCode'
import { useRouter } from 'next/navigation'

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
type UniquenessScope = 'none' | 'per_player' | 'per_episode' | 'per_adventure' | 'global'

type Item = {
  item_id: string
  name: string
  description: string | null
  category: string | null
  rarity: Rarity
  is_stackable: boolean
  is_consumable: boolean
  is_transferable: boolean
  max_stack: number
  claim_code: string | null
  claim_limit: number | null
  claim_limit_per_player: number | null
  uniqueness_scope: UniquenessScope
  icon_url: string | null
  weight: number | null
  tags: string[]
  effect_data: Record<string, unknown>
  custom_data: Record<string, unknown>
}

type ItemForm = {
  name: string
  description: string
  category: string
  rarity: Rarity
  is_stackable: boolean
  is_consumable: boolean
  is_transferable: boolean
  max_stack: string
  claim_code: string
  claim_limit: string
  claim_limit_per_player: string
  uniqueness_scope: UniquenessScope
  icon_url: string
  weight: string
  tags: string
  effect_data: string
}

const EMPTY_FORM: ItemForm = {
  name: '',
  description: '',
  category: '',
  rarity: 'common',
  is_stackable: true,
  is_consumable: false,
  is_transferable: true,
  max_stack: '99',
  claim_code: '',
  claim_limit: '',
  claim_limit_per_player: '1',
  uniqueness_scope: 'none',
  icon_url: '',
  weight: '',
  tags: '',
  effect_data: '{}',
}

const RARITY_CONFIG: Record<Rarity, { label: string; color: string; bg: string }> = {
  common:    { label: 'Comune',      color: 'rgba(255,255,255,0.5)',  bg: 'rgba(255,255,255,0.05)' },
  uncommon:  { label: 'Non comune',  color: '#64d278',               bg: 'rgba(100,210,120,0.08)' },
  rare:      { label: 'Raro',        color: '#5b9bd5',               bg: 'rgba(91,155,213,0.08)'  },
  epic:      { label: 'Epico',       color: '#b57bee',               bg: 'rgba(181,123,238,0.08)' },
  legendary: { label: 'Leggendario', color: '#feeaa5',               bg: 'rgba(254,234,165,0.08)' },
}

const UNIQUENESS_OPTIONS: { value: UniquenessScope; label: string; desc: string }[] = [
  { value: 'none',          label: 'Nessuna',       desc: 'Nessun limite unicità' },
  { value: 'per_player',    label: 'Per giocatore', desc: 'Un giocatore può ottenerlo una volta' },
  { value: 'per_episode',   label: 'Per episodio',  desc: 'Una volta per episodio' },
  { value: 'per_adventure', label: 'Per avventura', desc: 'Una volta per tutta l\'avventura' },
  { value: 'global',        label: 'Globale',       desc: 'Una sola copia in tutto il gioco' },
]

const ADVENTURE_ID = process.env.NEXT_PUBLIC_ADVENTURE_ID!

export default function ItemsClient({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState<Item[]>(initialItems)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [form, setForm] = useState<ItemForm>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [filterRarity, setFilterRarity] = useState<Rarity | 'all'>('all')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [effectDataError, setEffectDataError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const filtered = filterRarity === 'all' ? items : items.filter(i => i.rarity === filterRarity)

  function openCreate() {
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setImageFile(null)
    setImagePreview(null)
    setError(null)
    setEffectDataError(null)
    setModalOpen(true)
  }

  function openEdit(item: Item) {
    setEditingItem(item)
    setForm({
      name: item.name,
      description: item.description ?? '',
      category: item.category ?? '',
      rarity: item.rarity,
      is_stackable: item.is_stackable,
      is_consumable: item.is_consumable,
      is_transferable: item.is_transferable,
      max_stack: item.max_stack.toString(),
      claim_code: item.claim_code ?? '',
      claim_limit: item.claim_limit?.toString() ?? '',
      claim_limit_per_player: item.claim_limit_per_player?.toString() ?? '1',
      uniqueness_scope: item.uniqueness_scope ?? 'none',
      icon_url: item.icon_url ?? '',
      weight: item.weight?.toString() ?? '',
      tags: (item.tags ?? []).join(', '),
      effect_data: JSON.stringify(item.effect_data ?? {}, null, 2),
    })
    setImageFile(null)
    setImagePreview(item.icon_url)
    setError(null)
    setEffectDataError(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingItem(null)
    setImageFile(null)
    setImagePreview(null)
    setError(null)
    setEffectDataError(null)
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function uploadImage(file: File): Promise<string> {
    const ext = file.name.split('.').pop()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage
      .from('item-images')
      .upload(path, file, { upsert: false })
    if (error) throw new Error(error.message)
    const { data } = supabase.storage.from('item-images').getPublicUrl(path)
    return data.publicUrl
  }

  function parseEffectData(): Record<string, unknown> | null {
    try {
      const parsed = JSON.parse(form.effect_data || '{}')
      setEffectDataError(null)
      return parsed
    } catch {
      setEffectDataError('JSON non valido')
      return null
    }
  }

  function parseTags(): string[] {
    return form.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
  }

  function buildPayload(iconUrl: string) {
    return {
      adventure_id: ADVENTURE_ID,
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || null,
      rarity: form.rarity,
      is_stackable: form.is_stackable,
      is_consumable: form.is_consumable,
      is_transferable: form.is_transferable,
      max_stack: parseInt(form.max_stack) || 99,
      claim_code: form.claim_code.trim() || null,
      claim_limit: form.claim_limit ? parseInt(form.claim_limit) : null,
      claim_limit_per_player: form.claim_limit_per_player ? parseInt(form.claim_limit_per_player) : 1,
      uniqueness_scope: form.uniqueness_scope,
      icon_url: iconUrl || null,
      weight: form.weight ? parseInt(form.weight) : null,
      tags: parseTags(),
      effect_data: parseEffectData() ?? {},
    }
  }

  function handleSave() {
    if (!form.name.trim()) { setError('Il nome è obbligatorio.'); return }
    const effectParsed = parseEffectData()
    if (effectParsed === null) return // errore già mostrato inline

    startTransition(async () => {
      setError(null)
      setUploading(true)

      let iconUrl = form.icon_url
      if (imageFile) {
        try {
          iconUrl = await uploadImage(imageFile)
        } catch (e) {
          setError(`Errore upload: ${(e as Error).message}`)
          setUploading(false)
          return
        }
      }
      setUploading(false)

      if (editingItem) {
        const { data, error: err } = await supabase
          .from('items')
          .update(buildPayload(iconUrl))
          .eq('item_id', editingItem.item_id)
          .select()
          .single()
        if (err) { setError(err.message); return }
        setItems(is => is.map(i => i.item_id === data.item_id ? data : i))
      } else {
        const { data, error: err } = await supabase
          .from('items')
          .insert(buildPayload(iconUrl))
          .select()
          .single()
        if (err) { setError(err.message); return }
        setItems(is => [...is, data].sort((a, b) => a.name.localeCompare(b.name)))
      }
      closeModal()
      router.refresh()
    })
  }

  function handleDelete(itemId: string) {
    startTransition(async () => {
      const { error: err } = await supabase.from('items').delete().eq('item_id', itemId)
      if (err) { alert(err.message); return }
      setItems(is => is.filter(i => i.item_id !== itemId))
      setDeleteConfirm(null)
    })
  }

  const s = {
    btn: (variant: 'primary' | 'ghost' | 'danger'): React.CSSProperties => ({
      padding: '0.45rem 1rem',
      borderRadius: '6px',
      border: variant === 'primary' ? 'none' : `1px solid ${variant === 'danger' ? 'rgba(255,80,80,0.4)' : 'rgba(255,255,255,0.12)'}`,
      background: variant === 'primary' ? '#e8af48' : variant === 'danger' ? 'rgba(255,80,80,0.08)' : 'rgba(255,255,255,0.04)',
      color: variant === 'primary' ? '#090807' : variant === 'danger' ? '#ff6060' : '#e8e4dc',
      fontFamily: 'inherit',
      fontSize: '0.82rem',
      fontWeight: variant === 'primary' ? 600 : 400,
      cursor: 'pointer',
      letterSpacing: '0.03em',
    }),
    input: {
      width: '100%',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '6px',
      padding: '0.5rem 0.75rem',
      color: '#e8e4dc',
      fontFamily: 'inherit',
      fontSize: '0.9rem',
      boxSizing: 'border-box',
    } as React.CSSProperties,
    label: {
      display: 'block',
      fontSize: '0.75rem',
      color: 'rgba(255,255,255,0.4)',
      marginBottom: '0.3rem',
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
    } as React.CSSProperties,
    sectionTitle: {
      fontSize: '0.7rem',
      color: 'rgba(255,255,255,0.2)',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      paddingBottom: '0.4rem',
      marginBottom: '0.875rem',
      marginTop: '1.5rem',
    } as React.CSSProperties,
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.3rem', color: '#feeaa5', fontWeight: 400 }}>Oggetti</h1>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.2rem' }}>{items.length} oggetti nel catalogo</p>
        </div>
        <button style={s.btn('primary')} onClick={openCreate}>+ Nuovo oggetto</button>
      </div>

      {/* Rarity filter */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {(['all', ...Object.keys(RARITY_CONFIG) as Rarity[]] as const).map(r => {
          const cfg = r !== 'all' ? RARITY_CONFIG[r as Rarity] : null
          const count = r === 'all' ? items.length : items.filter(i => i.rarity === r).length
          const active = filterRarity === r
          return (
            <button
              key={r}
              onClick={() => setFilterRarity(r as Rarity | 'all')}
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: '99px',
                border: `1px solid ${active ? (cfg?.color ?? 'rgba(255,255,255,0.4)') : 'rgba(255,255,255,0.08)'}`,
                background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: active ? (cfg?.color ?? '#e8e4dc') : 'rgba(255,255,255,0.3)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {r === 'all' ? `Tutti (${count})` : `${cfg!.label} (${count})`}
            </button>
          )
        })}
      </div>

      {/* Items grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.875rem' }}>
            Nessun oggetto.
          </div>
        )}
        {filtered.map(item => {
          const cfg = RARITY_CONFIG[item.rarity]
          return (
            <div key={item.item_id} style={{
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${cfg.color}22`,
              borderRadius: '8px',
              padding: '1rem',
              display: 'flex',
              gap: '0.875rem',
            }}>
              {/* Icon */}
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '6px',
                background: cfg.bg,
                border: `1px solid ${cfg.color}33`,
                flexShrink: 0,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {item.icon_url ? (
                  <img src={item.icon_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '1.4rem', opacity: 0.4 }}>⬡</span>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ color: cfg.color, fontSize: '0.9rem', fontWeight: 500 }}>{item.name}</span>
                  <span style={{ fontSize: '0.65rem', color: cfg.color, opacity: 0.7, whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
                    {cfg.label}
                  </span>
                </div>

                {item.description && (
                  <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', margin: '0.2rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.description}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                  {item.category && (
                    <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                      {item.category}
                    </span>
                  )}
                  {item.is_consumable && (
                    <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(255,165,100,0.08)', color: 'rgba(255,165,100,0.7)' }}>
                      consumabile
                    </span>
                  )}
                  {!item.is_transferable && (
                    <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(255,80,80,0.06)', color: 'rgba(255,120,120,0.6)' }}>
                      non trasferibile
                    </span>
                  )}
                  {item.uniqueness_scope !== 'none' && (
                    <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(254,234,165,0.06)', color: 'rgba(254,234,165,0.5)' }}>
                      {UNIQUENESS_OPTIONS.find(u => u.value === item.uniqueness_scope)?.label}
                    </span>
                  )}
                  {item.claim_code && (
                    <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)', fontFamily: 'Space Mono, monospace' }}>
                      {item.claim_code}
                    </span>
                  )}
                  {(item.tags ?? []).map(tag => (
                    <span key={tag} style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(91,155,213,0.08)', color: 'rgba(91,155,213,0.7)' }}>
                      {tag}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem' }}>
                  <button style={s.btn('ghost')} onClick={() => openEdit(item)}>Modifica</button>
                  {deleteConfirm === item.item_id ? (
                    <>
                      <button style={s.btn('danger')} onClick={() => handleDelete(item.item_id)} disabled={isPending}>Conferma</button>
                      <button style={s.btn('ghost')} onClick={() => setDeleteConfirm(null)}>Annulla</button>
                    </>
                  ) : (
                    <button style={s.btn('danger')} onClick={() => setDeleteConfirm(item.item_id)}>Elimina</button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', width: '100%', maxWidth: '600px', maxHeight: '92vh', overflowY: 'auto', padding: '1.75rem' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.05rem', color: '#feeaa5', fontWeight: 400 }}>
                {editingItem ? 'Modifica oggetto' : 'Nuovo oggetto'}
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {/* ── SEZIONE: Identità ── */}
            <p style={s.sectionTitle}>Identità</p>

            {/* Image upload */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={s.label}>Immagine</label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '72px', height: '72px', borderRadius: '8px',
                    border: '1px dashed rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.03)', cursor: 'pointer',
                    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  {imagePreview
                    ? <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '1.5rem', opacity: 0.3 }}>+</span>
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                  <button onClick={() => fileInputRef.current?.click()} style={{ ...s.btn('ghost'), marginBottom: '0.4rem' }}>
                    {imagePreview ? 'Cambia immagine' : 'Carica immagine'}
                  </button>
                  {imagePreview && (
                    <button onClick={() => { setImagePreview(null); setImageFile(null); setForm(f => ({ ...f, icon_url: '' })) }} style={{ ...s.btn('danger'), marginLeft: '0.5rem' }}>
                      Rimuovi
                    </button>
                  )}
                  <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', marginTop: '0.3rem' }}>PNG, JPG, WEBP — max 2MB</p>
                </div>
              </div>
            </div>

            {/* Nome + Categoria */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={s.label}>Nome *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={s.input} placeholder="Chiave Arrugginita" autoFocus />
              </div>
              <div>
                <label style={s.label}>Categoria</label>
                <input type="text" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={s.input} placeholder="key, document…" />
              </div>
            </div>

            {/* Descrizione */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={s.label}>Descrizione</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ ...s.input, resize: 'vertical' }} placeholder="Una vecchia chiave arrugginita…" />
            </div>

            {/* Tags */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={s.label}>Tag</label>
              <input
                type="text"
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                style={s.input}
                placeholder="chiave, porta, segreto  (separati da virgola)"
              />
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.25rem' }}>Separare i tag con virgola</p>
            </div>

            {/* Rarità */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={s.label}>Rarità</label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {(Object.keys(RARITY_CONFIG) as Rarity[]).map(r => {
                  const cfg = RARITY_CONFIG[r]
                  const active = form.rarity === r
                  return (
                    <button
                      key={r}
                      onClick={() => setForm(f => ({ ...f, rarity: r }))}
                      style={{
                        padding: '0.3rem 0.75rem', borderRadius: '6px',
                        border: `1px solid ${active ? cfg.color : 'rgba(255,255,255,0.08)'}`,
                        background: active ? cfg.bg : 'transparent',
                        color: active ? cfg.color : 'rgba(255,255,255,0.3)',
                        fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── SEZIONE: Proprietà ── */}
            <p style={s.sectionTitle}>Proprietà</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={s.label}>Stackable</label>
                <select value={form.is_stackable ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, is_stackable: e.target.value === 'true' }))} style={s.input}>
                  <option value="true">Sì</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Consumabile</label>
                <select value={form.is_consumable ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, is_consumable: e.target.value === 'true' }))} style={s.input}>
                  <option value="false">No</option>
                  <option value="true">Sì</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Trasferibile</label>
                <select value={form.is_transferable ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, is_transferable: e.target.value === 'true' }))} style={s.input}>
                  <option value="true">Sì</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Max stack</label>
                <input type="number" value={form.max_stack} onChange={e => setForm(f => ({ ...f, max_stack: e.target.value }))} style={s.input} min={1} />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={s.label}>Peso</label>
              <input
                type="number"
                value={form.weight}
                onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                style={{ ...s.input, maxWidth: '120px' }}
                placeholder="—"
                min={0}
              />
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.25rem' }}>Unità arbitrarie (opzionale)</p>
            </div>

            {/* ── SEZIONE: Claim & Unicità ── */}
            <p style={s.sectionTitle}>Claim & Unicità</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={s.label}>Codice claim</label>
                <input
                  type="text"
                  value={form.claim_code}
                  onChange={e => setForm(f => ({ ...f, claim_code: e.target.value.toUpperCase() }))}
                  style={{ ...s.input, fontFamily: 'Space Mono, monospace' }}
                  placeholder="CHIAVE42"
                />
              </div>
              <div>
                <label style={s.label}>Limite globale</label>
                <input type="number" value={form.claim_limit} onChange={e => setForm(f => ({ ...f, claim_limit: e.target.value }))} style={s.input} placeholder="— illimitato" min={1} />
              </div>
              <div>
                <label style={s.label}>Limit. per giocatore</label>
                <input type="number" value={form.claim_limit_per_player} onChange={e => setForm(f => ({ ...f, claim_limit_per_player: e.target.value }))} style={s.input} min={1} />
              </div>
            </div>

            {/* Uniqueness scope */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={s.label}>Scope unicità</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {UNIQUENESS_OPTIONS.map(opt => {
                  const active = form.uniqueness_scope === opt.value
                  return (
                    <label
                      key={opt.value}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer',
                        border: `1px solid ${active ? 'rgba(254,234,165,0.3)' : 'rgba(255,255,255,0.06)'}`,
                        background: active ? 'rgba(254,234,165,0.04)' : 'transparent',
                      }}
                    >
                      <input
                        type="radio"
                        name="uniqueness_scope"
                        value={opt.value}
                        checked={active}
                        onChange={() => setForm(f => ({ ...f, uniqueness_scope: opt.value }))}
                        style={{ accentColor: '#feeaa5' }}
                      />
                      <div>
                        <span style={{ fontSize: '0.83rem', color: active ? '#feeaa5' : '#e8e4dc' }}>{opt.label}</span>
                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginLeft: '0.5rem' }}>{opt.desc}</span>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* ── SEZIONE: Effetti (avanzato) ── */}
            <p style={s.sectionTitle}>Effetti (avanzato)</p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={s.label}>effect_data (JSON)</label>
              <textarea
                value={form.effect_data}
                onChange={e => { setForm(f => ({ ...f, effect_data: e.target.value })); setEffectDataError(null) }}
                rows={4}
                style={{ ...s.input, fontFamily: 'Space Mono, monospace', fontSize: '0.8rem', resize: 'vertical' }}
                placeholder='{}'
                spellCheck={false}
              />
              {effectDataError && (
                <p style={{ fontSize: '0.72rem', color: '#ff8080', marginTop: '0.25rem' }}>{effectDataError}</p>
              )}
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.25rem' }}>
                Dati strutturati per il rules engine. Lasciare {'{ }'} se non usato.
              </p>
            </div>

            {/* QR Code (solo edit) */}
            {editingItem && (
              <ItemQRCode
                itemId={editingItem.item_id}
                itemName={editingItem.name}
                rarity={editingItem.rarity}
              />
            )}

            {error && (
              <div style={{ marginBottom: '1rem', padding: '0.6rem 0.9rem', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: '6px', color: '#ff8080', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button style={s.btn('ghost')} onClick={closeModal}>Annulla</button>
              <button style={s.btn('primary')} onClick={handleSave} disabled={isPending || uploading}>
                {uploading ? 'Upload…' : isPending ? 'Salvataggio…' : editingItem ? 'Aggiorna' : 'Crea'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}