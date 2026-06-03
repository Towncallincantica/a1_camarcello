import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ADVENTURE_ID } from '@/lib/constants'
import { TeamChat } from './TeamChat'
import { CreateTeamForm, JoinTeamList, LeaveTeamButton } from './TeamActions'

export default async function TeamPage({
  params,
}: {
  params: Promise<{ episodeId: string }>
}) {
  const { episodeId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: player } = await supabase
    .from('player')
    .select('player_id, display_name')
    .eq('user_id', user.id)
    .eq('adventure_id', ADVENTURE_ID)
    .single()
  if (!player) redirect('/play')

  // Verifica join episodio
  const { data: stats } = await supabase
    .from('player_episode_stats')
    .select('team_id')
    .eq('player_id', player.player_id)
    .eq('episode_id', episodeId)
    .single()

  if (!stats) redirect(`/play/${episodeId}`)

  const teamId = stats.team_id

  // Se ha un team, carica dati team + messaggi
  const [teamData, messages, members] = await Promise.all([
    teamId
      ? supabase.from('teams').select('team_id, name').eq('team_id', teamId).single()
      : Promise.resolve({ data: null }),

    teamId
      ? supabase
          .from('team_messages')
          .select('message_id, content, created_at, player_id, player:player_id ( display_name )')
          .eq('team_id', teamId)
          .order('created_at', { ascending: true })
          .limit(100)
      : Promise.resolve({ data: [] }),

    teamId
      ? supabase
          .from('team_members')
          .select('player_id, player:player_id ( display_name )')
          .eq('team_id', teamId)
      : Promise.resolve({ data: [] }),
  ])

  // Team disponibili nell'episodio (per join)
  const { data: availableTeams } = !teamId
    ? await supabase
        .from('teams')
        .select('team_id, name')
        .eq('episode_id', episodeId)
    : { data: [] }

  return (
    <main style={{
      height: '100vh',
      background: '#090807',
      color: '#e8e4dc',
      fontFamily: 'Georgia, serif',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        background: '#090807',
        zIndex: 10,
      }}>
        <a
          href={`/play/${episodeId}`}
          style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', textDecoration: 'none' }}
        >
          ← Storia
        </a>
        <span style={{ color: '#feeaa5', fontSize: '0.85rem', letterSpacing: '0.06em', flex: 1 }}>
          {teamData.data ? teamData.data.name : 'Team'}
        </span>
        {teamId && <LeaveTeamButton episodeId={episodeId} />}
      </div>

      {/* Nessun team — crea o unisciti */}
      {!teamId && (
        <div style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Crea team */}
          <section>
            <h2 style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
              Crea team
            </h2>
            <CreateTeamForm episodeId={episodeId} />
          </section>

          {/* Unisciti a team esistente */}
          {availableTeams && availableTeams.length > 0 && (
            <section>
              <h2 style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
                Unisciti a un team
              </h2>
              <JoinTeamList episodeId={episodeId} teams={availableTeams} />
            </section>
          )}
        </div>
      )}

      {/* Ha un team — mostra membri + chat */}
      {teamId && teamData.data && (
        <>
          {/* Membri */}
          <div style={{
            padding: '0.75rem 1.5rem',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
            flexShrink: 0,
          }}>
            {(members.data ?? []).map((m) => {
              const memberPlayer = m.player as unknown as { display_name: string }
              const isSelf = m.player_id === player.player_id
              return (
                <span key={m.player_id} style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  border: `1px solid ${isSelf ? 'rgba(254,234,165,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  color: isSelf ? '#feeaa5' : 'rgba(255,255,255,0.5)',
                }}>
                  {memberPlayer?.display_name ?? '?'}
                </span>
              )
            })}
          </div>

          {/* Chat */}
          <TeamChat
            teamId={teamId}
            episodeId={episodeId}
            playerId={player.player_id}
            displayName={player.display_name}
            initialMessages={(messages.data ?? []) as unknown as {
              message_id: string
              content: string
              created_at: string
              player_id: string
              player: { display_name: string } | null
            }[]}
          />
        </>
      )}
    </main>
  )
}