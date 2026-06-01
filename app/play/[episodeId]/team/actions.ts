'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Identità derivata server-side dentro le RPC (auth.uid()): nessun playerId dal client.

export async function createTeam(episodeId: string, formData: FormData) {
  const supabase = await createClient()
  const name = (formData.get('name') as string) ?? ''

  const { error } = await supabase.rpc('create_team', {
    p_episode_id: episodeId,
    p_name: name,
  })
  if (error) throw new Error(error.message)

  revalidatePath(`/play/${episodeId}/team`)
  redirect(`/play/${episodeId}/team`)
}

export async function joinTeam(episodeId: string, formData: FormData) {
  const supabase = await createClient()
  const teamId = formData.get('team_id') as string

  const { error } = await supabase.rpc('join_team', {
    p_episode_id: episodeId,
    p_team_id: teamId,
  })
  if (error) throw new Error(error.message)

  revalidatePath(`/play/${episodeId}/team`)
  redirect(`/play/${episodeId}/team`)
}

export async function leaveTeam(episodeId: string) {
  const supabase = await createClient()

  const { error } = await supabase.rpc('leave_team', {
    p_episode_id: episodeId,
  })
  if (error) throw new Error(error.message)

  revalidatePath(`/play/${episodeId}/team`)
  redirect(`/play/${episodeId}/team`)
}