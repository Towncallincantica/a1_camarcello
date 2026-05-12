import { createClient } from '@/lib/supabase/server'
import { ADVENTURE_ID } from '@/lib/constants'
import ItemsClient from './ItemsClient'

export default async function ItemsPage() {
  const supabase = await createClient()

  const { data: items, error } = await supabase
    .from('items')
    .select('item_id, name, description, category, rarity, is_stackable, is_consumable, max_stack, claim_code, claim_limit, icon_url, custom_data')
    .eq('adventure_id', ADVENTURE_ID)
    .order('name', { ascending: true })

  if (error) {
    return (
      <div style={{ color: 'rgba(255,100,100,0.8)', padding: '1rem' }}>
        Errore: {error.message}
      </div>
    )
  }

  return <ItemsClient initialItems={items ?? []} />
}