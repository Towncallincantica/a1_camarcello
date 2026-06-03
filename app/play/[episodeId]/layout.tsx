import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ADVENTURE_ID } from '@/lib/constants'
import GPSUploader from '@/components/GPSUploader'
import { ExchangeRedirectListener } from '@/components/ExchangeRedirectListener'
import EpisodeContextSetter from '@/components/EpisodeContextSetter'
import { PlayerSubBar } from '@/components/PlayerSubBar'

export default async function EpisodeLayout({
  children,
  params,
}: {
  children: React.ReactNode
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

  return (
    <>
      <EpisodeContextSetter episodeId={episodeId} />
      <ExchangeRedirectListener
        playerId={player.player_id}
        episodeId={episodeId}
      />
      <PlayerSubBar playerId={player.player_id} episodeId={episodeId} />
      {children}
    </>
  )
}