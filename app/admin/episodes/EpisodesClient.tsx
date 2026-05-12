'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ADVENTURE_ID } from '@/lib/constants'
import { useRouter } from 'next/navigation'

type Episode = {
  episode_id: string
  adventure_id: string
  name: string
  slug: string | null
  description: string | null
  episode_number: number | null
  start_datetime: string | null
  end_datetime: string | null
  physical_location: string | null
  cover_image_url: string | null
  max_players: number | null
  location_gps_lat: number | null
  location_gps_lng: number | null
  join_mode: string
  is_active: boolean
  is_published: boolean
  custom_data: Record<string, unknown>
  created_at: string
  updated_at: string
}

type EpisodeFormData = {
  name: string
  slug: string
  description: string
  episode_number: string
  start_datetime: string
  end_datetime: string
  physical_location: string
  cover_image_url: string
  max_players: string
  location_gps_lat: string
  location_gps_lng: string
  join_mode: string
  is_active: boolean
  is_published: boolean
}

const EMPTY_FORM: EpisodeFormData = {
  name: '',
  slug: '',
  description: '',
  episode_number: '',
  start_datetime: '',
  end_datetime: '',
  physical_location: '',
  cover_image_url: '',
  max_players: '',
  location_gps_lat: '',
  location_gps_lng: '',
  join_mode: 'open',
  is_active: true,
  is_published: false,
}

function episodeToForm(ep: Episode): EpisodeFormData {
  return {
    name: ep.name,
    slug: ep.slug ?? '',
    description: ep.description ?? '',
    episode_number: ep.episode_number?.toString() ?? '',
    start_datetime: ep.start_datetime ? ep.start_datetime.slice(0, 16) : '',
    end_datetime: ep.end_datetime ? ep.end_datetime.slice(0, 16) : '',
    physical_location: ep.physical_location ?? '',
    cover_image_url: ep.cover_image_url ?? '',
    max_players: ep.max_players?.toString() ?? '',
    location_gps_lat: ep.location_gps_lat?.toString() ?? '',
    location_gps_lng: ep.location_gps_lng?.toString() ?? '',
    join_mode: ep.join_mode,
    is_active: ep.is_active,
    is_published: ep.is_published,
  }
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
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '0.3rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
  },
  field: {
    marginBottom: '1rem',
  } as React.CSSProperties,
}

