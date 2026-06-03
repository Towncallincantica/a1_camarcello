'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { ADVENTURE_ID } from '@/lib/constants'
import type { OnEnterAction } from '@/lib/proximity/onEnterDispatcher'

export type ClaimResult =
  | {
      success: true
      item: {
        item_id: string
        name: string
        description: string | null
        image_url: string | null
        icon_url: string | null
        rarity: string
      }
    }
  | { success: false; error: string }

export async function claimItemByQR(
  episodeId: string,
  itemId: string
): Promise<ClaimResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non autenticato.' }

  const service = createServiceRoleClient()

  // Carica player
  const { data: player } = await service
    .from('player')
    .select('player_id')
    .eq('user_id', user.id)
    .eq('adventure_id', ADVENTURE_ID)
    .single()
  if (!player) return { success: false, error: 'Profilo giocatore non trovato.' }

// Gate: un effetto attivo può impedire la raccolta (es. "immobilizzato")
  const { data: canClaim } = await service.rpc('player_can', {
    p_player_id: player.player_id,
    p_episode_id: episodeId,
    p_capability: 'can_claim',
  })
  if (canClaim === false)
    return { success: false, error: 'Un effetto attivo ti impedisce di raccogliere oggetti.' }


  // Carica item
  const { data: item } = await service
    .from('items')
    .select(
      'item_id, name, description, image_url, icon_url, rarity, is_stackable, max_stack, claim_limit, claim_limit_per_player, uniqueness_scope, adventure_id, episode_id'
    )
    .eq('item_id', itemId)
    .single()

  if (!item) return { success: false, error: 'Oggetto non trovato.' }

  // Verifica scope avventura/episodio
  if (item.adventure_id && item.adventure_id !== ADVENTURE_ID)
    return { success: false, error: 'Oggetto non disponibile in questa avventura.' }
  if (item.episode_id && item.episode_id !== episodeId)
    return { success: false, error: 'Oggetto non disponibile in questo episodio.' }

  // claim_limit_per_player
  if (item.claim_limit_per_player !== null) {
    const { count } = await service
      .from('player_episode_inventory')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', player.player_id)
      .eq('item_id', itemId)
    if ((count ?? 0) >= item.claim_limit_per_player)
      return { success: false, error: 'Hai già raccolto questo oggetto il numero massimo di volte.' }
  }

  // uniqueness_scope
  const scope = item.uniqueness_scope
  if (scope && scope !== 'none') {
    if (scope === 'per_player') {
      const { count } = await service
        .from('player_episode_inventory')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', player.player_id)
        .eq('item_id', itemId)
      if ((count ?? 0) > 0)
        return { success: false, error: 'Possiedi già questo oggetto unico.' }
    }

    if (scope === 'per_episode') {
      const { count } = await service
        .from('player_episode_inventory')
        .select('*', { count: 'exact', head: true })
        .eq('item_id', itemId)
        .eq('episode_id', episodeId)
      if ((count ?? 0) > 0)
        return { success: false, error: 'Questo oggetto è già stato raccolto in questo episodio.' }
    }

    if (scope === 'per_adventure') {
      const { data: episodes } = await service
        .from('episodes')
        .select('episode_id')
        .eq('adventure_id', ADVENTURE_ID)
      const ids = (episodes ?? []).map((e: { episode_id: string }) => e.episode_id)
      const { count } = await service
        .from('player_episode_inventory')
        .select('*', { count: 'exact', head: true })
        .eq('item_id', itemId)
        .in('episode_id', ids)
      if ((count ?? 0) > 0)
        return { success: false, error: 'Questo oggetto è già stato raccolto in questa avventura.' }
    }

    if (scope === 'global') {
      const { count } = await service
        .from('player_episode_inventory')
        .select('*', { count: 'exact', head: true })
        .eq('item_id', itemId)
      if ((count ?? 0) > 0)
        return { success: false, error: 'Questo oggetto unico è già stato raccolto da qualcun altro.' }
    }
  }

  // claim_limit globale
  if (item.claim_limit !== null) {
    const { count } = await service
      .from('player_episode_inventory')
      .select('*', { count: 'exact', head: true })
      .eq('item_id', itemId)
    if ((count ?? 0) >= item.claim_limit)
      return { success: false, error: 'Questo oggetto ha raggiunto il limite massimo di raccolte.' }
  }

  // Aggiungi all'inventario
  const { data: existing } = await service
    .from('player_episode_inventory')
    .select('quantity')
    .eq('player_id', player.player_id)
    .eq('item_id', itemId)
    .eq('episode_id', episodeId)
    .maybeSingle()

  if (existing && item.is_stackable) {
    const newQty = Math.min(existing.quantity + 1, item.max_stack)
    await service
      .from('player_episode_inventory')
      .update({ quantity: newQty })
      .eq('player_id', player.player_id)
      .eq('item_id', itemId)
      .eq('episode_id', episodeId)
  } else if (!existing) {
    await service.from('player_episode_inventory').insert({
      player_id: player.player_id,
      item_id: itemId,
      episode_id: episodeId,
      quantity: 1,
    })
  } else {
    return { success: false, error: 'Non puoi raccogliere più unità di questo oggetto.' }
  }

  return {
    success: true,
    item: {
      item_id: item.item_id,
      name: item.name,
      description: item.description ?? null,
      image_url: item.image_url ?? null,
      icon_url: item.icon_url ?? null,
      rarity: item.rarity,
    },
  }
}
// ────────────────────────────────────────────────────────────────
// applyMarkerOnEnter — braccio persistente del sistema di prossimità.
//
// Il client dice solo "sono entrato nel marker X" (markerId). Il server
// RILEGGE on_enter_actions dal DB — non si fida del payload del client —
// ed esegue gli effetti dichiarati lì. Fonte di verità = il DB, mai il browser.
//
// Per ora gestisce solo give_item_id (riusa claimItemByQR → stesse regole di
// unicità/stacking). XP e status sono no-op intenzionali (vedi nota).
// ────────────────────────────────────────────────────────────────

