import { createServiceRoleClient } from '@/lib/supabase/service'
import { ADVENTURE_ID } from '@/lib/constants'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminDashboard() {
  const supabase = createServiceRoleClient()

  const [
    playerRes,
    episodeRes,
    itemRes,
    recipeRes,
  ] = await Promise.all([
    supabase.from('player').select('*', { count: 'exact', head: true }).eq('adventure_id', ADVENTURE_ID),
    supabase.from('episodes').select('*', { count: 'exact', head: true }).eq('adventure_id', ADVENTURE_ID),
    supabase.from('items').select('*', { count: 'exact', head: true }).eq('adventure_id', ADVENTURE_ID),
    supabase.from('combination_recipes').select('*', { count: 'exact', head: true }).eq('adventure_id', ADVENTURE_ID),
  ])

  const stats = [
    { label: 'Giocatori',    value: playerRes.count  ?? 0, icon: '◐' },
    { label: 'Episodi',      value: episodeRes.count ?? 0, icon: '◉' },
    { label: 'Oggetti',      value: itemRes.count    ?? 0, icon: '◆' },
    { label: 'Combinazioni', value: recipeRes.count  ?? 0, icon: '⬡' },
  ]

  return (
    <div>
      <h1 style={{
        color: '#feeaa5',
        fontSize: '1.3rem',
        letterSpacing: '0.08em',
        marginBottom: '2rem',
      }}>
        DASHBOARD
      </h1>

      <div className="stats-grid">
        {stats.map(({ label, value, icon }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'rgba(254,234,165,0.4)', fontSize: '0.7rem' }}>{icon}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>
                {label.toUpperCase()}
              </span>
            </div>
            <div style={{ color: '#feeaa5', fontSize: '2rem', lineHeight: 1 }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }
        @media (max-width: 767px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  )
}