'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MapView, type MapMarker } from '@/components/MapView'
import { useProximityTrigger, type ProximityMarker } from '@/lib/proximity/useProximityTrigger'
import type { OnEnterAction, OnEnterHandlers } from '@/lib/proximity/onEnterDispatcher'

interface Props {
  episodeId: string
  currentUserId: string
  playerId: string
  playerLevel: number
  teamId: string | null
  onClaimItem?: (itemId: string) => void
  onTalk?: (progressItemId: string) => void
  // Proximity on_enter handlers owned by EpisodeGameplay (UI + persistence)
  onNarrative?: (n: { title?: string; content: string; key: string; once: boolean }) => void
  onApplyEffect?: (markerId: string) => Promise<void>
  onCompleteTarget?: (targetId: string) => Promise<void>
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
  proximity_radius_m: number | null
  on_enter_actions: OnEnterAction[] | null
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

// ── Arricchisce un RawMarker con i campi di interazione tipizzati ──
// claim_item            → item_id
// narrative/npc_dialog  → progress_item_id
function enrichMarker(m: RawMarker): MapMarker {
  const data = m.interaction_data ?? {}
  return {
    ...m,
    item_id: m.interaction_type === 'claim_item'
      ? (data.item_id as string | undefined)
      : undefined,
    progress_item_id: (m.interaction_type === 'narrative' || m.interaction_type === 'npc_dialog')
      ? (data.progress_item_id as string | undefined)
      : undefined,
  }
}

// ── Component ─────────────────────────────────────────────────
export default function MapWrapper({
  episodeId,
  currentUserId,
  playerId,
  playerLevel,
  teamId,
  onClaimItem,
  onTalk,
  onNarrative,
  onApplyEffect,
  onCompleteTarget,
}: Props) {
  const [locations, setLocations] = useState<PlayerLocation[]>([])
  const [visibleMarkers, setVisibleMarkers] = useState<MapMarker[]>([])
  const [allRawMarkers, setAllRawMarkers] = useState<RawMarker[]>([])
  // Posizione locale grezza (dal detail di gps:ok) — usata SOLO per la prossimità.
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  // Marker forzati visibili da un reveal_marker (idempotenti: non persistono,
  // ma le visibility_rules dovrebbero comunque ri-rivelarli dopo un refresh).
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())
  // user_id dei membri della squadra — serve per filtrare le posizioni
  // (le location sono indicizzate per user_id, l'inventario per player_id).
  const [teamUserIds, setTeamUserIds] = useState<string[]>([])
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
      .select('marker_id, name, description, content_html, lat, lng, radius_meters, marker_type, interaction_type, interaction_data, icon, visibility_rules, episode_id, proximity_radius_m, on_enter_actions')
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

  // Membri della squadra → user_id (per filtrare le posizioni di team_nearby).
  const loadTeamMembers = useCallback(async () => {
    if (!teamId) { setTeamUserIds([]); return }
    // Join su player. Le join Supabase tornano array anche per 1:1 → Array.isArray.
    const { data } = await supabase
      .from('team_members')
      .select('player:player_id ( user_id )')
      .eq('team_id', teamId)

    const userIds: string[] = []
    for (const m of (data ?? []) as { player: { user_id: string } | { user_id: string }[] | null }[]) {
      const p = Array.isArray(m.player) ? m.player[0] : m.player
      if (p?.user_id) userIds.push(p.user_id)
    }
    setTeamUserIds(userIds)
  }, [teamId, supabase])

  // Inventario aggregato della squadra → via RPC SECURITY DEFINER (bypassa RLS,
  // altrimenti ogni giocatore vedrebbe solo il proprio inventario).
  const loadTeamInventory = useCallback(async () => {
    if (!teamId) {
      setEvalCtx(ctx => ({ ...ctx, teamInventoryItemIds: new Set() }))
      return
    }
    const { data, error } = await supabase
      .rpc('get_team_inventory_item_ids', { p_team_id: teamId })
    if (error) { console.error('[MapWrapper] team inventory RPC error:', error); return }
    const ids = new Set<string>((data ?? []).map((r: { item_id: string }) => r.item_id))
    setEvalCtx(ctx => ({ ...ctx, teamInventoryItemIds: ids }))
  }, [teamId, supabase])

