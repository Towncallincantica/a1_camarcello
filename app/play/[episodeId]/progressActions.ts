'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { requirePlayer } from '@/lib/auth/requirePlayer'

export type GiveProgressResult =
  | { success: true; nodeId: string | null; alreadyHad: boolean }
  | { success: false; error: string }

/**
 * Assegna un progress item al giocatore (idempotente).
 * Verifica che il progress item appartenga all'episodio, scrive su
 * player_steps e ritorna il node_id collegato (per atterrare sul nodo).
 *
 * Ritorna il dato e lascia la navigazione al client (router.refresh /
 * push) — niente redirect() qui, per non farlo inghiottire dal try/catch.
 */
export async function giveProgressItem(
  episodeId: string,
  progressItemId: string
): Promise<GiveProgressResult> {
  const { player } = await requirePlayer()

  const supabase = await createClient()

  // 1. Verifica che il progress item esista e sia di questo episodio
  const { data: pi, error: piErr } = await supabase
    .from('progress_items')
    .select('progress_item_id, node_id, episode_id')
    .eq('progress_item_id', progressItemId)
    .eq('episode_id', episodeId)
    .single()

  if (piErr || !pi) {
    return { success: false, error: 'Progress item non trovato per questo episodio.' }
  }

  // 2. Insert idempotente su player_steps (PK composta player+progress+episode)
  const service = createServiceRoleClient()
  const { error: insErr } = await service.from('player_steps').insert({
    player_id: player.player_id,
    progress_item_id: progressItemId,
    episode_id: episodeId,
  })

  // 23505 = già posseduto → non è un errore, è idempotenza
  if (insErr && insErr.code !== '23505') {
    return { success: false, error: insErr.message }
  }

  return {
    success: true,
    nodeId: pi.node_id ?? null,
    alreadyHad: insErr?.code === '23505',
  }
}