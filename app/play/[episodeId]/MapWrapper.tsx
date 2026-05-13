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
    // 1. Player dell'episodio con user_id e display_name
    const { data: players } = await supabase
      .from('player_episode_stats')
      .select('player_id, player:player_id ( user_id, display_name )')
      .eq('episode_id', episodeId)

    if (!players || players.length === 0) return

    // Costruisce mappa user_id → display_name
    const userDisplayMap = new Map<string, string>()
    for (const row of players) {
      const p = Array.isArray(row.player) ? row.player[0] : row.player
      if (p?.user_id) {
        userDisplayMap.set(
          p.user_id,
          (p as { display_name?: string }).display_name ?? '?'
        )
      }
    }

    const userIds = Array.from(userDisplayMap.keys())
    if (userIds.length === 0) return

    // 2. Legge posizioni via RPC get_player_locations (con s)
    //    che accetta p_player_ids (array di player_id UUID)
    //    oppure fallback: query diretta con ST_X/ST_Y
    const playerIds = players.map(r => r.player_id)

    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_player_locations', { p_player_ids: playerIds })

    if (!rpcError && rpcData && (rpcData as unknown[]).length > 0) {
      // RPC funziona — usa i dati
      const enriched: PlayerLocation[] = (
        rpcData as { user_id: string; lat: number; lng: number }[]
      ).map(loc => ({
        user_id: loc.user_id,
        display_name: userDisplayMap.get(loc.user_id) ?? '?',
        lat: loc.lat,
        lng: loc.lng,
      }))
      setLocations(enriched)
      return
    }

    // 3. Fallback: legge player_current_location direttamente
    //    PostGIS restituisce position come WKB hex — usiamo select con cast
    const { data: rawLocs } = await supabase
      .from('player_current_location')
      .select('user_id, position')
      .in('user_id', userIds)

    if (!rawLocs || rawLocs.length === 0) return

    // Decodifica WKB hex: formato "0101000020E6100000<lng 8 bytes><lat 8 bytes>"
    // Little-endian IEEE 754 double
    const enriched: PlayerLocation[] = rawLocs.flatMap(row => {
      const coords = parseWKBPoint(row.position as string)
      if (!coords) return []
      return [{
        user_id: row.user_id,
        display_name: userDisplayMap.get(row.user_id) ?? '?',
        lat: coords.lat,
        lng: coords.lng,
      }]
    })

    if (enriched.length > 0) setLocations(enriched)
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

// ── WKB Point decoder ─────────────────────────────────────────────────────────
// Decodifica EWKB hex di un punto PostGIS (SRID=4326)
// Formato: 01 (LE) | 01000020 (tipo+SRID flag) | E6100000 (SRID 4326 LE) | 8 byte lng | 8 byte lat
function parseWKBPoint(hex: string | null | undefined): { lat: number; lng: number } | null {
  if (!hex || typeof hex !== 'string') return null
  try {
    // Rimuove eventuale prefisso \x (Supabase a volte lo aggiunge)
    const clean = hex.startsWith('\\x') ? hex.slice(2) : hex
    if (clean.length < 42) return null

    // Byte 0: byte order (01 = little endian)
    // Byte 1-4: geometry type
    // Byte 5-8: SRID (se presente, tipo & 0x20000000)
    // Determina offset: con SRID sono 21 byte di header (42 hex chars), senza 5 (10 hex)
    const typeHex = clean.slice(2, 10)
    const typeVal = parseInt(reverseHexBytes(typeHex), 16)
    const hasSrid = (typeVal & 0x20000000) !== 0
    const offset = hasSrid ? 42 : 10 // hex chars

    if (clean.length < offset + 32) return null

    const lngHex = clean.slice(offset, offset + 16)
    const latHex = clean.slice(offset + 16, offset + 32)

    const lng = hexToDouble(lngHex)
    const lat = hexToDouble(latHex)

    if (isNaN(lat) || isNaN(lng)) return null
    return { lat, lng }
  } catch {
    return null
  }
}

function reverseHexBytes(hex: string): string {
  const bytes = hex.match(/.{2}/g) ?? []
  return bytes.reverse().join('')
}

function hexToDouble(hex: string): number {
  // Little-endian → big-endian
  const be = reverseHexBytes(hex)
  const buf = new ArrayBuffer(8)
  const view = new DataView(buf)
  for (let i = 0; i < 8; i++) {
    view.setUint8(i, parseInt(be.slice(i * 2, i * 2 + 2), 16))
  }
  return view.getFloat64(0, false)
}