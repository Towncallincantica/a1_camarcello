import { createServiceRoleClient } from '@/lib/supabase/service'
import { ADVENTURE_ID } from '@/lib/constants'

export default async function PlayersPage() {
  const supabase = createServiceRoleClient()

  const { data: players } = await supabase
    .from('player')
    .select(`
      player_id,
      display_name,
      level,
      experience_points,
      created_at,
      users ( email ),
      player_episode_stats (
        episode_id,
        episodes ( name )
      )
    `)
    .eq('adventure_id', ADVENTURE_ID)
    .order('created_at', { ascending: false })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ color: '#feeaa5', fontSize: '1.3rem', letterSpacing: '0.08em', margin: 0 }}>
          GIOCATORI
        </h1>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
          {players?.length ?? 0} registrati
        </span>
      </div>

      {/* List */}
      {players && players.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {players.map((p) => {
            const episodes = p.player_episode_stats ?? []
            const email = (p.users as unknown as { email: string } | null)?.email
            const joinDate = new Date(p.created_at).toLocaleDateString('it-IT', {
              day: '2-digit', month: 'short', year: 'numeric',
            })

            return (
              <div key={p.player_id} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                padding: '1rem 1.25rem',
              }}>
                {/* Row 1: name + level + xp + date */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ color: '#e8e4dc', fontWeight: 500, fontSize: '0.95rem' }}>
                      {p.display_name}
                    </span>
                    <span style={{
                      background: 'rgba(254,234,165,0.1)',
                      color: '#feeaa5',
                      fontSize: '0.7rem',
                      letterSpacing: '0.06em',
                      padding: '0.15rem 0.55rem',
                      borderRadius: '999px',
                      border: '1px solid rgba(254,234,165,0.2)',
                    }}>
                      LV {p.level}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem' }}>
                      {p.experience_points} xp
                    </span>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', flexShrink: 0 }}>
                    {joinDate}
                  </span>
                </div>

                {/* Row 2: email */}
                {email && (
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', marginBottom: episodes.length > 0 ? '0.6rem' : 0 }}>
                    {email}
                  </div>
                )}

                {/* Row 3: episodes */}
                {episodes.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                    {episodes.map((stat) => (
                      <span key={stat.episode_id} style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.45)',
                        fontSize: '0.72rem',
                        padding: '0.15rem 0.6rem',
                        borderRadius: '2px',
                      }}>
                        {(stat.episodes as unknown as { name: string } | null)?.name ?? '—'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '3rem',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.3)',
          fontSize: '0.9rem',
        }}>
          Nessun giocatore registrato.
        </div>
      )}
    </div>
  )
}