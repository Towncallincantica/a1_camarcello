import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ADVENTURE_ID } from '@/lib/constants'
import EpisodeGameplay from './EpisodeGameplay'

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ episodeId: string }>
}) {
  const { episodeId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: episode }, { data: player }] = await Promise.all([
    supabase
      .from('episodes')
      .select('episode_id, name, physical_location, start_datetime, join_mode')
      .eq('episode_id', episodeId)
      .eq('adventure_id', ADVENTURE_ID)
      .eq('is_active', true)
      .single(),
    supabase
      .from('player')
      .select('player_id, display_name, level, experience_points')
      .eq('user_id', user.id)
      .eq('adventure_id', ADVENTURE_ID)
      .single(),
  ])

  if (!episode) redirect('/play')
  if (!player) redirect('/play')

  const [{ data: stats }, { data: nodes }, { data: progress }, { data: inventory }] = await Promise.all([
    supabase
      .from('player_episode_stats')
      .select('player_id, team_id')
      .eq('player_id', player.player_id)
      .eq('episode_id', episodeId)
      .single(),
    supabase
      .from('content_nodes')
      .select(`
        node_id, name, node_category, content_html,
        targets ( target_id, type, payload ),
        conditions ( condition_id, type, payload )
      `)
      .eq('episode_id', episodeId)
      .order('created_at', { ascending: true }),
    supabase
      .from('player_target_progress')
      .select('target_id, completed')
      .eq('player_id', player.player_id)
      .eq('episode_id', episodeId),
    supabase
      .from('player_episode_inventory')
      .select('item_id, quantity, items ( item_id, name, description, image_url )')
      .eq('player_id', player.player_id)
      .eq('episode_id', episodeId)
      .gt('quantity', 0),
  ])

  // Team info + messaggi iniziali
  let teamId: string | null = stats?.team_id ?? null
  let teamName: string | null = null
  let initialMessages: {
    message_id: string
    content: string
    created_at: string
    player_id: string
    player: { display_name: string } | null
  }[] = []

  if (teamId) {
    const [{ data: team }, { data: messages }] = await Promise.all([
      supabase
        .from('teams')
        .select('name')
        .eq('team_id', teamId)
        .single(),
      supabase
        .from('team_messages')
        .select('message_id, content, created_at, player_id, player:player_id ( display_name )')
        .eq('team_id', teamId)
        .eq('episode_id', episodeId)
        .order('created_at', { ascending: true })
        .limit(50),
    ])
    teamName = team?.name ?? null
    initialMessages = (messages ?? []).map(m => {
      const p = Array.isArray(m.player) ? m.player[0] : m.player
      return {
        message_id: m.message_id,
        content: m.content,
        created_at: m.created_at,
        player_id: m.player_id,
        player: p ? { display_name: (p as { display_name: string }).display_name } : null,
      }
    })
  }

  const completedTargets = new Set(
    (progress ?? []).filter(p => p.completed).map(p => p.target_id)
  )

  // Fix inventario: Supabase restituisce items come oggetto singolo (join 1:1)
  const inventoryItems = (inventory ?? []).map(row => {
    const item = (Array.isArray(row.items) ? row.items[0] : row.items) as {
      item_id: string
      name: string
      description: string | null
      image_url: string | null
    } | null
    if (!item) return null
    return {
      item_id: item.item_id,
      name: item.name,
      description: item.description ?? null,
      image_url: item.image_url ?? null,
      quantity: row.quantity,
    }
  }).filter((x): x is NonNullable<typeof x> => x !== null)

  async function joinEpisode() {
    'use server'
    const supabase = await createClient()
    await supabase.from('player_episode_stats').insert({
      player_id: player!.player_id,
      episode_id: episodeId,
    })
    const { redirect } = await import('next/navigation')
    redirect(`/play/${episodeId}`)
  }

  return (
    <EpisodeGameplay
      episodeId={episodeId}
      currentUserId={user.id}
      episode={{
        name: episode.name,
        physical_location: episode.physical_location ?? null,
        start_datetime: episode.start_datetime ?? null,
      }}
      player={{
        player_id: player.player_id,
        display_name: player.display_name,
        level: player.level,
        experience_points: player.experience_points,
      }}
      teamId={teamId}
      teamName={teamName}
      initialMessages={initialMessages}
      nodes={(nodes ?? []).map(n => ({
        node_id: n.node_id,
        name: n.name,
        node_category: n.node_category,
        content_html: n.content_html ?? null,
        targets: (n.targets ?? []).map((t: { target_id: string; type: string; payload: unknown }) => ({
          target_id: t.target_id,
          type: t.type,
          payload: (t.payload as Record<string, unknown>) ?? null,
        })),
      }))}
      completedTargets={completedTargets}
      hasJoined={!!stats}
      onJoin={joinEpisode}
      inventoryItems={inventoryItems}
    />
  )
}