export type ApplyOnEnterResult =
  | { success: true; claimed: ClaimResult[] }
  | { success: false; error: string }

export async function applyMarkerOnEnter(
  episodeId: string,
  markerId: string
): Promise<ApplyOnEnterResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non autenticato.' }

  const service = createServiceRoleClient()

  // Rileggi il marker dal DB: scope + azioni autorevoli.
  const { data: marker } = await service
    .from('map_markers')
    .select('marker_id, adventure_id, episode_id, on_enter_actions, is_active')
    .eq('marker_id', markerId)
    .single()

  if (!marker || !marker.is_active)
    return { success: false, error: 'Marker non trovato.' }

  // Verifica che il marker appartenga a questa avventura/episodio.
  if (marker.adventure_id && marker.adventure_id !== ADVENTURE_ID)
    return { success: false, error: 'Marker non disponibile in questa avventura.' }
  if (marker.episode_id && marker.episode_id !== episodeId)
    return { success: false, error: 'Marker non disponibile in questo episodio.' }

  const actions = (marker.on_enter_actions ?? []) as OnEnterAction[]

  // Esegui solo le azioni persistenti (apply_effect). reveal_marker e
  // show_narrative sono cosmetici e restano lato client.
  const claimed: ClaimResult[] = []

  for (const action of actions) {
    if (action.type !== 'apply_effect') continue

    if (action.give_item_id) {
      // Riusa la logica autorevole: stesse regole di unicità/stacking.
      const res = await claimItemByQR(episodeId, action.give_item_id)
      claimed.push(res)
    }

    // NOTA: XP e status non sono gestiti di proposito.
    // Senza tabella guardia (player_marker_triggers) sarebbero ri-applicabili
    // a ogni rientro nel raggio. Quando servirà, aggiungere qui la logica
    // con il controllo once-per-player.
  }

  return { success: true, claimed }
}