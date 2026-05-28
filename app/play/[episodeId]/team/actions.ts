'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createTeam(
  episodeId: string,
  playerId: string,
  formData: FormData
) {
  const supabase = await createClient()
  const name = formData.get('name') as string

  const { data: team, error } = await supabase
    .from('teams')
    .insert({ episode_id: episodeId, name, created_by_player_id: playerId })
    .select('team_id')
    .single()

  if (error) throw new Error(error.message)

  await Promise.all([
    supabase
      .from('player_episode_stats')
      .update({ team_id: team.team_id })
      .eq('player_id', playerId)
      .eq('episode_id', episodeId),
    supabase
      .from('team_members')
      .insert({ team_id: team.team_id, player_id: playerId }),
  ])

  revalidatePath(`/play/${episodeId}/team`)
  redirect(`/play/${episodeId}/team`)
}

export async function joinTeam(
  episodeId: string,
  playerId: string,
  formData: FormData
) {
  const supabase = await createClient()
  const teamId = formData.get('team_id') as string

  await Promise.all([
    supabase
      .from('player_episode_stats')
      .update({ team_id: teamId })
      .eq('player_id', playerId)
      .eq('episode_id', episodeId),
    supabase
      .from('team_members')
      .insert({ team_id: teamId, player_id: playerId }),
  ])

  revalidatePath(`/play/${episodeId}/team`)
  redirect(`/play/${episodeId}/team`)
}

export async function leaveTeam(
  episodeId: string,
  playerId: string,
) {
  const supabase = await createClient()

  const { data: stats } = await supabase
    .from('player_episode_stats')
    .select('team_id')
    .eq('player_id', playerId)
    .eq('episode_id', episodeId)
    .single()

  if (!stats?.team_id) return

  await Promise.all([
    supabase
      .from('team_members')
      .delete()
      .eq('team_id', stats.team_id)
      .eq('player_id', playerId),
    supabase
      .from('player_episode_stats')
      .update({ team_id: null })
      .eq('player_id', playerId)
      .eq('episode_id', episodeId),
  ])

  revalidatePath(`/play/${episodeId}/team`)
  redirect(`/play/${episodeId}/team`)
}