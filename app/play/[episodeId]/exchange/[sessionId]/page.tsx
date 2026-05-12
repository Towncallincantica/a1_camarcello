import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { redirect, notFound } from 'next/navigation'
import { ADVENTURE_ID } from '@/lib/constants'
import { ExchangeSessionClient } from './ExchangeSessionClient'

export default async function ExchangeSessionPage({
  params,
}: {
  params: Promise<{ episodeId: string; sessionId: string }>
}) {
  const { episodeId, sessionId } = await params
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

  const service = createServiceRoleClient()

  const { data: session } = await service
    .from('exchange_sessions')
    .select('session_id, status, player_a_id, player_b_id, player_a_item_id, player_b_item_id, player_a_confirmed, player_b_confirmed')
    .eq('session_id', sessionId)
    .single()

  if (!session) notFound()

  const isA = session.player_a_id === player.player_id
  const isB = session.player_b_id === player.player_id
  if (!isA && !isB) redirect(`/play/${episodeId}`)

  // Info sull'altro player
  const otherPlayerId = isA ? session.player_b_id : session.player_a_id
  const { data: otherPlayer } = await service
    .from('player')
    .select('display_name')
    .eq('player_id', otherPlayerId)
    .single()

  // Inventario del player corrente
  const { data: myInventory } = await service
    .from('player_episode_inventory')
    .select('quantity, items ( item_id, name, rarity, category )')
    .eq('player_id', player.player_id)
    .eq('episode_id', episodeId)

  // Item selezionati (se già scelti)
  const myItemId = isA ? session.player_a_item_id : session.player_b_item_id
  const otherItemId = isA ? session.player_b_item_id : session.player_a_item_id

  const [myItemData, otherItemData] = await Promise.all([
    myItemId
      ? service.from('items').select('item_id, name, rarity, category').eq('item_id', myItemId).single()
      : Promise.resolve({ data: null }),
    otherItemId
      ? service.from('items').select('item_id, name, rarity, category').eq('item_id', otherItemId).single()
      : Promise.resolve({ data: null }),
  ])

  const myConfirmed = isA ? session.player_a_confirmed : session.player_b_confirmed
  const otherConfirmed = isA ? session.player_b_confirmed : session.player_a_confirmed

  type InventoryItem = {
    quantity: number
    items: { item_id: string; name: string; rarity: string; category: string | null } | null
  }

  type ItemInfo = { item_id: string; name: string; rarity: string; category: string | null }

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
          ← Indietro
        </a>
        <span style={{ color: '#feeaa5', fontSize: '0.85rem', letterSpacing: '0.06em' }}>
          Scambio con {otherPlayer?.display_name ?? '?'}
        </span>
      </div>

      <ExchangeSessionClient
        episodeId={episodeId}
        sessionId={sessionId}
        playerId={player.player_id}
        displayName={player.display_name}
        otherDisplayName={otherPlayer?.display_name ?? '?'}
        isA={isA}
        status={session.status}
        myConfirmed={myConfirmed}
        otherConfirmed={otherConfirmed}
        myItem={myItemData.data as ItemInfo | null}
        otherItem={otherItemData.data as ItemInfo | null}
        inventory={(myInventory ?? []) as unknown as InventoryItem[]}
      />
    </main>
  )
}