import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ADVENTURE_ID } from '@/lib/constants'
import { InventoryClient } from './InventoryClient'

export default async function InventoryPage({
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
    .select('player_id')
    .eq('user_id', user.id)
    .eq('adventure_id', ADVENTURE_ID)
    .single()
  if (!player) redirect('/play')

  const { data: inventory } = await supabase
    .from('player_episode_inventory')
    .select('quantity, items ( item_id, name, description, rarity, category, icon_url, is_consumable, base_value )')
    .eq('player_id', player.player_id)
    .eq('episode_id', episodeId)

  type InventoryItem = {
    quantity: number
    items: {
      item_id: string
      name: string
      description: string | null
      rarity: string
      category: string | null
      icon_url: string | null
      is_consumable: boolean
      base_value: number | null
    } | null
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#090807',
      color: '#e8e4dc',
      fontFamily: 'Georgia, serif',
      paddingBottom: '6rem',
    }}>
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

      <InventoryClient
        episodeId={episodeId}
        playerId={player.player_id}
        inventory={(inventory ?? []) as unknown as InventoryItem[]}
      />
    </main>
  )
}