import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ADVENTURE_ID } from '@/lib/constants'
import { CodeEntryForm } from './CodeEntryForm'

export default async function CodePage({
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

  // Se targetId non è passato, cerca tutti i target code_entry dell'episodio
  const query = supabase
    .from('targets')
    .select('target_id, node_id, payload')
    .eq('episode_id', episodeId)
    .in('type', ['code_entry', 'qr_scan'])

  if (targetId) query.eq('target_id', targetId)

  const { data: targets } = await query

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
          marginBottom: '0.5rem',
        }}>
          Inserisci Codice
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '2rem' }}>
          Digita il codice che hai trovato.
        </p>

        <CodeEntryForm
          episodeId={episodeId}
          targetId={targetId ?? null}
          nodeId={nodeId ?? null}
          targets={targets ?? []}
        />
      </div>
    </main>
  )
}