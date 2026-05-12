import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ADVENTURE_ID } from '@/lib/constants'
import { CombineClient } from './CombineClient'

export default async function CombinePage({
  params,
}: {
  params: Promise<{ episodeId: string }>
}) {
  const { episodeId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: player } = await supabase
    .from('player')
    .select('player_id, display_name')
    .eq('user_id', user.id)
    .eq('adventure_id', ADVENTURE_ID)
    .single()
  if (!player) redirect('/play')

  const [
    { data: inventory },
    { data: recipes },
  ] = await Promise.all([
    supabase
      .from('player_episode_inventory')
      .select('quantity, items ( item_id, name, description, rarity, category, is_consumable )')
      .eq('player_id', player.player_id)
      .eq('episode_id', episodeId),

    supabase
      .from('combination_recipes')
      .select(`
        recipe_id, name, result_message, is_active,
        combination_recipe_inputs ( item_id, items ( item_id, name, rarity ) ),
        combination_recipe_outputs ( item_id, quantity, items ( item_id, name, rarity ) )
      `)
      .eq('adventure_id', ADVENTURE_ID)
      .eq('is_active', true),
  ])

  type InventoryItem = {
    quantity: number
    items: {
      item_id: string
      name: string
      description: string | null
      rarity: string
      category: string | null
      is_consumable: boolean
    } | null
  }

  type Recipe = {
    recipe_id: string
    name: string
    result_message: string
    is_active: boolean
    combination_recipe_inputs: {
      item_id: string
      items: { item_id: string; name: string; rarity: string } | null
    }[]
    combination_recipe_outputs: {
      item_id: string
      quantity: number
      items: { item_id: string; name: string; rarity: string } | null
    }[]
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#090807',
      color: '#e8e4dc',
      fontFamily: 'Georgia, serif',
      paddingBottom: '6rem',
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}>
        <a
          href={`/play/${episodeId}`}
          style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', textDecoration: 'none' }}
        >
          ← Storia
        </a>
        <span style={{ color: '#feeaa5', fontSize: '0.85rem', letterSpacing: '0.06em' }}>
          Inventario
        </span>
      </div>

      <CombineClient
        episodeId={episodeId}
        playerId={player.player_id}
        inventory={(inventory ?? []) as unknown as InventoryItem[]}
        recipes={(recipes ?? []) as unknown as Recipe[]}
      />
    </main>
  )
}