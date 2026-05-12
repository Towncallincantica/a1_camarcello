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

  const [{ data: episode }, { data: player }] = await Promise.all([
    supabase
      .from('episodes')
      .select('episode_id, name, physical_location, start_datetime, join_mode')
      .eq('episode_id', episodeId)
      .eq('adventure_id', ADVENTURE_ID)
      .eq('is_active', true)
      .single(),
    supabase
      .from('player')
      .select('player_id, display_name, level, experience_points')
      .eq('user_id', user.id)
      .eq('adventure_id', ADVENTURE_ID)
      .single(),
  ])

  if (!episode) redirect('/play')
  if (!player) redirect('/play')

  const [{ data: stats }, { data: nodes }, { data: progress }] = await Promise.all([
    supabase
      .from('player_episode_stats')
      .select('player_id')
      .eq('player_id', player.player_id)
      .eq('episode_id', episodeId)
      .single(),
    supabase
      .from('content_nodes')
      .select(`
        node_id, name, node_category, content_html,
        targets ( target_id, type, payload ),
        conditions ( condition_id, type, payload )
      `)
      .eq('episode_id', episodeId)
      .order('created_at', { ascending: true }),
    supabase
      .from('player_target_progress')
      .select('target_id, completed')
      .eq('player_id', player.player_id)
      .eq('episode_id', episodeId),
  ])

  const completedTargets = new Set(
    (progress ?? []).filter(p => p.completed).map(p => p.target_id)
  )

  return (
    <main style={{
      minHeight: '100vh',
      background: '#090807',
      color: '#e8e4dc',
      fontFamily: "'EB Garamond', Georgia, serif",
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
          <a href="/play" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', textDecoration: 'none', fontFamily: "'Cinzel', Georgia, serif", letterSpacing: '0.06em' }}>
            ← Episodi
          </a>
          <h1 style={{ color: '#feeaa5', fontSize: '1.1rem', margin: '0.25rem 0 0', letterSpacing: '0.06em', fontFamily: "'Cinzel', Georgia, serif" }}>
            {episode.name}
          </h1>
          {episode.physical_location && (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>
              {episode.physical_location}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontFamily: "'Cinzel', Georgia, serif", letterSpacing: '0.04em' }}>
            <div style={{ color: 'rgba(254,234,165,0.7)' }}>{player.display_name}</div>
            <div>Lv {player.level} · {player.experience_points} XP</div>
          </div>
          <a
            href={`/play/${episodeId}/team`}
            style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontFamily: "'Cinzel', Georgia, serif", letterSpacing: '0.06em', textDecoration: 'none', padding: '0.25rem 0.65rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '999px', whiteSpace: 'nowrap' }}
          >
            👥 Team
          </a>
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
                      fontSize: '0.85rem',
                      letterSpacing: '0.1em',
                      margin: 0,
                      textTransform: 'uppercase',
                      fontFamily: "'Cinzel', Georgia, serif",
                    }}>
                      {node.name}
                    </h2>
                    <span style={{
                      fontSize: '0.65rem',
                      color: 'rgba(255,255,255,0.25)',
                      letterSpacing: '0.05em',
                      fontFamily: "'Cinzel', Georgia, serif",
                    }}>
                      {node.node_category}
                    </span>
                  </div>

                  {node.content_html && (
                    <div
                      style={{ marginTop: '0.75rem', fontSize: '1rem', lineHeight: '1.7', color: '#e8e4dc' }}
                      dangerouslySetInnerHTML={{ __html: node.content_html }}
                    />
                  )}

                  {nodeTargets.length > 0 && (
                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {nodeTargets.map((target) => {
                        const completed = completedTargets.has(target.target_id)
                        const payload = target.payload as Record<string, unknown> ?? {}

                        return (
                          <div key={target.target_id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                            padding: '0.5rem 0.75rem',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ color: completed ? '#64d278' : 'rgba(255,255,255,0.25)', fontSize: '0.9rem' }}>
                                {completed ? '✓' : '○'}
                              </span>
                              <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', fontFamily: "'Cinzel', Georgia, serif", letterSpacing: '0.04em' }}>
                                {TARGET_LABELS[target.type as keyof typeof TARGET_LABELS] ?? target.type}
                              </span>
                            </div>

                            {/* Azione per target non completati */}
                            {!completed && (
                              <>
                                {(target.type === 'code_entry' || target.type === 'qr_scan') && (
                                  <a
                                    href={`/play/${episodeId}/code?targetId=${target.target_id}&nodeId=${node.node_id}`}
                                    style={{
                                      fontSize: '0.75rem',
                                      color: '#e8af48',
                                      fontFamily: "'Cinzel', Georgia, serif",
                                      letterSpacing: '0.04em',
                                      textDecoration: 'none',
                                      padding: '0.3rem 0.75rem',
                                      border: '1px solid rgba(232,175,72,0.3)',
                                      borderRadius: '2px',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {target.type === 'qr_scan' ? 'Scansiona QR' : 'Inserisci codice'}
                                  </a>
                                )}
                                {target.type === 'gps_location' && (
                                  <a
                                    href={`/play/${episodeId}/map`}
                                    style={{
                                      fontSize: '0.75rem',
                                      color: '#a5feb8',
                                      fontFamily: "'Cinzel', Georgia, serif",
                                      letterSpacing: '0.04em',
                                      textDecoration: 'none',
                                      padding: '0.3rem 0.75rem',
                                      border: '1px solid rgba(165,254,184,0.3)',
                                      borderRadius: '2px',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    Vai alla mappa
                                  </a>
                                )}
                                {target.type === 'claim_item' && (
                                  <a
                                    href={`/play/${episodeId}/claim?targetId=${target.target_id}&nodeId=${node.node_id}`}
                                    style={{
                                      fontSize: '0.75rem',
                                      color: '#feeaa5',
                                      fontFamily: "'Cinzel', Georgia, serif",
                                      letterSpacing: '0.04em',
                                      textDecoration: 'none',
                                      padding: '0.3rem 0.75rem',
                                      border: '1px solid rgba(254,234,165,0.3)',
                                      borderRadius: '2px',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    Raccogli
                                  </a>
                                )}
                              </>
                            )}
                          </div>
                        )
                      })}
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

const TARGET_LABELS = {
  code_entry: 'Codice',
  qr_scan: 'QR Code',
  gps_location: 'Posizione GPS',
  claim_item: 'Raccogli oggetto',
} as const

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
      border: '1px solid rgba(254,234,165,0.15)',
      textAlign: 'center',
    }}>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem', fontFamily: "'EB Garamond', Georgia, serif", fontSize: '1rem' }}>
        Vuoi partecipare a questo episodio?
      </p>
      <form action={joinEpisode}>
        <button type="submit" style={{
          background: 'rgba(254,234,165,0.08)',
          border: '1px solid rgba(254,234,165,0.4)',
          color: '#feeaa5',
          padding: '0.75rem 2rem',
          fontSize: '0.85rem',
          cursor: 'pointer',
          fontFamily: "'Cinzel', Georgia, serif",
          letterSpacing: '0.08em',
        }}>
          Entra nell&apos;episodio
        </button>
      </form>
    </div>
  )
}