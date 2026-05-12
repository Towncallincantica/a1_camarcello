import { createClient } from '@/lib/supabase/server'
import { ADVENTURE_ID } from '@/lib/constants'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import NodesClient from './NodesClient'

export default async function EpisodeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: episode } = await supabase
    .from('episodes')
    .select('*')
    .eq('episode_id', id)
    .eq('adventure_id', ADVENTURE_ID)
    .single()

  if (!episode) notFound()

  const { data: nodes } = await supabase
    .from('content_nodes')
    .select('*')
    .eq('episode_id', id)
    .order('created_at', { ascending: true })

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '1.5rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
        <Link href="/admin/episodes" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>
          Episodi
        </Link>
        <span style={{ margin: '0 0.5rem' }}>›</span>
        <span style={{ color: '#feeaa5' }}>{episode.name}</span>
      </div>

      {/* Episode header */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        padding: '1.25rem 1.5rem',
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '1rem',
      }}>
        <div>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.2rem', color: '#feeaa5', fontWeight: 400 }}>
            {episode.name}
          </h1>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>
            {episode.start_datetime && (
              <span>📅 {new Date(episode.start_datetime).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })}</span>
            )}
            {episode.physical_location && <span>📍 {episode.physical_location}</span>}
            <span style={{ color: episode.is_published ? '#feeaa5' : 'rgba(255,255,255,0.2)' }}>
              {episode.is_published ? '● Pubblicato' : '○ Bozza'}
            </span>
            <span style={{ color: episode.is_active ? '#64d278' : 'rgba(255,255,255,0.2)' }}>
              {episode.is_active ? '● Attivo' : '○ Inattivo'}
            </span>
          </div>
        </div>
        <Link href="/admin/episodes" style={{
          fontSize: '0.8rem',
          color: 'rgba(255,255,255,0.3)',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}>
          ← Tutti gli episodi
        </Link>
      </div>

      {/* Nodes section */}
      <NodesClient id={id} initialNodes={nodes ?? []} />
    </div>
  )
}