export default function EpisodesClient({ initialEpisodes }: { initialEpisodes: Episode[] }) {
  const [episodes, setEpisodes] = useState<Episode[]>(initialEpisodes)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null)
  const [form, setForm] = useState<EpisodeFormData>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const router = useRouter()

  const supabase = createClient()

  function openCreate() {
    setEditingEpisode(null)
    setForm(EMPTY_FORM)
    setError(null)
    setModalOpen(true)
  }

  function openEdit(ep: Episode) {
    setEditingEpisode(ep)
    setForm(episodeToForm(ep))
    setError(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingEpisode(null)
    setError(null)
  }

  function setField<K extends keyof EpisodeFormData>(key: K, value: EpisodeFormData[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function buildPayload() {
    return {
      adventure_id: ADVENTURE_ID,
      name: form.name.trim(),
      slug: form.slug.trim() || null,
      description: form.description.trim() || null,
      episode_number: form.episode_number ? parseInt(form.episode_number) : null,
      start_datetime: form.start_datetime || null,
      end_datetime: form.end_datetime || null,
      physical_location: form.physical_location.trim() || null,
      cover_image_url: form.cover_image_url.trim() || null,
      max_players: form.max_players ? parseInt(form.max_players) : null,
      location_gps_lat: form.location_gps_lat ? parseFloat(form.location_gps_lat) : null,
      location_gps_lng: form.location_gps_lng ? parseFloat(form.location_gps_lng) : null,
      join_mode: form.join_mode,
      is_active: form.is_active,
      is_published: form.is_published,
    }
  }

  function handleSave() {
    if (!form.name.trim()) { setError('Il nome è obbligatorio.'); return }

    startTransition(async () => {
      setError(null)
      if (editingEpisode) {
        const { data, error: err } = await supabase
          .from('episodes')
          .update({ ...buildPayload(), updated_at: new Date().toISOString() })
          .eq('episode_id', editingEpisode.episode_id)
          .select()
          .single()
        if (err) { setError(err.message); return }
        setEpisodes(eps => eps.map(e => e.episode_id === data.episode_id ? data : e))
      } else {
        const { data, error: err } = await supabase
          .from('episodes')
          .insert(buildPayload())
          .select()
          .single()
        if (err) { setError(err.message); return }
        setEpisodes(eps => [...eps, data])
      }
      closeModal()
      router.refresh()
    })
  }

  function handleDelete(episodeId: string) {
    startTransition(async () => {
      const { error: err } = await supabase
        .from('episodes')
        .delete()
        .eq('episode_id', episodeId)
      if (err) { alert(err.message); return }
      setEpisodes(eps => eps.filter(e => e.episode_id !== episodeId))
      setDeleteConfirm(null)
      router.refresh()
    })
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.3rem', color: '#feeaa5', fontWeight: 400 }}>Episodi</h1>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.2rem' }}>{episodes.length} episodi</p>
        </div>
        <button style={s.btn('primary')} onClick={openCreate}>+ Nuovo episodio</button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['#', 'Nome', 'Data inizio', 'Luogo', 'Modalità join', 'Attivo', 'Pubblicato', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'rgba(255,255,255,0.35)', fontWeight: 400, fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {episodes.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.875rem' }}>
                  Nessun episodio. Creane uno.
                </td>
              </tr>
            )}
            {episodes.map(ep => (
              <tr key={ep.episode_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '0.65rem 0.75rem', color: 'rgba(255,255,255,0.3)' }}>{ep.episode_number ?? '—'}</td>
                <td style={{ padding: '0.65rem 0.75rem', color: '#e8e4dc', fontWeight: 500 }}>{ep.name}</td>
                <td style={{ padding: '0.65rem 0.75rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                  {ep.start_datetime ? new Date(ep.start_datetime).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                </td>
                <td style={{ padding: '0.65rem 0.75rem', color: 'rgba(255,255,255,0.5)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ep.physical_location ?? '—'}
                </td>
                <td style={{ padding: '0.65rem 0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                    {ep.join_mode}
                  </span>
                </td>
                <td style={{ padding: '0.65rem 0.75rem' }}>
                  <span style={{ color: ep.is_active ? '#64d278' : 'rgba(255,255,255,0.2)', fontSize: '0.8rem' }}>
                    {ep.is_active ? '●' : '○'}
                  </span>
                </td>
                <td style={{ padding: '0.65rem 0.75rem' }}>
                  <span style={{ color: ep.is_published ? '#feeaa5' : 'rgba(255,255,255,0.2)', fontSize: '0.8rem' }}>
                    {ep.is_published ? '●' : '○'}
                  </span>
                </td>
                <td style={{ padding: '0.65rem 0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button style={s.btn('ghost')} onClick={() => openEdit(ep)}>Modifica</button>

                    <a
                        href={`/admin/episodes/${ep.episode_id}`}
                        style={{
                            ...s.btn('ghost'),
                            display: 'inline-block',
                            textDecoration: 'none'
                        }}
                        >
                        Gestisci →
                        </a>

                    {deleteConfirm === ep.episode_id ? (
                      <>
                        <button style={s.btn('danger')} onClick={() => handleDelete(ep.episode_id)} disabled={isPending}>Conferma</button>
                        <button style={s.btn('ghost')} onClick={() => setDeleteConfirm(null)}>Annulla</button>
                      </>
                    ) : (
                      <button style={s.btn('danger')} onClick={() => setDeleteConfirm(ep.episode_id)}>Elimina</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.1rem', color: '#feeaa5', fontWeight: 400 }}>
                {editingEpisode ? 'Modifica episodio' : 'Nuovo episodio'}
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Row helpers */}
            {([
              [
                { key: 'name', label: 'Nome *', type: 'text', placeholder: 'Ca\' Marcello — Episodio I' },
                { key: 'episode_number', label: 'Numero episodio', type: 'number', placeholder: '1' },
              ],
              [
                { key: 'slug', label: 'Slug', type: 'text', placeholder: 'episodio-1' },
                { key: 'join_mode', label: 'Modalità join', type: 'select', options: ['open', 'invite', 'code'] },
              ],
              [
                { key: 'start_datetime', label: 'Inizio', type: 'datetime-local' },
                { key: 'end_datetime', label: 'Fine', type: 'datetime-local' },
              ],
              [
                { key: 'physical_location', label: 'Luogo fisico', type: 'text', placeholder: 'Villa Ca\' Marcello, Noale' },
                { key: 'max_players', label: 'Max giocatori', type: 'number', placeholder: '50' },
              ],
              [
                { key: 'location_gps_lat', label: 'GPS Latitudine', type: 'number', placeholder: '45.5491' },
                { key: 'location_gps_lng', label: 'GPS Longitudine', type: 'number', placeholder: '12.0714' },
              ],
            ] as const).map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {row.map((field) => (
                  <div key={field.key} style={s.field}>
                    <label style={s.label}>{field.label}</label>
                    {field.type === 'select' ? (
                      <select
                        value={form[field.key as keyof EpisodeFormData] as string}
                        onChange={e => setField(field.key as keyof EpisodeFormData, e.target.value as never)}
                        style={{ ...s.input }}
                      >
                        {field.options?.map(o => <option key={o} value={o} style={{ background: '#111' }}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={form[field.key as keyof EpisodeFormData] as string}
                        onChange={e => setField(field.key as keyof EpisodeFormData, e.target.value as never)}
                        placeholder={'placeholder' in field ? field.placeholder : undefined}
                        step={field.type === 'number' ? 'any' : undefined}
                        style={s.input}
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}

            {/* Description full width */}
            <div style={s.field}>
              <label style={s.label}>Descrizione</label>
              <textarea
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                rows={3}
                style={{ ...s.input, resize: 'vertical' }}
                placeholder="Descrizione dell'episodio..."
              />
            </div>

            <div style={s.field}>
              <label style={s.label}>Cover image URL</label>
              <input
                type="text"
                value={form.cover_image_url}
                onChange={e => setField('cover_image_url', e.target.value)}
                style={s.input}
                placeholder="https://..."
              />
            </div>

            {/* Toggles */}
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem' }}>
              {([
                { key: 'is_active', label: 'Attivo' },
                { key: 'is_published', label: 'Pubblicato' },
              ] as const).map(({ key, label }) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={e => setField(key, e.target.checked)}
                    style={{ accentColor: '#e8af48', width: '14px', height: '14px' }}
                  />
                  {label}
                </label>
              ))}
            </div>

            {error && (
              <div style={{ marginBottom: '1rem', padding: '0.6rem 0.9rem', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: '6px', color: '#ff8080', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button style={s.btn('ghost')} onClick={closeModal}>Annulla</button>
              <button style={s.btn('primary')} onClick={handleSave} disabled={isPending}>
                {isPending ? 'Salvataggio...' : editingEpisode ? 'Aggiorna' : 'Crea'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}