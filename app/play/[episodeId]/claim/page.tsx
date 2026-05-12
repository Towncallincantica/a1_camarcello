import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ADVENTURE_ID } from '@/lib/constants'
import { ClaimForm } from './ClaimForm'

export default async function ClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ episodeId: string }>
  searchParams: Promise<{ targetId?: string; nodeId?: string }>
}) {
  const { episodeId } = await params
  const { targetId, nodeId } = await searchParams

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

  if (!targetId || !nodeId) redirect(`/play/${episodeId}`)

  // Carica il target e l'item associato
  const { data: target } = await supabase
    .from('targets')
    .select('target_id, payload')
    .eq('target_id', targetId)
    .eq('type', 'claim_item')
    .single()

  if (!target) redirect(`/play/${episodeId}`)

  const payload = target.payload as Record<string, unknown>
  const itemId = payload.item_id as string

  const { data: item } = await supabase
    .from('items')
    .select('item_id, name, description, rarity, is_consumable, category')
    .eq('item_id', itemId)
    .single()

  // Controlla se già riscattato
  const { data: alreadyClaimed } = await supabase
    .from('player_target_progress')
    .select('completed')
    .eq('player_id', player.player_id)
    .eq('target_id', targetId)
    .eq('completed', true)
    .single()

  return (
    <main style={{
      minHeight: '100vh',
      background: '#090807',
      color: '#e8e4dc',
      fontFamily: 'Georgia, serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <a
          href={`/play/${episodeId}`}
          style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', textDecoration: 'none', display: 'block', marginBottom: '2rem' }}
        >
          ← Indietro
        </a>

        <h1 style={{
          color: '#feeaa5',
          fontSize: '1rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: '2rem',
        }}>
          Oggetto Trovato
        </h1>

        {item ? (
          <ClaimForm
            episodeId={episodeId}
            nodeId={nodeId}
            targetId={targetId}
            item={item}
            alreadyClaimed={!!alreadyClaimed}
          />
        ) : (
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>Oggetto non disponibile.</p>
        )}
      </div>
    </main>
  )
}