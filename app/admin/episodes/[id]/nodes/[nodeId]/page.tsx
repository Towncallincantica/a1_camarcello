// app/admin/episodes/[id]/nodes/[nodeId]/page.tsx
// Pagina admin di un singolo nodo: contenuto WYSIWYG + target + effetti.

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { ContentHtmlEditor } from '@/components/admin/ContentHtmlEditor'
import { RuleListEditor } from '@/components/admin/RuleListEditor'
import { updateNodeContent } from '@/app/admin/rules/ruleActions'
import type { RuleRow } from '@/app/admin/rules/ruleActions'
import type { EntityOptions } from '@/components/admin/PayloadFields'
import { C } from '@/components/admin/adminTheme'

export default async function NodeAdminPage({
  params,
}: {
  params: Promise<{ id: string; nodeId: string }>
}) {
  const { id: episodeId, nodeId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('users')
    .select('is_admin, is_event_organizer')
    .eq('user_id', user.id)
    .single()
  if (!me || !(me.is_admin || me.is_event_organizer)) redirect('/play')

  const service = createServiceRoleClient()

  const { data: node } = await service
    .from('content_nodes')
    .select('node_id, name, node_category, content_html, episode_id')
    .eq('node_id', nodeId)
    .single()
  if (!node || node.episode_id !== episodeId) notFound()

  const { data: episode } = await service
    .from('episodes')
    .select('adventure_id, name')
    .eq('episode_id', episodeId)
    .single()
  if (!episode) notFound()

  const [{ data: targetRows }, { data: effectRows }, { data: items }, { data: progressItems }] =
    await Promise.all([
      service.from('targets').select('target_id, type, payload').eq('node_id', nodeId).eq('episode_id', episodeId),
      service.from('effects').select('effect_id, type, payload').eq('node_id', nodeId).eq('episode_id', episodeId),
      service.from('items').select('item_id, name').or(`episode_id.eq.${episodeId},adventure_id.eq.${episode.adventure_id}`).order('name'),
      service.from('progress_items').select('progress_item_id, name').eq('episode_id', episodeId).order('name'),
    ])

  const targets: RuleRow[] = (targetRows ?? []).map((r) => ({ id: r.target_id, type: r.type, payload: (r.payload ?? {}) as Record<string, unknown> }))
  const effects: RuleRow[] = (effectRows ?? []).map((r) => ({ id: r.effect_id, type: r.type, payload: (r.payload ?? {}) as Record<string, unknown> }))

  const entityOptions: EntityOptions = {
    items: (items ?? []).map((i) => ({ value: i.item_id, label: i.name })),
    progress_items: (progressItems ?? []).map((p) => ({ value: p.progress_item_id, label: p.name })),
  }

  const saveContent = updateNodeContent.bind(null, nodeId)

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '1.5rem 1.25rem 4rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <header>
        <Link
          href={`/admin/episodes/${episodeId}`}
          style={{ fontSize: '0.75rem', color: C.muted, textDecoration: 'none', letterSpacing: '0.04em' }}
        >
          ← {episode.name}
        </Link>
        <h1 style={{ margin: '0.5rem 0 0.3rem', fontFamily: C.cinzel, fontSize: '1.6rem', fontWeight: 400, color: C.gold }}>
          {node.name}
        </h1>
        <div style={{ display: 'inline-block', fontSize: '0.7rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: C.muted2 }}>
          {node.node_category}
        </div>
      </header>

      {/* Contenuto */}
      <section style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '1.25rem' }}>
        <h2 style={{ margin: '0 0 0.9rem', fontFamily: C.cinzel, fontSize: '0.95rem', fontWeight: 400, letterSpacing: '0.04em', color: C.gold }}>
          Contenuto
        </h2>
        <ContentHtmlEditor initialHtml={node.content_html ?? ''} onSave={saveContent} />
      </section>

      <RuleListEditor kind="target" episodeId={episodeId} nodeId={nodeId} initialRows={targets} entityOptions={entityOptions} title="Obiettivi (target)" />
      <RuleListEditor kind="effect" episodeId={episodeId} nodeId={nodeId} initialRows={effects} entityOptions={entityOptions} title="Effetti al completamento" />
    </div>
  )
}