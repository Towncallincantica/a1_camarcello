import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ADVENTURE_ID } from '@/lib/constants'
import { isNodeVisible, type Condition } from '@/lib/nodeVisibility'

// Design system player (inline)
const C = {
  bg: '#090807',
  gold: '#feeaa5',
  goldAction: '#e8af48',
  text: '#e8e4dc',
  muted: 'rgba(255,255,255,0.42)',
  success: '#64d278',
  border: 'rgba(255,255,255,0.07)',
  fontCinzel: "'Cinzel', Georgia, serif",
  fontGaramond: "'EB Garamond', Georgia, serif",
}

const TARGET_LABELS: Record<string, string> = {
  code_entry: 'Codice',
  qr_scan: 'QR Code',
  gps_location: 'Posizione GPS',
  claim_item: 'Raccogli oggetto',
}

function ctaStyle(color: string, border: string): React.CSSProperties {
  return {
    fontFamily: C.fontCinzel,
    fontSize: '0.62rem',
    letterSpacing: '0.06em',
    color,
    border: `1px solid ${border}`,
    borderRadius: 3,
    padding: '5px 12px',
    background: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    display: 'inline-block',
  }
}

export default async function NodePage({
  params,
}: {
  params: Promise<{ episodeId: string; nodeId: string }>
}) {
  const { episodeId, nodeId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Episodio valido per questa avventura + player
  const [{ data: episode }, { data: player }] = await Promise.all([
    supabase
      .from('episodes')
      .select('episode_id')
      .eq('episode_id', episodeId)
      .eq('adventure_id', ADVENTURE_ID)
      .eq('is_active', true)
      .single(),
    supabase
      .from('player')
      .select('player_id')
      .eq('user_id', user.id)
      .eq('adventure_id', ADVENTURE_ID)
      .single(),
  ])

  if (!episode) redirect('/play')
  if (!player) redirect('/play')

  // Nodo + conditions + targets, scoped all'episodio
  const { data: node } = await supabase
    .from('content_nodes')
    .select(`
      node_id, name, node_category, content_html,
      targets ( target_id, type, payload ),
      conditions ( condition_id, type, payload )
    `)
    .eq('node_id', nodeId)
    .eq('episode_id', episodeId)
    .single()

  // Nodo inesistente o di un altro episodio → torna alle missioni
  if (!node) redirect(`/play/${episodeId}`)

  // Progresso target + progress item posseduti (per valutare visibilità)
  const [{ data: progress }, { data: steps }] = await Promise.all([
    supabase
      .from('player_target_progress')
      .select('target_id, completed')
      .eq('player_id', player.player_id)
      .eq('episode_id', episodeId),
    supabase
      .from('player_steps')
      .select('progress_item_id')
      .eq('player_id', player.player_id)
      .eq('episode_id', episodeId),
  ])

  const completedTargets = new Set(
    (progress ?? []).filter(p => p.completed).map(p => p.target_id)
  )
  const ownedProgress = new Set(
    (steps ?? []).map(s => s.progress_item_id as string)
  )

  // Gate: se le condizioni non sono soddisfatte, il nodo non è accessibile
  const visible = isNodeVisible(
    (node.conditions ?? []) as Condition[],
    ownedProgress,
    completedTargets
  )
  if (!visible) redirect(`/play/${episodeId}`)

  const targets = (node.targets ?? []) as {
    target_id: string
    type: string
    payload: Record<string, unknown> | null
  }[]

  const allDone =
    targets.length > 0 && targets.every(t => completedTargets.has(t.target_id))

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      color: C.text,
      fontFamily: C.fontGaramond,
      padding: '1rem 1.1rem 3rem',
    }}>
      {/* Back link */}
      <Link
        href={`/play/${episodeId}`}
        style={{
          fontFamily: C.fontCinzel,
          fontSize: '0.62rem',
          letterSpacing: '0.08em',
          color: C.muted,
          textDecoration: 'none',
          display: 'inline-block',
          marginBottom: '1.25rem',
        }}
      >
        ← Missioni
      </Link>

      {/* Header nodo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: '0.5rem',
      }}>
        <h1 style={{
          fontFamily: C.fontCinzel,
          fontSize: '1rem',
          letterSpacing: '0.08em',
          color: allDone ? C.success : C.gold,
          textTransform: 'uppercase',
          margin: 0,
        }}>
          {node.name}
        </h1>
        {allDone && (
          <span style={{
            fontFamily: C.fontCinzel,
            fontSize: '0.55rem',
            letterSpacing: '0.06em',
            color: C.success,
            whiteSpace: 'nowrap',
          }}>
            ✓ FATTO
          </span>
        )}
      </div>

      {/* Contenuto */}
      {node.content_html && (
        <div
          style={{
            fontSize: '0.98rem',
            color: C.text,
            lineHeight: 1.65,
            margin: '0.75rem 0 1.5rem',
          }}
          // content_html: HTML autored da admin (sanitizzare lato admin, vedi T12)
          dangerouslySetInnerHTML={{ __html: node.content_html }}
        />
      )}

      {/* Targets */}
      {targets.length > 0 && (
        <div style={{
          borderTop: `1px solid ${C.border}`,
          paddingTop: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <span style={{
            fontFamily: C.fontCinzel,
            fontSize: '0.55rem',
            letterSpacing: '0.12em',
            color: C.muted,
            textTransform: 'uppercase',
            marginBottom: 2,
          }}>
            Obiettivi
          </span>

          {targets.map(target => {
            const completed = completedTargets.has(target.target_id)
            return (
              <div key={target.target_id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '8px 10px',
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${C.border}`,
                borderRadius: 5,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    color: completed ? C.success : 'rgba(255,255,255,0.2)',
                    fontSize: '0.9rem',
                  }}>
                    {completed ? '✓' : '○'}
                  </span>
                  <span style={{
                    fontFamily: C.fontCinzel,
                    fontSize: '0.64rem',
                    letterSpacing: '0.04em',
                    color: C.muted,
                  }}>
                    {TARGET_LABELS[target.type] ?? target.type}
                  </span>
                </div>

                {!completed && target.type === 'gps_location' && (
                  <Link href={`/play/${episodeId}/map`} style={ctaStyle('#a5feb8', 'rgba(165,254,184,0.28)')}>
                    Mappa
                  </Link>
                )}
                {!completed && (target.type === 'code_entry' || target.type === 'qr_scan') && (
                  <Link
                    href={`/play/${episodeId}/code?targetId=${target.target_id}&nodeId=${node.node_id}`}
                    style={ctaStyle(C.goldAction, 'rgba(232,175,72,0.28)')}
                  >
                    {target.type === 'qr_scan' ? 'Scansiona' : 'Codice'}
                  </Link>
                )}
                {!completed && target.type === 'claim_item' && (
                  <Link
                    href={`/play/${episodeId}/claim?targetId=${target.target_id}&nodeId=${node.node_id}`}
                    style={ctaStyle(C.gold, 'rgba(254,234,165,0.28)')}
                  >
                    Raccogli
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}