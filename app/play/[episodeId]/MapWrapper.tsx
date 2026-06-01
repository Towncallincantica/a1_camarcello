'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MapView, type MapMarker } from '@/components/MapView'

interface Props {
  episodeId: string
  currentUserId: string
  playerId: string
  playerLevel: number
  teamMemberIds: string[]
}

interface PlayerLocation {
  user_id: string
  display_name: string
  lat: number
  lng: number
}

// ── Tipi visibility rules ──────────────────────────────────────
type VRAlways          = { type: 'always' }
type VREpisode         = { type: 'episode_active'; episode_id: string }
type VRTimeWindow      = { type: 'time_window'; from: string; to: string }
type VRProximityMarker = { type: 'proximity_marker'; marker_id: string; within_meters: number }
type VRMinLevel        = { type: 'min_level'; level: number }
type VRHasStatus       = { type: 'has_status'; status_type: string }
type VRTeamNearby      = { type: 'team_nearby'; min_members: number; within_meters: number }
type VRTeamHasItem     = { type: 'team_has_item'; item_id: string }
type VisibilityRule    = VRAlways | VREpisode | VRTimeWindow | VRProximityMarker | VRMinLevel | VRHasStatus | VRTeamNearby | VRTeamHasItem

interface RawMarker extends MapMarker {
  visibility_rules: VisibilityRule[]
  episode_id: string | null
  interaction_data: Record<string, unknown>
}

interface EvalContext {
  episodeId: string
  playerLevel: number
  playerInventoryItemIds: Set<string>
  activeStatusTypes: Set<string>
  teamInventoryItemIds: Set<string>
  teamLocations: { user_id: string; lat: number; lng: number }[]
  selfLocation: { lat: number; lng: number } | null
  allMarkers: RawMarker[]
}

// ── Haversine distance ─────────────────────────────────────────
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Valuta una singola regola ──────────────────────────────────
function evalRule(rule: VisibilityRule, ctx: EvalContext): boolean {
  switch (rule.type) {
    case 'always':
      return true

    case 'episode_active':
      return rule.episode_id === ctx.episodeId

    case 'time_window': {
      const now = new Date()
      const [fh, fm] = rule.from.split(':').map(Number)
      const [th, tm] = rule.to.split(':').map(Number)
      const nowMins = now.getHours() * 60 + now.getMinutes()
      const fromMins = fh * 60 + fm
      const toMins = th * 60 + tm
      return nowMins >= fromMins && nowMins <= toMins
    }

    case 'proximity_marker': {
      const target = ctx.allMarkers.find(m => m.marker_id === rule.marker_id)
      if (!target || !ctx.selfLocation) return false
      const d = distanceMeters(ctx.selfLocation.lat, ctx.selfLocation.lng, target.lat, target.lng)
      return d <= rule.within_meters
    }

    case 'min_level':
      return ctx.playerLevel >= rule.level

    case 'has_status':
      return ctx.activeStatusTypes.has(rule.status_type)

    case 'team_nearby': {
      if (!ctx.selfLocation) return false
      const nearbyCount = ctx.teamLocations.filter(tl =>
        distanceMeters(ctx.selfLocation!.lat, ctx.selfLocation!.lng, tl.lat, tl.lng) <= rule.within_meters
      ).length
      return nearbyCount >= rule.min_members
    }

    case 'team_has_item':
      return ctx.teamInventoryItemIds.has(rule.item_id)

    default:
      return true
  }
}

// ── Valuta tutte le regole (AND) ───────────────────────────────
function isMarkerVisible(marker: RawMarker, ctx: EvalContext): boolean {
  const rules = marker.visibility_rules ?? []
  if (rules.length === 0) return true
  return rules.every(rule => evalRule(rule, ctx))
}

