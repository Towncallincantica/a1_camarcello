'use server'

import { createServiceRoleClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'

export async function deleteItem(
  episodeId: string,
  playerId: string,
  itemId: string
) {
  const service = createServiceRoleClient()

  const { data: inv } = await service
    .from('player_episode_inventory')
    .select('quantity')
    .eq('player_id', playerId)
    .eq('item_id', itemId)
    .eq('episode_id', episodeId)
    .single()

  if (!inv) return

  if (inv.quantity <= 1) {
    await service
      .from('player_episode_inventory')
      .delete()
      .eq('player_id', playerId)
      .eq('item_id', itemId)
      .eq('episode_id', episodeId)
  } else {
    await service
      .from('player_episode_inventory')
      .update({ quantity: inv.quantity - 1 })
      .eq('player_id', playerId)
      .eq('item_id', itemId)
      .eq('episode_id', episodeId)
  }

  revalidatePath(`/play/${episodeId}/inventory`)
}