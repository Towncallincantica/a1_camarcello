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
    const { data, error } = await supabase
      .rpc('get_episode_player_locations', { p_episode_id: episodeId })

    if (error) { console.error('[MapWrapper] RPC error:', error); return }
    if (!data || (data as unknown[]).length === 0) return

    setLocations(data as PlayerLocation[])
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