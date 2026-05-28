import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ADVENTURE_ID } from '@/lib/constants'
import { revalidatePath } from 'next/cache'

async function sendAnnouncement(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const episodeId = formData.get('episode_id') as string
  const content = (formData.get('content') as string).trim()
  if (!content || !episodeId) return

  const { data: player } = await supabase
    .from('player')
    .select('player_id')
    .eq('user_id', user.id)
    .eq('adventure_id', ADVENTURE_ID)
    .single()

  await supabase.from('episode_announcements').insert({
    episode_id: episodeId,
    content,
    sent_by_player_id: player?.player_id ?? null,
  })

  revalidatePath('/admin/broadcast')
}

export default async function BroadcastPage() {
  const supabase = await createClient()

  const { data: episodes } = await supabase
    .from('episodes')
    .select('episode_id, name')
    .eq('adventure_id', ADVENTURE_ID)
    .eq('is_active', true)
    .order('start_datetime', { ascending: false })

  const { data: recent } = await supabase
    .from('episode_announcements')
    .select('announcement_id, content, created_at, episode_id, episodes(name)')
    .order('created_at', { ascending: false })
    .limit(20)

  const C = {
    border: '1px solid rgba(255,255,255,0.08)',
    muted: 'rgba(255,255,255,0.4)',
    gold: '#feeaa5',
  }

  return (
    <div>
      <h1 style={{ color: C.gold, fontSize: '1.3rem', letterSpacing: '0.08em', marginBottom: '2rem' }}>
        BROADCAST
      </h1>

      {/* Form */}
      <form action={sendAnnouncement} style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 560 }}>
          <div>
            <label style={{ display: 'block', color: C.muted, fontSize: '0.72rem', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
              EPISODIO
            </label>
            <select
              name="episode_id"
              required
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.03)',
                border: C.border,
                color: '#e8e4dc',
                padding: '0.75rem 1rem',
                fontFamily: 'Georgia, serif',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            >
              <option value="">Seleziona episodio…</option>
              {(episodes ?? []).map(ep => (
                <option key={ep.episode_id} value={ep.episode_id}>{ep.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', color: C.muted, fontSize: '0.72rem', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
              MESSAGGIO
            </label>
            <textarea
              name="content"
              required
              rows={4}
              placeholder="Scrivi il messaggio da inviare a tutti i giocatori dell'episodio…"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.03)',
                border: C.border,
                color: '#e8e4dc',
                padding: '0.75rem 1rem',
                fontFamily: 'Georgia, serif',
                fontSize: '0.9rem',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              alignSelf: 'flex-start',
              background: 'rgba(254,234,165,0.08)',
              border: '1px solid rgba(254,234,165,0.3)',
              color: C.gold,
              padding: '0.75rem 1.5rem',
              fontFamily: 'Georgia, serif',
              fontSize: '0.85rem',
              cursor: 'pointer',
              letterSpacing: '0.05em',
            }}
          >
            Invia annuncio →
          </button>
        </div>
      </form>

      {/* Annunci recenti */}
      <div>
        <h2 style={{ color: C.muted, fontSize: '0.72rem', letterSpacing: '0.1em', marginBottom: '1rem' }}>
          ANNUNCI RECENTI
        </h2>
        {(recent ?? []).length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>Nessun annuncio inviato.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 560 }}>
            {(recent ?? []).map(a => {
              const ep = a.episodes as unknown as { name: string } | null
              return (
                <div key={a.announcement_id} style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: C.border,
                  padding: '0.875rem 1rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ color: C.gold, fontSize: '0.7rem', letterSpacing: '0.06em' }}>
                      {ep?.name ?? '—'}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem' }}>
                      {new Date(a.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ color: '#e8e4dc', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>{a.content}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}