// ── Component ─────────────────────────────────────────────────
export default function MapWrapper({
  episodeId,
  currentUserId,
  playerId,
  playerLevel,
  teamMemberIds,
}: Props) {
  const [locations, setLocations] = useState<PlayerLocation[]>([])
  const [visibleMarkers, setVisibleMarkers] = useState<MapMarker[]>([])
  const [allRawMarkers, setAllRawMarkers] = useState<RawMarker[]>([])
  const [evalCtx, setEvalCtx] = useState<Omit<EvalContext, 'allMarkers' | 'selfLocation'>>({
    episodeId,
    playerLevel,
    playerInventoryItemIds: new Set(),
    activeStatusTypes: new Set(),
    teamInventoryItemIds: new Set(),
    teamLocations: [],
  })
  const supabase = useMemo(() => createClient(), [])

  // Carica posizioni player (estrae lat/lng via ST_Y/ST_X nella RPC)
  const loadLocations = useCallback(async () => {
    const { data, error } = await supabase
      .rpc('get_episode_player_locations', { p_episode_id: episodeId })
    if (error) { console.error('[MapWrapper] RPC error:', error); return }
    setLocations((data ?? []) as PlayerLocation[])
  }, [episodeId, supabase])

  // Carica marker dalla DB
  const loadMarkers = useCallback(async () => {
    const { data, error } = await supabase
      .from('map_markers')
      .select('marker_id, name, description, content_html, lat, lng, radius_meters, marker_type, interaction_type, interaction_data, icon, visibility_rules, episode_id')
      .eq('adventure_id', process.env.NEXT_PUBLIC_ADVENTURE_ID!)
      .eq('is_active', true)

    if (error) { console.error('[MapWrapper] markers error:', error); return }
    setAllRawMarkers((data ?? []) as RawMarker[])
  }, [supabase])

  // Carica inventario player + status effects
  const loadPlayerContext = useCallback(async () => {
    const [inventoryRes, statusRes] = await Promise.all([
      supabase
        .from('player_episode_inventory')
        .select('item_id')
        .eq('player_id', playerId),
      supabase
        .from('player_status_effects')
        .select('status_type, expires_at')
        .eq('player_id', playerId),
    ])

    const itemIds = new Set<string>(
      (inventoryRes.data ?? []).map((r: { item_id: string }) => r.item_id)
    )

    const now = new Date()
    const activeStatuses = new Set<string>(
      (statusRes.data ?? [])
        .filter((r: { expires_at: string | null }) =>
          !r.expires_at || new Date(r.expires_at) > now
        )
        .map((r: { status_type: string }) => r.status_type)
    )

    setEvalCtx(ctx => ({ ...ctx, playerInventoryItemIds: itemIds, activeStatusTypes: activeStatuses }))
  }, [playerId, supabase])

  // Carica inventario team
  const loadTeamContext = useCallback(async () => {
    if (teamMemberIds.length === 0) return

    const { data } = await supabase
      .from('player_episode_inventory')
      .select('item_id')
      .in('player_id', teamMemberIds)

    const teamItemIds = new Set<string>(
      (data ?? []).map((r: { item_id: string }) => r.item_id)
    )
    setEvalCtx(ctx => ({ ...ctx, teamInventoryItemIds: teamItemIds }))
  }, [teamMemberIds, supabase])

  // Init
  useEffect(() => {
    loadLocations()
    loadMarkers()
    loadPlayerContext()
    loadTeamContext()
  }, [loadLocations, loadMarkers, loadPlayerContext, loadTeamContext])

  // GPS event → ricarica locations
  useEffect(() => {
    const onGpsOk = () => loadLocations()
    window.addEventListener('gps:ok', onGpsOk)
    return () => window.removeEventListener('gps:ok', onGpsOk)
  }, [loadLocations])

  // ── Realtime locations ────────────────────────────────────────
  // Filtro per episodio: riceviamo SOLO i cambi dei giocatori di QUESTO episodio
  // (player_current_location.episode_id), niente fan-out globale.
  // La colonna position è PostGIS → non deserializzabile nel payload Realtime:
  // usiamo l'evento solo come trigger e rifetchiamo le coord via RPC (debounced).
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const scheduleRefetch = () => {
      if (refetchTimer.current) return // già schedulato
      refetchTimer.current = setTimeout(() => {
        refetchTimer.current = null
        loadLocations()
      }, 500)
    }

    const channel = supabase
      .channel(`map-locations:${episodeId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'player_current_location',
        filter: `episode_id=eq.${episodeId}`,
      }, scheduleRefetch)
      .subscribe()

    return () => {
      if (refetchTimer.current) { clearTimeout(refetchTimer.current); refetchTimer.current = null }
      supabase.removeChannel(channel)
    }
  }, [episodeId, supabase, loadLocations])

  // Aggiorna team locations dal pool delle locations caricate
  useEffect(() => {
    const teamLocs = locations
      .filter(l => teamMemberIds.includes(l.user_id))
      .map(l => ({ user_id: l.user_id, lat: l.lat, lng: l.lng }))
    setEvalCtx(ctx => ({ ...ctx, teamLocations: teamLocs }))
  }, [locations, teamMemberIds])

  // Rivaluta visibilità marker ogni volta che cambia contesto o marker
  useEffect(() => {
    const self = locations.find(l => l.user_id === currentUserId)
    const ctx: EvalContext = {
      ...evalCtx,
      allMarkers: allRawMarkers,
      selfLocation: self ? { lat: self.lat, lng: self.lng } : null,
    }
    const visible = allRawMarkers.filter(m => isMarkerVisible(m, ctx))
    setVisibleMarkers(visible)
  }, [allRawMarkers, evalCtx, locations, currentUserId])

  // Rivaluta ogni minuto (per time_window)
  useEffect(() => {
    const interval = setInterval(() => {
      const self = locations.find(l => l.user_id === currentUserId)
      const ctx: EvalContext = {
        ...evalCtx,
        allMarkers: allRawMarkers,
        selfLocation: self ? { lat: self.lat, lng: self.lng } : null,
      }
      setVisibleMarkers(allRawMarkers.filter(m => isMarkerVisible(m, ctx)))
    }, 60_000)
    return () => clearInterval(interval)
  }, [allRawMarkers, evalCtx, locations, currentUserId])

  return (
    <MapView
      initialLocations={locations}
      currentUserId={currentUserId}
      episodeId={episodeId}
      mapMarkers={visibleMarkers}
    />
  )
}