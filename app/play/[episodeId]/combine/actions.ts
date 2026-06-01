'use server'

import { requirePlayer } from '@/lib/auth/requirePlayer'
import { revalidatePath } from 'next/cache'

export type CombineResult =
  | { success: true; message: string }
  | { success: false; error: string }

export async function combineItems(
  episodeId: string,
  recipeId: string
): Promise<CombineResult> {
  // Autenticazione (l'RPC ri-verifica comunque l'identità via auth.uid())
  const { supabase } = await requirePlayer()

  const { data, error } = await supabase.rpc('combine_items', {
    p_episode_id: episodeId,
    p_recipe_id: recipeId,
  })

  if (error) return { success: false, error: error.message }

  const res = data as CombineResult
  if (res?.success) {
    revalidatePath(`/play/${episodeId}/combine`)
    revalidatePath(`/play/${episodeId}/inventory`)
  }
  return res
}