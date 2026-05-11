import { createClient } from '@/lib/supabase/server'
import { ADVENTURE_ID } from '@/lib/constants'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { count: playerCount },
    { count: episodeCount },
    { count: nodeCount },
    { count: itemCount },
  ] = await Promise.all([
    supabase.from('player').select('*', { count: 'exact', head: true }).eq('adventure_id', ADVENTURE_ID),
    supabase.from('episodes').select('*', { count: 'exact', head: true }).eq('adventure_id', ADVENTURE_ID),
    supabase.from('content_nodes').select('*', { count: 'exact', head: true }),
    supabase.from('items').select('*', { count: 'exact', head: true }).eq('adventure_id', ADVENTURE_ID),
  ])

  const stats = [
    { label: 'Giocatori', value: playerCount ?? 0 },
    { label: 'Episodi', value: episodeCount ?? 0 },
    { label: 'Nodi', value: nodeCount ?? 0 },
    { label: 'Oggetti', value: itemCount ?? 0 },
  ]

  return (
    <div>
      <h1 style={{ color: '#feeaa5', fontSize: '1.3rem', letterSpacing: '0.08em', marginBottom: '2rem' }}>
        DASHBOARD
      </h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map(({ label, value }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '1.25rem',
          }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>
              {label.toUpperCase()}
            </div>
            <div style={{ color: '#feeaa5', fontSize: '2rem', marginTop: '0.5rem' }}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}