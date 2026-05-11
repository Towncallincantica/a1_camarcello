import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ADVENTURE_ID } from '@/lib/constants'

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ episodeId: string }>
}) {
  const { episodeId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verifica che l'episodio appartenga a questo adventure
  const { data: episode } = await supabase
    .from('episodes')
    .select('episode_id, name, physical_location, start_datetime, join_mode')
    .eq('episode_id', episodeId)
    .eq('adventure_id', ADVENTURE_ID)
    .eq('is_active', true)
    .single()

  if (!episode) redirect('/play')

  // Verifica che il player esista
  const { data: player } = await supabase
    .from('player')
    .select('player_id, display_name, level, experience_points')
    .eq('user_id', user.id)
    .eq('adventure_id', ADVENTURE_ID)
    .single()

  if (!player) redirect('/play')

  // Verifica join episodio
  const { data: stats } = await supabase
    .from('player_episode_stats')
    .select('player_id')
    .eq('player_id', player.player_id)
    .eq('episode_id', episodeId)
    .single()

  // Content nodes dell'episodio
  const { data: nodes } = await supabase
    .from('content_nodes')
    .select(`
      node_id, name, node_category, content_html,
      targets ( target_id, type, payload ),
      conditions ( condition_id, type, payload )
    `)
    .eq('episode_id', episodeId)
    .order('created_at', { ascending: true })

  // Progresso player sui target
  const { data: progress } = await supabase
    .from('player_target_progress')
    .select('target_id, completed')
    .eq('player_id', player.player_id)
    .eq('episode_id', episodeId)

  const completedTargets = new Set(
    (progress ?? []).filter(p => p.completed).map(p => p.target_id)
  )

  return (
    <main style={{
      minHeight: '100vh',
      background: '#090807',
      color: '#e8e4dc',
      fontFamily: 'Georgia, serif',
      paddingBottom: '4rem',
    }}>
      {/* Header episodio */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <a href="/play" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', textDecoration: 'none' }}>
            ← Episodi
          </a>
          <h1 style={{ color: '#feeaa5', fontSize: '1.1rem', margin: '0.25rem 0 0', letterSpacing: '0.05em' }}>
            {episode.name}
          </h1>
          {episode.physical_location && (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>
              {episode.physical_location}
            </p>
          )}
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
          <div>{player.display_name}</div>
          <div>Lv {player.level} · {player.experience_points} XP</div>
        </div>
      </div>

      {/* Join episodio */}
      {!stats && (
        <JoinEpisodeSection episodeId={episodeId} playerId={player.player_id} />
      )}

      {/* Content nodes */}
      {stats && (
        <div style={{ padding: '1.5rem' }}>
          {!nodes || nodes.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.4)' }}>Nessun contenuto disponibile.</p>
          ) : (
            nodes.map((node) => {
              const nodeTargets = node.targets ?? []
              const allCompleted = nodeTargets.length > 0 &&
                nodeTargets.every(t => completedTargets.has(t.target_id))

              return (
                <div key={node.node_id} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${allCompleted ? 'rgba(100,210,120,0.3)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: '2px',
                  padding: '1.25rem',
                  marginBottom: '1rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h2 style={{
                      color: allCompleted ? '#64d278' : '#feeaa5',
                      fontSize: '0.95rem',
                      letterSpacing: '0.08em',
                      margin: 0,
                      textTransform: 'uppercase',
                    }}>
                      {node.name}
                    </h2>
                    <span style={{
                      fontSize: '0.7rem',
                      color: 'rgba(255,255,255,0.3)',
                      letterSpacing: '0.05em',
                    }}>
                      {node.node_category}
                    </span>
                  </div>

                  {node.content_html && (
                    <div
                      style={{ marginTop: '0.75rem', fontSize: '0.9rem', lineHeight: '1.6', color: '#e8e4dc' }}
                      dangerouslySetInnerHTML={{ __html: node.content_html }}
                    />
                  )}

                  {nodeTargets.length > 0 && (
                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {nodeTargets.map((target) => (
                        <div key={target.target_id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.5rem 0.75rem',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.05)',
                        }}>
                          <span style={{ color: completedTargets.has(target.target_id) ? '#64d278' : 'rgba(255,255,255,0.3)', fontSize: '1rem' }}>
                            {completedTargets.has(target.target_id) ? '✓' : '○'}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                            {target.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </main>
  )
}

async function JoinEpisodeSection({
  episodeId,
  playerId,
}: {
  episodeId: string
  playerId: string
}) {
  async function joinEpisode() {
    'use server'
    const supabase = await createClient()
    await supabase.from('player_episode_stats').insert({
      player_id: playerId,
      episode_id: episodeId,
    })
    const { redirect } = await import('next/navigation')
    redirect(`/play/${episodeId}`)
  }

  return (
    <div style={{
      margin: '3rem 1.5rem',
      padding: '2rem',
      border: '1px solid rgba(254,234,165,0.2)',
      textAlign: 'center',
    }}>
      <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem' }}>
        Vuoi partecipare a questo episodio?
      </p>
      <form action={joinEpisode}>
        <button type="submit" style={{
          background: 'rgba(254,234,165,0.1)',
          border: '1px solid #feeaa5',
          color: '#feeaa5',
          padding: '0.75rem 2rem',
          fontSize: '1rem',
          cursor: 'pointer',
          fontFamily: 'Georgia, serif',
          letterSpacing: '0.05em',
        }}>
          Entra nell&apos;episodio
        </button>
      </form>
    </div>
  )
}