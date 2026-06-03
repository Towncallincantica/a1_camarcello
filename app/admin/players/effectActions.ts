'use server'

import { createServiceRoleClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'

export type AdminActionResult = { ok: true } | { ok: false; error: string }

// Applica (upsert) un effetto a un player nel suo episodio.
// durationMinutes null/undefined = permanente.
export async function applyEffect(
  playerId: string,
  episodeId: string,
  statusType: string,
  metadata: Record<string, unknown>,
  durationMinutes: number | null
): Promise<AdminActionResult> {
  const service = createServiceRoleClient()

  const expiresAt = durationMinutes
    ? new Date(Date.now() + durationMinutes * 60_000).toISOString()
    : null

  // UNIQUE (player_id, episode_id, status_type) → upsert rinfresca durata/metadata
  const { error } = await service
    .from('player_status_effects')
    .upsert(
      {
        player_id: playerId,
        episode_id: episodeId,
        status_type: statusType,
        expires_at: expiresAt,
        metadata,
      },
      { onConflict: 'player_id,episode_id,status_type' }
    )

  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin/players')
  return { ok: true }
}

// Rimuove tutti gli effetti di un player in un episodio.
export async function clearEffects(
  playerId: string,
  episodeId: string
): Promise<AdminActionResult> {
  const service = createServiceRoleClient()

  const { error } = await service
    .from('player_status_effects')
    .delete()
    .eq('player_id', playerId)
    .eq('episode_id', episodeId)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin/players')
  return { ok: true }
}