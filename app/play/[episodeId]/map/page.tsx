import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { ADVENTURE_ID } from '@/lib/constants'
import { MapView } from '@/components/MapView'

export default async function MapPage({
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

  // Recupera tutti i player dell'episodio con la loro posizione
  // Usiamo service role per leggere posizioni di tutti i player
  const service = createServiceRoleClient()

  const { data: episodeStats } = await service
    .from('player_episode_stats')
    .select('player_id')
    .eq('episode_id', episodeId)

  const playerIds = (episodeStats ?? []).map((s) => s.player_id)

  // Recupera display_name + user_id per ogni player dell'episodio
  const { data: players } = playerIds.length > 0
    ? await service
        .from('player')
        .select('player_id, display_name, user_id')
        .in('player_id', playerIds)
    : { data: [] }

  // Recupera posizioni GPS via RPC (PostGIS → lat/lng)
  const { data: locations } = playerIds.length > 0
    ? await service.rpc('get_player_locations', { p_player_ids: playerIds })
    : { data: [] }

  // Mappa user_id → display_name
  const playerMap = new Map(
    (players ?? []).map((p) => [p.user_id, p.display_name])
  )

  type LocationRow = { user_id: string; lat: number; lng: number }

  const initialLocations = (locations as LocationRow[] ?? [])
    .filter((l) => l.lat != null && l.lng != null)
    .map((l) => ({
      user_id: l.user_id,
      display_name: playerMap.get(l.user_id) ?? '?',
      lat: l.lat,
      lng: l.lng,
    }))

  return (
    <main style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: '#090807',
    }}>
      {/* Header */}
      <div style={{
        padding: '0.75rem 1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        flexShrink: 0,
      }}>
        <a
          href={`/play/${episodeId}`}
          style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', textDecoration: 'none' }}
        >
          ← Storia
        </a>
        <span style={{ color: '#feeaa5', fontSize: '0.85rem', letterSpacing: '0.06em' }}>
          Mappa
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
          {initialLocations.length} player visibili
        </span>
      </div>

      {/* Map — occupa tutto lo spazio restante */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <MapView
          initialLocations={initialLocations}
          currentUserId={user.id}
          episodeId={episodeId}
        />
      </div>
    </main>
  )
}