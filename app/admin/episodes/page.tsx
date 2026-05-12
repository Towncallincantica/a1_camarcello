import { createClient } from '@/lib/supabase/server'
import { ADVENTURE_ID } from '@/lib/constants'
import EpisodesClient from './EpisodesClient'

export default async function EpisodesPage() {
  const supabase = await createClient()

  const { data: episodes, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('adventure_id', ADVENTURE_ID)
    .order('episode_number', { ascending: true, nullsFirst: false })

  if (error) {
    return (
      <div style={{ color: 'rgba(255,100,100,0.8)', padding: '1rem' }}>
        Errore nel caricamento episodi: {error.message}
      </div>
    )
  }

  return <EpisodesClient initialEpisodes={episodes ?? []} />
}