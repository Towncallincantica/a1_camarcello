'use client'

import { useState, useTransition, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type MarkerType = 'location' | 'clue' | 'npc' | 'entrance' | 'secret' | 'danger' | 'meeting_point'
type InteractionType = 'none' | 'claim_item' | 'narrative' | 'npc_dialog' | 'zone_effect' | 'team_unlock'

type Marker = {
  marker_id: string
  name: string
  description: string
  content_html: string
  lat: number
  lng: number
  radius_meters: number
  marker_type: MarkerType
  interaction_type: InteractionType
  interaction_data: Record<string, unknown>
  icon: string
  is_active: boolean
  visibility_rules: VisibilityRule[]
  sort_order: number
  episode_id: string | null
  custom_data: Record<string, unknown>
}

type Episode = { episode_id: string; name: string }
type ItemRef = { item_id: string; name: string; icon_url: string | null; rarity: string }

// ── Visibility rules ──────────────────────────────────────────
type VRAlways          = { type: 'always' }
type VREpisode         = { type: 'episode_active'; episode_id: string }
type VRTimeWindow      = { type: 'time_window'; from: string; to: string }
type VRProximityMarker = { type: 'proximity_marker'; marker_id: string; within_meters: number }
type VRMinLevel        = { type: 'min_level'; level: number }
type VRHasStatus       = { type: 'has_status'; status_type: string }
type VRTeamNearby      = { type: 'team_nearby'; min_members: number; within_meters: number }
type VRTeamHasItem     = { type: 'team_has_item'; item_id: string }
type VisibilityRule    = VRAlways | VREpisode | VRTimeWindow | VRProximityMarker | VRMinLevel | VRHasStatus | VRTeamNearby | VRTeamHasItem

type MarkerForm = {
  name: string
  description: string
  content_html: string
  lat: string
  lng: string
  radius_meters: string
  marker_type: MarkerType
  interaction_type: InteractionType
  interaction_data: string
  icon: string
  is_active: boolean
  visibility_rules: VisibilityRule[]
  sort_order: string
  episode_id: string
}

const EMPTY_FORM: MarkerForm = {
  name: '', description: '', content_html: '',
  lat: '', lng: '', radius_meters: '30',
  marker_type: 'location', interaction_type: 'none',
  interaction_data: '{}', icon: '📍',
  is_active: true, visibility_rules: [], sort_order: '0', episode_id: '',
}

const MARKER_TYPES: { value: MarkerType; label: string; icon: string }[] = [
  { value: 'location',      label: 'Luogo',         icon: '📍' },
  { value: 'clue',          label: 'Indizio',        icon: '🔍' },
  { value: 'npc',           label: 'NPC',            icon: '🧙' },
  { value: 'entrance',      label: 'Ingresso',       icon: '🚪' },
  { value: 'secret',        label: 'Segreto',        icon: '🔮' },
  { value: 'danger',        label: 'Pericolo',       icon: '⚠️' },
  { value: 'meeting_point', label: 'Punto incontro', icon: '🏴' },
]

const INTERACTION_TYPES: { value: InteractionType; label: string; desc: string }[] = [
  { value: 'none',        label: 'Nessuna',         desc: 'Solo visualizzazione' },
  { value: 'claim_item',  label: 'Raccolta item',   desc: 'Il player raccoglie un oggetto per prossimità' },
  { value: 'narrative',   label: 'Narrativo',       desc: 'Mostra testo con scelte' },
  { value: 'npc_dialog',  label: 'Dialogo NPC',     desc: 'Interazione con personaggio' },
  { value: 'zone_effect', label: 'Effetto zona',    desc: 'Applica status effect all\'entrata' },
  { value: 'team_unlock', label: 'Sblocco squadra', desc: 'Si attiva quando il team è riunito' },
]

const VR_TYPES = [
  { value: 'always',           label: 'Sempre visibile' },
  { value: 'episode_active',   label: 'Durante episodio' },
  { value: 'time_window',      label: 'Finestra oraria' },
  { value: 'proximity_marker', label: 'Prossimità marker' },
  { value: 'min_level',        label: 'Livello minimo' },
  { value: 'has_status',       label: 'Status attivo' },
  { value: 'team_nearby',      label: 'Team nelle vicinanze' },
  { value: 'team_has_item',    label: 'Team possiede item' },
]

const ADVENTURE_ID = process.env.NEXT_PUBLIC_ADVENTURE_ID!

function defaultRule(type: string): VisibilityRule {
  switch (type) {
    case 'always':           return { type: 'always' }
    case 'episode_active':   return { type: 'episode_active', episode_id: '' }
    case 'time_window':      return { type: 'time_window', from: '09:00', to: '18:00' }
    case 'proximity_marker': return { type: 'proximity_marker', marker_id: '', within_meters: 50 }
    case 'min_level':        return { type: 'min_level', level: 2 }
    case 'has_status':       return { type: 'has_status', status_type: '' }
    case 'team_nearby':      return { type: 'team_nearby', min_members: 2, within_meters: 30 }
    case 'team_has_item':    return { type: 'team_has_item', item_id: '' }
    default:                 return { type: 'always' }
  }
}

// ── VisibilityRuleEditor ───────────────────────────────────────
function VisibilityRuleEditor({
  rule, index, episodes, markers, items, onChange, onRemove,
}: {
  rule: VisibilityRule
  index: number
  episodes: Episode[]
  markers: Marker[]
  items: ItemRef[]
  onChange: (idx: number, rule: VisibilityRule) => void
  onRemove: (idx: number) => void
}) {
  const s = {
    input: {
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '5px', padding: '0.35rem 0.6rem', color: '#e8e4dc',
      fontFamily: 'inherit', fontSize: '0.82rem', width: '100%', boxSizing: 'border-box',
    } as React.CSSProperties,
  }

  function update(patch: Partial<VisibilityRule>) {
    onChange(index, { ...rule, ...patch } as VisibilityRule)
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '6px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
    }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <select
          value={rule.type}
          onChange={e => onChange(index, defaultRule(e.target.value))}
          style={{ ...s.input, flex: 1 }}
        >
          {VR_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button
          onClick={() => onRemove(index)}
          style={{ background: 'none', border: 'none', color: 'rgba(255,80,80,0.5)', cursor: 'pointer', fontSize: '1rem', padding: '0 0.25rem' }}
        >✕</button>
      </div>

      {rule.type === 'episode_active' && (
        <select value={rule.episode_id} onChange={e => update({ episode_id: e.target.value } as Partial<VREpisode>)} style={s.input}>
          <option value="">— seleziona episodio</option>
          {episodes.map(ep => <option key={ep.episode_id} value={ep.episode_id}>{ep.name}</option>)}
        </select>
      )}

      {rule.type === 'time_window' && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input type="time" value={rule.from} onChange={e => update({ from: e.target.value } as Partial<VRTimeWindow>)} style={{ ...s.input, width: '120px' }} />
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>→</span>
          <input type="time" value={rule.to} onChange={e => update({ to: e.target.value } as Partial<VRTimeWindow>)} style={{ ...s.input, width: '120px' }} />
        </div>
      )}

      {rule.type === 'proximity_marker' && (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select value={rule.marker_id} onChange={e => update({ marker_id: e.target.value } as Partial<VRProximityMarker>)} style={{ ...s.input, flex: 1 }}>
            <option value="">— seleziona marker</option>
            {markers.map(m => <option key={m.marker_id} value={m.marker_id}>{m.icon} {m.name}</option>)}
          </select>
          <input
            type="number" value={rule.within_meters} min={1}
            onChange={e => update({ within_meters: parseInt(e.target.value) || 50 } as Partial<VRProximityMarker>)}
            style={{ ...s.input, width: '80px' }} placeholder="m"
          />
        </div>
      )}

      {rule.type === 'min_level' && (
        <input
          type="number" value={rule.level} min={1}
          onChange={e => update({ level: parseInt(e.target.value) || 1 } as Partial<VRMinLevel>)}
          style={{ ...s.input, maxWidth: '100px' }} placeholder="Livello"
        />
      )}

      {rule.type === 'has_status' && (
        <input
          type="text" value={rule.status_type}
          onChange={e => update({ status_type: e.target.value } as Partial<VRHasStatus>)}
          style={s.input} placeholder="es. ghost_vision"
        />
      )}

      {rule.type === 'team_nearby' && (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="number" value={rule.min_members} min={1}
            onChange={e => update({ min_members: parseInt(e.target.value) || 2 } as Partial<VRTeamNearby>)}
            style={{ ...s.input, width: '90px' }} placeholder="Membri"
          />
          <input
            type="number" value={rule.within_meters} min={1}
            onChange={e => update({ within_meters: parseInt(e.target.value) || 30 } as Partial<VRTeamNearby>)}
            style={{ ...s.input, width: '80px' }} placeholder="m"
          />
        </div>
      )}

      {rule.type === 'team_has_item' && (
        <select value={rule.item_id} onChange={e => update({ item_id: e.target.value } as Partial<VRTeamHasItem>)} style={s.input}>
          <option value="">— seleziona item</option>
          {items.map(it => <option key={it.item_id} value={it.item_id}>{it.name}</option>)}
        </select>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────
export default function MarkersClient({
  initialMarkers, episodes, items,
}: {
  initialMarkers: Marker[]
  episodes: Episode[]
  items: ItemRef[]
}) {
  const [markers, setMarkers] = useState<Marker[]>(initialMarkers)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMarker, setEditingMarker] = useState<Marker | null>(null)
  const [form, setForm] = useState<MarkerForm>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [interactionError, setInteractionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<MarkerType | 'all'>('all')
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const filtered = filterType === 'all' ? markers : markers.filter(m => m.marker_type === filterType)

  function openCreate() {
    setEditingMarker(null)
    setForm(EMPTY_FORM)
    setError(null)
    setInteractionError(null)
    setModalOpen(true)
  }

  function openEdit(marker: Marker) {
    setEditingMarker(marker)
    setForm({
      name: marker.name,
      description: marker.description,
      content_html: marker.content_html,
      lat: marker.lat.toString(),
      lng: marker.lng.toString(),
      radius_meters: marker.radius_meters.toString(),
      marker_type: marker.marker_type,
      interaction_type: marker.interaction_type,
      interaction_data: JSON.stringify(marker.interaction_data, null, 2),
      icon: marker.icon,
      is_active: marker.is_active,
      visibility_rules: marker.visibility_rules ?? [],
      sort_order: marker.sort_order.toString(),
      episode_id: marker.episode_id ?? '',
    })
    setError(null)
    setInteractionError(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingMarker(null)
    setError(null)
    setInteractionError(null)
  }

  function addRule(type: string) {
    setForm(f => ({ ...f, visibility_rules: [...f.visibility_rules, defaultRule(type)] }))
  }

  function updateRule(idx: number, rule: VisibilityRule) {
    setForm(f => ({ ...f, visibility_rules: f.visibility_rules.map((r, i) => i === idx ? rule : r) }))
  }

  function removeRule(idx: number) {
    setForm(f => ({ ...f, visibility_rules: f.visibility_rules.filter((_, i) => i !== idx) }))
  }

  function parseInteractionData(): Record<string, unknown> | null {
    try {
      const p = JSON.parse(form.interaction_data || '{}')
      setInteractionError(null)
      return p
    } catch {
      setInteractionError('JSON non valido')
      return null
    }
  }

  function validate(): string | null {
    if (!form.name.trim()) return 'Il nome è obbligatorio.'
    if (!form.lat || isNaN(parseFloat(form.lat))) return 'Latitudine non valida.'
    if (!form.lng || isNaN(parseFloat(form.lng))) return 'Longitudine non valida.'
    return null
  }

  function buildPayload() {
    return {
      adventure_id: ADVENTURE_ID,
      name: form.name.trim(),
      description: form.description.trim(),
      content_html: form.content_html.trim(),
      lat: parseFloat(form.lat),
      lng: parseFloat(form.lng),
      radius_meters: parseInt(form.radius_meters) || 30,
      marker_type: form.marker_type,
      interaction_type: form.interaction_type,
      interaction_data: parseInteractionData() ?? {},
      icon: form.icon || '📍',
      is_active: form.is_active,
      visibility_rules: form.visibility_rules,
      sort_order: parseInt(form.sort_order) || 0,
      episode_id: form.episode_id || null,
    }
  }

  function handleSave() {
    const err = validate()
    if (err) { setError(err); return }
    if (parseInteractionData() === null) return

    startTransition(async () => {
      setError(null)
      if (editingMarker) {
        const { data, error: err } = await supabase
          .from('map_markers')
          .update(buildPayload())
          .eq('marker_id', editingMarker.marker_id)
          .select()
          .single()
        if (err) { setError(err.message); return }
        setMarkers(ms => ms.map(m => m.marker_id === data.marker_id ? data : m))
      } else {
        const { data, error: err } = await supabase
          .from('map_markers')
          .insert(buildPayload())
          .select()
          .single()
        if (err) { setError(err.message); return }
        setMarkers(ms => [...ms, data])
      }
      closeModal()
      router.refresh()
    })
  }

  function handleDelete(markerId: string) {
    startTransition(async () => {
      const { error: err } = await supabase.from('map_markers').delete().eq('marker_id', markerId)
      if (err) { alert(err.message); return }
      setMarkers(ms => ms.filter(m => m.marker_id !== markerId))
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
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.3rem', color: '#feeaa5', fontWeight: 400 }}>Marker Mappa</h1>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.2rem' }}>{markers.length} marker</p>
        </div>
        <button style={s.btn('primary')} onClick={openCreate}>+ Nuovo marker</button>
      </div>

      {/* Type filter */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {(['all', ...MARKER_TYPES.map(t => t.value)] as const).map(t => {
          const cfg = t !== 'all' ? MARKER_TYPES.find(m => m.value === t) : null
          const count = t === 'all' ? markers.length : markers.filter(m => m.marker_type === t).length
          const active = filterType === t
          return (
            <button key={t} onClick={() => setFilterType(t as MarkerType | 'all')} style={{
              padding: '0.3rem 0.75rem', borderRadius: '99px',
              border: `1px solid ${active ? 'rgba(254,234,165,0.5)' : 'rgba(255,255,255,0.08)'}`,
              background: active ? 'rgba(254,234,165,0.06)' : 'transparent',
              color: active ? '#feeaa5' : 'rgba(255,255,255,0.3)',
              fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {t === 'all' ? `Tutti (${count})` : `${cfg!.icon} ${cfg!.label} (${count})`}
            </button>
          )
        })}
      </div>

      {/* Markers list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {filtered.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.875rem' }}>
            Nessun marker.
          </div>
        )}
        {filtered.map(marker => {
          const typeCfg = MARKER_TYPES.find(t => t.value === marker.marker_type)
          return (
            <div key={marker.marker_id} style={{
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${marker.is_active ? 'rgba(254,234,165,0.08)' : 'rgba(255,255,255,0.04)'}`,
              borderRadius: '8px', padding: '0.875rem 1.25rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
            }}>
              <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center', flex: 1, minWidth: 0 }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '8px', flexShrink: 0,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
                }}>
                  {marker.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ color: marker.is_active ? '#e8e4dc' : 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
                      {marker.name}
                    </span>
                    <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}>
                      {typeCfg?.icon} {typeCfg?.label}
                    </span>
                    {!marker.is_active && (
                      <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.2)' }}>
                        inattivo
                      </span>
                    )}
                    {marker.interaction_type !== 'none' && (
                      <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(232,175,72,0.08)', color: 'rgba(232,175,72,0.6)' }}>
                        {INTERACTION_TYPES.find(i => i.value === marker.interaction_type)?.label}
                      </span>
                    )}
                    {(marker.visibility_rules ?? []).length > 0 && (
                      <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(91,155,213,0.08)', color: 'rgba(91,155,213,0.6)' }}>
                        {marker.visibility_rules.length} regol{marker.visibility_rules.length === 1 ? 'a' : 'e'}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', marginTop: '0.2rem', fontFamily: 'Space Mono, monospace' }}>
                    {marker.lat.toFixed(5)}, {marker.lng.toFixed(5)} · r{marker.radius_meters}m
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <button style={s.btn('ghost')} onClick={() => openEdit(marker)}>Modifica</button>
                {deleteConfirm === marker.marker_id ? (
                  <>
                    <button style={s.btn('danger')} onClick={() => handleDelete(marker.marker_id)} disabled={isPending}>Conferma</button>
                    <button style={s.btn('ghost')} onClick={() => setDeleteConfirm(null)}>Annulla</button>
                  </>
                ) : (
                  <button style={s.btn('danger')} onClick={() => setDeleteConfirm(marker.marker_id)}>Elimina</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', width: '100%', maxWidth: '640px', maxHeight: '92vh', overflowY: 'auto', padding: '1.75rem' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.05rem', color: '#feeaa5', fontWeight: 400 }}>
                {editingMarker ? 'Modifica marker' : 'Nuovo marker'}
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {/* ── Identità ── */}
            <p style={s.sectionTitle}>Identità</p>

            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={s.label}>Icona</label>
                <input type="text" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} style={{ ...s.input, textAlign: 'center', fontSize: '1.3rem' }} maxLength={2} />
              </div>
              <div>
                <label style={s.label}>Nome *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={s.input} placeholder="Torre Est" autoFocus />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={s.label}>Descrizione breve</label>
              <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={s.input} placeholder="Visibile sulla mappa al tap" />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={s.label}>Contenuto (HTML)</label>
              <textarea value={form.content_html} onChange={e => setForm(f => ({ ...f, content_html: e.target.value }))} rows={3} style={{ ...s.input, resize: 'vertical', fontFamily: 'Space Mono, monospace', fontSize: '0.8rem' }} placeholder="<p>Testo narrativo del marker...</p>" />
            </div>

            {/* Tipo marker */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={s.label}>Tipo</label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {MARKER_TYPES.map(t => {
                  const active = form.marker_type === t.value
                  return (
                    <button key={t.value} onClick={() => setForm(f => ({ ...f, marker_type: t.value }))} style={{
                      padding: '0.3rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit',
                      border: `1px solid ${active ? 'rgba(254,234,165,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      background: active ? 'rgba(254,234,165,0.06)' : 'transparent',
                      color: active ? '#feeaa5' : 'rgba(255,255,255,0.4)', fontSize: '0.78rem',
                    }}>
                      {t.icon} {t.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Posizione ── */}
            <p style={s.sectionTitle}>Posizione</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={s.label}>Latitudine *</label>
                <input type="number" value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))} style={s.input} placeholder="45.12345" step="0.00001" />
              </div>
              <div>
                <label style={s.label}>Longitudine *</label>
                <input type="number" value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))} style={s.input} placeholder="11.12345" step="0.00001" />
              </div>
              <div>
                <label style={s.label}>Raggio (m)</label>
                <input type="number" value={form.radius_meters} onChange={e => setForm(f => ({ ...f, radius_meters: e.target.value }))} style={s.input} min={1} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={s.label}>Episodio (opzionale)</label>
                <select value={form.episode_id} onChange={e => setForm(f => ({ ...f, episode_id: e.target.value }))} style={s.input}>
                  <option value="">— tutti gli episodi</option>
                  {episodes.map(ep => <option key={ep.episode_id} value={ep.episode_id}>{ep.name}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Ordine</label>
                <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} style={s.input} min={0} />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={s.label}>Stato</label>
              <select value={form.is_active ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))} style={{ ...s.input, maxWidth: '180px' }}>
                <option value="true">Attivo</option>
                <option value="false">Inattivo</option>
              </select>
            </div>

            {/* ── Interazione ── */}
            <p style={s.sectionTitle}>Interazione al click</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
              {INTERACTION_TYPES.map(it => {
                const active = form.interaction_type === it.value
                return (
                  <label key={it.value} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer',
                    border: `1px solid ${active ? 'rgba(232,175,72,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    background: active ? 'rgba(232,175,72,0.04)' : 'transparent',
                  }}>
                    <input type="radio" name="interaction_type" value={it.value} checked={active} onChange={() => setForm(f => ({ ...f, interaction_type: it.value }))} style={{ accentColor: '#e8af48' }} />
                    <div>
                      <span style={{ fontSize: '0.83rem', color: active ? '#e8af48' : '#e8e4dc' }}>{it.label}</span>
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginLeft: '0.5rem' }}>{it.desc}</span>
                    </div>
                  </label>
                )
              })}
            </div>

            {form.interaction_type !== 'none' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={s.label}>interaction_data (JSON)</label>
                <textarea
                  value={form.interaction_data}
                  onChange={e => { setForm(f => ({ ...f, interaction_data: e.target.value })); setInteractionError(null) }}
                  rows={3} style={{ ...s.input, fontFamily: 'Space Mono, monospace', fontSize: '0.8rem', resize: 'vertical' }}
                  spellCheck={false}
                />
                {interactionError && <p style={{ fontSize: '0.72rem', color: '#ff8080', marginTop: '0.25rem' }}>{interactionError}</p>}
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.25rem' }}>
                  {form.interaction_type === 'claim_item'  && '{ "item_id": "uuid" }'}
                  {form.interaction_type === 'zone_effect' && '{ "status_type": "ghost_vision", "duration_minutes": 30 }'}
                  {form.interaction_type === 'team_unlock' && '{ "min_members": 3 }'}
                  {form.interaction_type === 'npc_dialog'  && '{ "npc_name": "Il Guardiano", "opening_line": "..." }'}
                  {form.interaction_type === 'narrative'   && '{ "choices": [{ "label": "Entra", "effect": "..." }] }'}
                </p>
              </div>
            )}

            {/* ── Visibilità ── */}
            <p style={s.sectionTitle}>Regole di visibilità</p>

            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', marginBottom: '0.75rem' }}>
              Tutte le regole devono essere vere (AND). Lista vuota = sempre visibile.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {form.visibility_rules.map((rule, idx) => (
                <VisibilityRuleEditor
                  key={idx} rule={rule} index={idx}
                  episodes={episodes} markers={markers} items={items}
                  onChange={updateRule} onRemove={removeRule}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {VR_TYPES.map(t => (
                <button key={t.value} onClick={() => addRule(t.value)} style={{ ...s.btn('ghost'), fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}>
                  + {t.label}
                </button>
              ))}
            </div>

            {error && (
              <div style={{ margin: '1rem 0', padding: '0.6rem 0.9rem', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: '6px', color: '#ff8080', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button style={s.btn('ghost')} onClick={closeModal}>Annulla</button>
              <button style={s.btn('primary')} onClick={handleSave} disabled={isPending}>
                {isPending ? 'Salvataggio…' : editingMarker ? 'Aggiorna' : 'Crea'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}