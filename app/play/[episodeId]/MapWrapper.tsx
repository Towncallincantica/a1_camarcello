'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MapView } from '@/components/MapView'

interface Props {
  episodeId: string
  currentUserId: string
}

interface PlayerLocation {
  user_id: string
  display_name: string
  lat: number
  lng: number
}

export default function MapWrapper({ episodeId, currentUserId }: Props) {
  const [locations, setLocations] = useState<PlayerLocation[]>([])
  const supabase = useMemo(() => createClient(), [])

  const loadLocations = useCallback(async () => {
    // 1. Tutti i player dell'episodio con user_id e display_name
    const { data: players } = await supabase
      .from('player_episode_stats')
      .select('player:player_id ( user_id, display_name )')
      .eq('episode_id', episodeId)

      console.log('[MapWrapper] players:', players)

    if (!players || players.length === 0) return

    const userDisplayMap = new Map<string, string>()
    const userIds: string[] = []

    for (const row of players) {
      const p = Array.isArray(row.player) ? row.player[0] : row.player
      if (p?.user_id) {
        userDisplayMap.set(p.user_id, (p as { display_name?: string }).display_name ?? '?')
        userIds.push(p.user_id)
      }
    }

    if (userIds.length === 0) return

    // 2. RPC get_player_locations riceve user_id[], non player_id[]
    const { data: rpcData, error } = await supabase
      .rpc('get_player_locations', { p_player_ids: userIds })

console.log('[MapWrapper] userIds:', userIds)
console.log('[MapWrapper] rpcData:', rpcData, 'error:', error)

    if (error) console.error('[MapWrapper] RPC error:', error)
    if (!rpcData || (rpcData as unknown[]).length === 0) return

    const enriched: PlayerLocation[] = (
      rpcData as { user_id: string; lat: number; lng: number }[]
    ).map(loc => ({
      user_id: loc.user_id,
      display_name: userDisplayMap.get(loc.user_id) ?? '?',
      lat: loc.lat,
      lng: loc.lng,
    }))

    setLocations(enriched)
  }, [episodeId, supabase])

  useEffect(() => { loadLocations() }, [loadLocations])

  useEffect(() => {
    const onGpsOk = () => loadLocations()
    window.addEventListener('gps:ok', onGpsOk)
    return () => window.removeEventListener('gps:ok', onGpsOk)
  }, [loadLocations])

  useEffect(() => {
    const channel = supabase
      .channel(`map-locations:${episodeId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'player_current_location',
      }, () => loadLocations())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [episodeId, supabase, loadLocations])

  return (
    <MapView
      initialLocations={locations}
      currentUserId={currentUserId}
      episodeId={episodeId}
    />
  )
}