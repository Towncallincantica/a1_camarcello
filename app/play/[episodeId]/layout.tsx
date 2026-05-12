import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ADVENTURE_ID } from '@/lib/constants'
import { PlayerNavBar } from '@/components/PlayerNavBar'
import { PlayerSubBar } from '@/components/PlayerSubBar'
import GPSUploader from '@/components/GPSUploader'
import { ExchangeRedirectListener } from '@/components/ExchangeRedirectListener'

export default async function EpisodeLayout({
  children,
  params,
}: {
  children: React.ReactNode
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

  // Team name + feature items in parallelo
  const [{ data: stats }, { data: unlockedItems }] = await Promise.all([
    supabase
      .from('player_episode_stats')
      .select('team_id')
      .eq('player_id', player.player_id)
      .eq('episode_id', episodeId)
      .single(),
    supabase
      .from('player_episode_inventory')
      .select('items ( custom_data )')
      .eq('player_id', player.player_id)
      .eq('episode_id', episodeId)
      .gt('quantity', 0),
  ])

  let teamName: string | null = null
  if (stats?.team_id) {
    const { data: team } = await supabase
      .from('teams')
      .select('name')
      .eq('team_id', stats.team_id)
      .single()
    teamName = team?.name ?? null
  }

  // Ricava le feature sbloccate dall'inventario
  const unlockedFeatures = new Set<string>()
  for (const row of unlockedItems ?? []) {
    const item = row.items as { custom_data?: Record<string, unknown> } | null
    const feature = item?.custom_data?.unlocks_feature
    if (typeof feature === 'string') unlockedFeatures.add(feature)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#090807',
      color: '#e8e4dc',
      fontFamily: 'Georgia, serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <GPSUploader />

      <ExchangeRedirectListener
        playerId={player.player_id}
        episodeId={episodeId}
      />

      <PlayerSubBar
        playerId={player.player_id}
        episodeId={episodeId}
        teamName={teamName}
      />

      <div style={{ flex: 1, paddingBottom: '5rem' }}>
        {children}
      </div>

      <PlayerNavBar
        episodeId={episodeId}
        playerId={player.player_id}
        hasMap={unlockedFeatures.has('map')}
        hasInventory={unlockedFeatures.has('inventory')}
      />
    </div>
  )
}