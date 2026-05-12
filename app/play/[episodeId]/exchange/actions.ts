'use server'

import { createServiceRoleClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Avvia una sessione di scambio (player A scansiona player B)
export async function initiateExchange(
  episodeId: string,
  playerAId: string,
  playerBId: string
) {
  const service = createServiceRoleClient()

  // Verifica che player B sia nell'episodio
  const { data: bStats } = await service
    .from('player_episode_stats')
    .select('player_id')
    .eq('player_id', playerBId)
    .eq('episode_id', episodeId)
    .single()

  if (!bStats) throw new Error('Player non trovato in questo episodio.')
  if (playerAId === playerBId) throw new Error('Non puoi scambiare con te stesso.')

  const { data: session, error } = await service
    .from('exchange_sessions')
    .insert({
      episode_id: episodeId,
      player_a_id: playerAId,
      player_b_id: playerBId,
      status: 'pending',
    })
    .select('session_id')
    .single()

  if (error) throw new Error(error.message)

  redirect(`/play/${episodeId}/exchange/${session.session_id}`)
}

// Seleziona l'item da offrire (player A o B)
export async function selectItem(
  episodeId: string,
  sessionId: string,
  playerId: string,
  itemId: string
) {
  const service = createServiceRoleClient()

  const { data: session } = await service
    .from('exchange_sessions')
    .select('player_a_id, player_b_id, status')
    .eq('session_id', sessionId)
    .single()

  if (!session || session.status !== 'pending') throw new Error('Sessione non valida.')

  const isA = session.player_a_id === playerId
  const isB = session.player_b_id === playerId
  if (!isA && !isB) throw new Error('Non sei parte di questo scambio.')

  const field = isA ? 'player_a_item_id' : 'player_b_item_id'

  const { error } = await service
    .from('exchange_sessions')
    .update({ [field]: itemId })
    .eq('session_id', sessionId)

  if (error) throw new Error(error.message)

  revalidatePath(`/play/${episodeId}/exchange/${sessionId}`)
}

// Conferma lo scambio
export async function confirmExchange(
  episodeId: string,
  sessionId: string,
  playerId: string
) {
  const service = createServiceRoleClient()

  const { data: session } = await service
    .from('exchange_sessions')
    .select('player_a_id, player_b_id, player_a_item_id, player_b_item_id, player_a_confirmed, player_b_confirmed, status')
    .eq('session_id', sessionId)
    .single()

  if (!session || session.status !== 'pending') throw new Error('Sessione non valida.')

  const isA = session.player_a_id === playerId
  const isB = session.player_b_id === playerId
  if (!isA && !isB) throw new Error('Non sei parte di questo scambio.')

  const confirmField = isA ? 'player_a_confirmed' : 'player_b_confirmed'

  const { data: updated, error } = await service
    .from('exchange_sessions')
    .update({ [confirmField]: true })
    .eq('session_id', sessionId)
    .select('player_a_confirmed, player_b_confirmed, player_a_item_id, player_b_item_id')
    .single()

  if (error) throw new Error(error.message)

  // Se entrambi confermati → esegui lo scambio
  if (updated.player_a_confirmed && updated.player_b_confirmed) {
    await executeExchange(
      episodeId,
      sessionId,
      session.player_a_id,
      session.player_b_id,
      updated.player_a_item_id,
      updated.player_b_item_id,
      service
    )
  }

  revalidatePath(`/play/${episodeId}/exchange/${sessionId}`)
}

// Annulla lo scambio
export async function cancelExchange(
  episodeId: string,
  sessionId: string
) {
  const service = createServiceRoleClient()

  const { error } = await service
    .from('exchange_sessions')
    .update({ status: 'cancelled' })
    .eq('session_id', sessionId)

  if (error) throw new Error(error.message)

  revalidatePath(`/play/${episodeId}/exchange/${sessionId}`)
  redirect(`/play/${episodeId}`)
}

// ── Esecuzione scambio ────────────────────────────────────────

async function executeExchange(
  episodeId: string,
  sessionId: string,
  playerAId: string,
  playerBId: string,
  itemAId: string | null,
  itemBId: string | null,
  service: ReturnType<typeof createServiceRoleClient>
) {
  // Trasferisci item A → B
  if (itemAId) {
    await transferItem(episodeId, playerAId, playerBId, itemAId, service)
  }
  // Trasferisci item B → A
  if (itemBId) {
    await transferItem(episodeId, playerBId, playerAId, itemBId, service)
  }

  await service
    .from('exchange_sessions')
    .update({ status: 'completed' })
    .eq('session_id', sessionId)
}

async function transferItem(
  episodeId: string,
  fromPlayerId: string,
  toPlayerId: string,
  itemId: string,
  service: ReturnType<typeof createServiceRoleClient>
) {
  // Rimuovi 1 dal mittente
  const { data: fromInv } = await service
    .from('player_episode_inventory')
    .select('quantity')
    .eq('player_id', fromPlayerId)
    .eq('item_id', itemId)
    .eq('episode_id', episodeId)
    .single()

  if (!fromInv || fromInv.quantity < 1) return

  if (fromInv.quantity === 1) {
    await service
      .from('player_episode_inventory')
      .delete()
      .eq('player_id', fromPlayerId)
      .eq('item_id', itemId)
      .eq('episode_id', episodeId)
  } else {
    await service
      .from('player_episode_inventory')
      .update({ quantity: fromInv.quantity - 1 })
      .eq('player_id', fromPlayerId)
      .eq('item_id', itemId)
      .eq('episode_id', episodeId)
  }

  // Aggiungi 1 al destinatario
  const { data: toInv } = await service
    .from('player_episode_inventory')
    .select('quantity')
    .eq('player_id', toPlayerId)
    .eq('item_id', itemId)
    .eq('episode_id', episodeId)
    .single()

  if (toInv) {
    await service
      .from('player_episode_inventory')
      .update({ quantity: toInv.quantity + 1 })
      .eq('player_id', toPlayerId)
      .eq('item_id', itemId)
      .eq('episode_id', episodeId)
  } else {
    await service
      .from('player_episode_inventory')
      .insert({
        player_id: toPlayerId,
        item_id: itemId,
        episode_id: episodeId,
        quantity: 1,
      })
  }
}