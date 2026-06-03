'use server'

import { createServiceRoleClient } from '@/lib/supabase/service'
import { requirePlayer } from '@/lib/auth/requirePlayer'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type InitiateResult =
  | { ok: true; sessionId: string }
  | { ok: false; error: string }

async function assertCan(
  service: ReturnType<typeof createServiceRoleClient>,
  playerId: string,
  episodeId: string,
  capability: string,
  blockedMessage: string
) {
  const { data: allowed, error } = await service.rpc('player_can', {
    p_player_id: playerId,
    p_episode_id: episodeId,
    p_capability: capability,
  })
  if (error) throw new Error(error.message)
  if (allowed === false) throw new Error(blockedMessage)
}

// Avvia una sessione di scambio. Ritorna un result (non lancia).
export async function initiateExchange(
  episodeId: string,
  otherPlayerId: string
): Promise<InitiateResult> {
  const { player: me } = await requirePlayer()
  const service = createServiceRoleClient()

  if (otherPlayerId === me.player_id)
    return { ok: false, error: 'Non puoi scambiare con te stesso.' }

  const { data: allowed, error: gateErr } = await service.rpc('player_can', {
    p_player_id: me.player_id,
    p_episode_id: episodeId,
    p_capability: 'can_exchange',
  })
  if (gateErr) return { ok: false, error: gateErr.message }
  if (allowed === false)
    return { ok: false, error: 'Un effetto attivo ti impedisce di scambiare.' }

  const { data: stats } = await service
    .from('player_episode_stats')
    .select('player_id')
    .eq('episode_id', episodeId)
    .in('player_id', [me.player_id, otherPlayerId])

  const ids = new Set((stats ?? []).map((s) => s.player_id))
  if (!ids.has(me.player_id) || !ids.has(otherPlayerId))
    return { ok: false, error: 'Giocatore non trovato in questo episodio.' }

  const { data: session, error } = await service
    .from('exchange_sessions')
    .insert({
      episode_id: episodeId,
      player_a_id: me.player_id,
      player_b_id: otherPlayerId,
      status: 'pending',
    })
    .select('session_id')
    .single()

  if (error) return { ok: false, error: error.message }

  return { ok: true, sessionId: session.session_id }
}

export async function selectItem(
  episodeId: string,
  sessionId: string,
  itemId: string
) {
  const { player: me } = await requirePlayer()
  const service = createServiceRoleClient()

  const { data: session } = await service
    .from('exchange_sessions')
    .select('player_a_id, player_b_id, status')
    .eq('session_id', sessionId)
    .single()

  if (!session || session.status !== 'pending') throw new Error('Sessione non valida.')

  const isA = session.player_a_id === me.player_id
  const isB = session.player_b_id === me.player_id
  if (!isA && !isB) throw new Error('Non sei parte di questo scambio.')

  const { data: owned } = await service
    .from('player_episode_inventory')
    .select('quantity')
    .eq('player_id', me.player_id)
    .eq('item_id', itemId)
    .eq('episode_id', episodeId)
    .single()

  if (!owned || owned.quantity < 1) throw new Error('Non possiedi questo oggetto.')

  const field = isA ? 'player_a_item_id' : 'player_b_item_id'
  const confirmReset = isA
    ? { player_a_confirmed: false }
    : { player_b_confirmed: false }

  const { error } = await service
    .from('exchange_sessions')
    .update({ [field]: itemId, ...confirmReset })
    .eq('session_id', sessionId)

  if (error) throw new Error(error.message)

  revalidatePath(`/play/${episodeId}/exchange/${sessionId}`)
}

export async function confirmExchange(
  episodeId: string,
  sessionId: string
) {
  const { player: me } = await requirePlayer()
  const service = createServiceRoleClient()

  await assertCan(service, me.player_id, episodeId, 'can_exchange',
    'Un effetto attivo ti impedisce di scambiare.')

  const { data: session } = await service
    .from('exchange_sessions')
    .select('player_a_id, player_b_id, status')
    .eq('session_id', sessionId)
    .single()

  if (!session || session.status !== 'pending') throw new Error('Sessione non valida.')

  const isA = session.player_a_id === me.player_id
  const isB = session.player_b_id === me.player_id
  if (!isA && !isB) throw new Error('Non sei parte di questo scambio.')

  const confirmField = isA ? 'player_a_confirmed' : 'player_b_confirmed'

  const { data: updated, error } = await service
    .from('exchange_sessions')
    .update({ [confirmField]: true })
    .eq('session_id', sessionId)
    .select('player_a_confirmed, player_b_confirmed')
    .single()

  if (error) throw new Error(error.message)

  if (updated.player_a_confirmed && updated.player_b_confirmed) {
    const { error: rpcError } = await service.rpc('execute_exchange', {
      p_session_id: sessionId,
    })
    if (rpcError) throw new Error(rpcError.message)
  }

  revalidatePath(`/play/${episodeId}/exchange/${sessionId}`)
}

export async function cancelExchange(
  episodeId: string,
  sessionId: string
) {
  const { player: me } = await requirePlayer()
  const service = createServiceRoleClient()

  const { data: session } = await service
    .from('exchange_sessions')
    .select('player_a_id, player_b_id')
    .eq('session_id', sessionId)
    .single()

  if (!session) throw new Error('Sessione non valida.')
  if (session.player_a_id !== me.player_id && session.player_b_id !== me.player_id) {
    throw new Error('Non sei parte di questo scambio.')
  }

  const { error } = await service
    .from('exchange_sessions')
    .update({ status: 'cancelled' })
    .eq('session_id', sessionId)

  if (error) throw new Error(error.message)

  revalidatePath(`/play/${episodeId}/exchange/${sessionId}`)
  redirect(`/play/${episodeId}`)
}