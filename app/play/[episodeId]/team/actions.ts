'use server'

import { createClient } from '@/lib/supabase/server'
import { ADVENTURE_ID } from '@/lib/constants'
import { revalidatePath } from 'next/cache'

export type ActionResult = { ok: true } | { ok: false; error: string }

// Verifica can_join_team per il player loggato.
async function canJoinTeam(
  supabase: Awaited<ReturnType<typeof createClient>>,
  episodeId: string
): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'Non autenticato.'
  const { data: player } = await supabase
    .from('player').select('player_id')
    .eq('user_id', user.id).eq('adventure_id', ADVENTURE_ID).single()
  if (!player) return 'Profilo giocatore non trovato.'

  const { data: allowed, error } = await supabase.rpc('player_can', {
    p_player_id: player.player_id,
    p_episode_id: episodeId,
    p_capability: 'can_join_team',
  })
  if (error) return error.message
  if (allowed === false) return 'Un effetto attivo ti impedisce di entrare in una squadra.'
  return null
}

export async function createTeam(
  episodeId: string,
  name: string
): Promise<ActionResult> {
  const supabase = await createClient()

  const blocked = await canJoinTeam(supabase, episodeId)
  if (blocked) return { ok: false, error: blocked }

  const { error } = await supabase.rpc('create_team', {
    p_episode_id: episodeId,
    p_name: name,
  })
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/play/${episodeId}/team`)
  return { ok: true }
}

export async function joinTeam(
  episodeId: string,
  teamId: string
): Promise<ActionResult> {
  const supabase = await createClient()

  const blocked = await canJoinTeam(supabase, episodeId)
  if (blocked) return { ok: false, error: blocked }

  const { error } = await supabase.rpc('join_team', {
    p_episode_id: episodeId,
    p_team_id: teamId,
  })
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/play/${episodeId}/team`)
  return { ok: true }
}

export async function leaveTeam(episodeId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase.rpc('leave_team', {
    p_episode_id: episodeId,
  })
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/play/${episodeId}/team`)
  return { ok: true }
}