  // Init
  useEffect(() => {
    loadLocations()
    loadMarkers()
    loadPlayerContext()
    loadTeamMembers()
    loadTeamInventory()
  }, [loadLocations, loadMarkers, loadPlayerContext, loadTeamMembers, loadTeamInventory])

  // Refresh inventario squadra SOLO se almeno un marker usa team_has_item.
  // Altrimenti zero chiamate. Quando serve: una RPC ogni 30s (invalidazione
  // robusta — il Realtime sarebbe bloccato dalla RLS sui dati altrui).
  const needsTeamInventory = useMemo(
    () => allRawMarkers.some(m => (m.visibility_rules ?? []).some(r => r.type === 'team_has_item')),
    [allRawMarkers]
  )
  useEffect(() => {
    if (!teamId || !needsTeamInventory) return
    const id = setInterval(() => { loadTeamInventory() }, 30_000)
    return () => clearInterval(id)
  }, [teamId, needsTeamInventory, loadTeamInventory])

  // GPS event → cattura posizione locale (per prossimità) + ricarica locations
  useEffect(() => {
    const onGpsOk = (e: Event) => {
      const detail = (e as CustomEvent<{ lat: number; lng: number }>).detail
      if (detail && typeof detail.lat === 'number' && typeof detail.lng === 'number') {
        setPosition({ lat: detail.lat, lng: detail.lng })
      }
      loadLocations()
    }
    window.addEventListener('gps:ok', onGpsOk)
    return () => window.removeEventListener('gps:ok', onGpsOk)
  }, [loadLocations])

  // ── Realtime locations ────────────────────────────────────────
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
      .filter(l => teamUserIds.includes(l.user_id))
      .map(l => ({ user_id: l.user_id, lat: l.lat, lng: l.lng }))
    setEvalCtx(ctx => ({ ...ctx, teamLocations: teamLocs }))
  }, [locations, teamUserIds])

  // ── Prossimità: handlers + hook ───────────────────────────────
  // Solo i marker con trigger attivo entrano nell'engine.
  const proximityMarkers = useMemo<ProximityMarker[]>(
    () => allRawMarkers
      .filter(m => m.proximity_radius_m != null)
      .map(m => ({
        marker_id: m.marker_id,
        lat: m.lat,
        lng: m.lng,
        proximity_radius_m: m.proximity_radius_m,
        on_enter_actions: m.on_enter_actions,
      })),
    [allRawMarkers]
  )

  const handlers = useMemo<OnEnterHandlers>(() => ({
    // Cosmetico, locale, 0 DB
    revealMarker: (markerId) => {
      setRevealedIds(prev => (prev.has(markerId) ? prev : new Set(prev).add(markerId)))
    },
    showNarrative: (n) => { onNarrative?.(n) },
    // Persistente: delega a EpisodeGameplay passando il markerId (il server
    // rilegge le azioni). Dopo, ricarico il player context così le regole
    // has_status/has_item si ri-valutano (reveal idempotente).
    applyEffect: async (markerId) => {
      await onApplyEffect?.(markerId)
      await loadPlayerContext()
    },
    completeTarget: async (t) => { await onCompleteTarget?.(t) },
  }), [onNarrative, onApplyEffect, onCompleteTarget, loadPlayerContext])

  useProximityTrigger({ position, markers: proximityMarkers, handlers })

  // ── Visibilità ─────────────────────────────────────────────────
  const computeVisible = useCallback(() => {
    const self = locations.find(l => l.user_id === currentUserId)
    const ctx: EvalContext = {
      ...evalCtx,
      allMarkers: allRawMarkers,
      selfLocation: self ? { lat: self.lat, lng: self.lng } : null,
    }
    return allRawMarkers
      .filter(m => isMarkerVisible(m, ctx) || revealedIds.has(m.marker_id))
      .map(enrichMarker)
  }, [allRawMarkers, evalCtx, locations, currentUserId, revealedIds])

  // Rivaluta ogni volta che cambia contesto, marker o reveal
  useEffect(() => {
    setVisibleMarkers(computeVisible())
  }, [computeVisible])

  // Rivaluta ogni minuto (per time_window)
  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleMarkers(computeVisible())
    }, 60_000)
    return () => clearInterval(interval)
  }, [computeVisible])

  return (
    <MapView
      initialLocations={locations}
      currentUserId={currentUserId}
      episodeId={episodeId}
      mapMarkers={visibleMarkers}
      onClaimItem={onClaimItem}
      onTalk={onTalk}
    />
  )
}