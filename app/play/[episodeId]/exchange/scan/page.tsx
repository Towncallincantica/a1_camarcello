import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ADVENTURE_ID } from '@/lib/constants'
import { ExchangeScanClient } from './ExchangeScanClient'

export default async function ExchangeScanPage({
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

  // Verifica join episodio
  const { data: stats } = await supabase
    .from('player_episode_stats')
    .select('player_id')
    .eq('player_id', player.player_id)
    .eq('episode_id', episodeId)
    .single()
  if (!stats) redirect(`/play/${episodeId}`)

  return (
    <main style={{
      minHeight: '100vh',
      background: '#090807',
      color: '#e8e4dc',
      fontFamily: 'Georgia, serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        flexShrink: 0,
      }}>
        <a
          href={`/play/${episodeId}`}
          style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', textDecoration: 'none' }}
        >
          ← Indietro
        </a>
        <span style={{ color: '#feeaa5', fontSize: '0.85rem', letterSpacing: '0.06em' }}>
          Scansiona Player
        </span>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        gap: '1.5rem',
      }}>
        <p style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: '0.85rem',
          textAlign: 'center',
          maxWidth: '280px',
          lineHeight: 1.6,
        }}>
          Inquadra il QR code del profilo di un altro giocatore per avviare uno scambio.
        </p>

        <ExchangeScanClient
          episodeId={episodeId}
          playerAId={player.player_id}
        />
      </div>
    </main>
  )
}