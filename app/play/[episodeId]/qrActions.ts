'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { ADVENTURE_ID } from '@/lib/constants'

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