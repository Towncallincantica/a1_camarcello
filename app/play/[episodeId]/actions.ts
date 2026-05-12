'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'

// ============================================================
// COMPLETE TARGET
// ============================================================

export async function completeTarget(
  episodeId: string,
  nodeId: string,
  targetId: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Recupera player
  const { data: player } = await supabase
    .from('player')
    .select('player_id')
    .eq('user_id', user.id)
    .single()
  if (!player) throw new Error('Player not found')

  const service = createServiceRoleClient()

  // Upsert progresso target
  const { error: progressError } = await service
    .from('player_target_progress')
    .upsert({
      player_id: player.player_id,
      target_id: targetId,
      episode_id: episodeId,
      completed: true,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'player_id,target_id,episode_id' })

  if (progressError) throw new Error(progressError.message)

  // Controlla se tutti i target del nodo sono completati
  const { data: allTargets } = await service
    .from('targets')
    .select('target_id')
    .eq('node_id', nodeId)
    .eq('episode_id', episodeId)

  if (!allTargets || allTargets.length === 0) {
    revalidatePath(`/play/${episodeId}`)
    return
  }

  const { data: completedTargets } = await service
    .from('player_target_progress')
    .select('target_id')
    .eq('player_id', player.player_id)
    .eq('episode_id', episodeId)
    .eq('completed', true)
    .in('target_id', allTargets.map((t) => t.target_id))

  const allDone =
    completedTargets?.length === allTargets.length

  if (allDone) {
    await applyNodeEffects(episodeId, nodeId, player.player_id, service)
  }

  revalidatePath(`/play/${episodeId}`)
}

// ============================================================
// APPLY NODE EFFECTS (interno)
// ============================================================

async function applyNodeEffects(
  episodeId: string,
  nodeId: string,
  playerId: string,
  service: ReturnType<typeof createServiceRoleClient>
) {
  const { data: effects } = await service
    .from('effects')
    .select('effect_id, type, payload')
    .eq('node_id', nodeId)
    .eq('episode_id', episodeId)

  if (!effects || effects.length === 0) return

  for (const effect of effects) {
    const payload = effect.payload as Record<string, unknown>

    if (effect.type === 'grant_progress_item') {
      const progressItemId = payload.progress_item_id as string
      if (!progressItemId) continue

      await service
        .from('player_steps')
        .upsert({
          player_id: playerId,
          progress_item_id: progressItemId,
          episode_id: episodeId,
        }, { onConflict: 'player_id,progress_item_id,episode_id' })

    } else if (effect.type === 'grant_inventory_item') {
      const itemId = payload.item_id as string
      const quantity = (payload.quantity as number) ?? 1
      if (!itemId) continue

      // Upsert: se esiste già, somma la quantità
      const { data: existing } = await service
        .from('player_episode_inventory')
        .select('quantity')
        .eq('player_id', playerId)
        .eq('item_id', itemId)
        .eq('episode_id', episodeId)
        .single()

      if (existing) {
        await service
          .from('player_episode_inventory')
          .update({ quantity: existing.quantity + quantity })
          .eq('player_id', playerId)
          .eq('item_id', itemId)
          .eq('episode_id', episodeId)
      } else {
        await service
          .from('player_episode_inventory')
          .insert({
            player_id: playerId,
            item_id: itemId,
            episode_id: episodeId,
            quantity,
          })
      }

    } else if (effect.type === 'modify_stat') {
      const stat = payload.stat as string
      const value = payload.value as number
      if (!stat || value == null) continue

      // Supporta solo experience_points e level per ora
      if (stat === 'experience_points' || stat === 'level') {
        const { data: player } = await service
          .from('player')
          .select(stat)
          .eq('player_id', playerId)
          .single()

        if (player) {
          const current = (player as Record<string, number>)[stat] ?? 0
          await service
            .from('player')
            .update({ [stat]: current + value })
            .eq('player_id', playerId)
        }
      }

    } else if (effect.type === 'add_status_effect') {
      const statusType = payload.status_type as string
      const durationMinutes = payload.duration_minutes as number | null
      if (!statusType) continue

      const expiresAt = durationMinutes
        ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
        : null

      await service
        .from('player_status_effects')
        .insert({
          player_id: playerId,
          episode_id: episodeId,
          status_type: statusType,
          expires_at: expiresAt,
        })
    }
  }
}

// ============================================================
// VERIFY TARGET — helpers per i tipi specifici
// ============================================================

// Verifica codice (code_entry e qr_scan)
export async function verifyCode(
  episodeId: string,
  nodeId: string,
  targetId: string,
  inputCode: string
) {
  const supabase = await createClient()

  const { data: target } = await supabase
    .from('targets')
    .select('type, payload')
    .eq('target_id', targetId)
    .single()

  if (!target) throw new Error('Target not found')

  const payload = target.payload as Record<string, unknown>
  const expectedCode = payload.code as string

  if (!expectedCode) throw new Error('Target has no code')
  if (inputCode.trim().toUpperCase() !== expectedCode.trim().toUpperCase()) {
    return { success: false, message: 'Codice non corretto.' }
  }

  await completeTarget(episodeId, nodeId, targetId)
  return { success: true }
}

// Verifica GPS proximity
export async function verifyGPS(
  episodeId: string,
  nodeId: string,
  targetId: string,
  playerLat: number,
  playerLng: number
) {
  const supabase = await createClient()

  const { data: target } = await supabase
    .from('targets')
    .select('payload')
    .eq('target_id', targetId)
    .single()

  if (!target) throw new Error('Target not found')

  const payload = target.payload as Record<string, unknown>
  const targetLat = payload.lat as number
  const targetLng = payload.lng as number
  const radiusM = (payload.radius_m as number) ?? 30

  const distance = haversineDistance(playerLat, playerLng, targetLat, targetLng)

  if (distance > radiusM) {
    return { success: false, message: `Sei a ${Math.round(distance)}m dal punto. Avvicinati.` }
  }

  await completeTarget(episodeId, nodeId, targetId)
  return { success: true }
}

// ============================================================
// UTILS
// ============================================================

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000 // metri
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}