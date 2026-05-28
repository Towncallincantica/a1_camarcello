import { createClient } from '@/lib/supabase/server'
import { ADVENTURE_ID } from '@/lib/constants'
import MarkersClient from './MarkersClient'

export default async function MarkersPage() {
  const supabase = await createClient()

  const { data: markers, error: markersError } = await supabase
    .from('map_markers')
    .select('marker_id, name, description, content_html, lat, lng, radius_meters, marker_shape, geometry, marker_type, interaction_type, interaction_data, icon, is_active, visibility_rules, sort_order, episode_id, custom_data')
    .eq('adventure_id', ADVENTURE_ID)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (markersError) {
    return (
      <div style={{ color: 'rgba(255,100,100,0.8)', padding: '1rem' }}>
        Errore: {markersError.message}
      </div>
    )
  }

  // Episodi per il selettore
  const { data: episodes } = await supabase
    .from('episodes')
    .select('episode_id, name')
    .eq('adventure_id', ADVENTURE_ID)
    .eq('is_active', true)
    .order('name', { ascending: true })

  // Items per interaction_data claim_item
  const { data: items } = await supabase
    .from('items')
    .select('item_id, name, icon_url, rarity')
    .eq('adventure_id', ADVENTURE_ID)
    .order('name', { ascending: true })

  return (
    <MarkersClient
      initialMarkers={markers ?? []}
      episodes={episodes ?? []}
      items={items ?? []}
    />
  )
}