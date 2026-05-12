import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { DeleteButton } from '@/app/admin/components/DeleteButton'
import { ConditionForm } from '../components/ConditionForm'
import { TargetForm } from '../components/TargetForm'
import { EffectForm } from '../components/EffectForm'
import {
  updateNode,
  deleteNode,
  createCondition,
  deleteCondition,
  createTarget,
  deleteTarget,
  createEffect,
  deleteEffect,
} from '../actions'

export default async function EditNodePage({
  params,
}: {
  params: Promise<{ id: string; nodeId: string }>
}) {
  const { id, nodeId } = await params
  const supabase = await createClient()

  const [
    { data: node },
    { data: conditions },
    { data: targets },
    { data: effects },
    { data: progressItems },
    { data: episode },
  ] = await Promise.all([
    supabase.from('content_nodes').select('*').eq('node_id', nodeId).single(),
    supabase.from('conditions').select('*').eq('node_id', nodeId),
    supabase.from('targets').select('*').eq('node_id', nodeId),
    supabase.from('effects').select('*').eq('node_id', nodeId),
    supabase.from('progress_items').select('*').eq('episode_id', id),
    supabase.from('episodes').select('adventure_id').eq('episode_id', id).single(),
  ])

  if (!node) notFound()

  const { data: items } = await supabase
    .from('items')
    .select('item_id, name, rarity, episode_id, adventure_id')
    .or(
      `episode_id.eq.${id},adventure_id.eq.${episode?.adventure_id},and(episode_id.is.null,adventure_id.is.null)`
    )
    .order('name', { ascending: true })

  const updateWithIds = updateNode.bind(null, id, nodeId)
  const deleteWithIds = deleteNode.bind(null, id, nodeId)
  const createConditionWithIds = createCondition.bind(null, id, nodeId)
  const createTargetWithIds = createTarget.bind(null, id, nodeId)
  const createEffectWithIds = createEffect.bind(null, id, nodeId)

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/admin/episodes/${id}`} className="text-gray-400 hover:text-white text-sm">
          ← Editor
        </Link>
        <h2 className="text-2xl font-bold">Edit Node</h2>
      </div>

      {/* NODE FORM */}
      <section className="bg-gray-900 rounded-xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Node</h3>
        <form action={updateWithIds} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
            <input
              name="name"
              required
              defaultValue={node.name}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <select
              name="node_category"
              defaultValue={node.node_category}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="main_story">Main Story</option>
              <option value="side_quest">Side Quest</option>
              <option value="exploration">Exploration</option>
              <option value="social">Social</option>
              <option value="combat">Combat</option>
              <option value="puzzle">Puzzle</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Content (HTML)</label>
            <textarea
              name="content_html"
              rows={8}
              defaultValue={node.content_html}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
          >
            Save Node
          </button>
        </form>
      </section>

      {/* CONDITIONS */}
      <section className="bg-gray-900 rounded-xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Conditions{' '}
          <span className="text-gray-600 font-normal">(AND logic — all must be true to unlock)</span>
        </h3>

        {conditions && conditions.length > 0 && (
          <div className="space-y-2 mb-4">
            {conditions.map((c) => (
              <div key={c.condition_id} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
                <div>
                  <span className="text-xs text-indigo-400 font-medium">{c.type}</span>
                  <pre className="text-xs text-gray-400 mt-1">{JSON.stringify(c.payload, null, 2)}</pre>
                </div>
                <form action={deleteCondition.bind(null, id, nodeId, c.condition_id)}>
                  <button type="submit" className="text-xs text-red-400 hover:text-red-300">
                    Remove
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <ConditionForm action={createConditionWithIds} progressItems={progressItems ?? []} />
      </section>

      {/* TARGETS */}
      <section className="bg-gray-900 rounded-xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Targets{' '}
          <span className="text-gray-600 font-normal">(AND logic — all must complete)</span>
        </h3>

        {targets && targets.length > 0 && (
          <div className="space-y-2 mb-4">
            {targets.map((t) => (
              <div key={t.target_id} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
                <div>
                  <span className="text-xs text-green-400 font-medium">{t.type}</span>
                  <pre className="text-xs text-gray-400 mt-1">{JSON.stringify(t.payload, null, 2)}</pre>
                </div>
                <form action={deleteTarget.bind(null, id, nodeId, t.target_id)}>
                  <button type="submit" className="text-xs text-red-400 hover:text-red-300">
                    Remove
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <TargetForm action={createTargetWithIds} />
      </section>

      {/* EFFECTS */}
      <section className="bg-gray-900 rounded-xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Effects{' '}
          <span className="text-gray-600 font-normal">(triggered on node completion)</span>
        </h3>

        {effects && effects.length > 0 && (
          <div className="space-y-2 mb-4">
            {effects.map((e) => (
              <div key={e.effect_id} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
                <div>
                  <span className="text-xs text-yellow-400 font-medium">{e.type}</span>
                  <pre className="text-xs text-gray-400 mt-1">{JSON.stringify(e.payload, null, 2)}</pre>
                </div>
                <form action={deleteEffect.bind(null, id, nodeId, e.effect_id)}>
                  <button type="submit" className="text-xs text-red-400 hover:text-red-300">
                    Remove
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <EffectForm
          action={createEffectWithIds}
          progressItems={progressItems ?? []}
          items={items ?? []}
        />
      </section>

      {/* DANGER ZONE */}
      <div className="pt-4 border-t border-gray-800">
        <h3 className="text-sm font-medium text-red-400 mb-4">Danger Zone</h3>
        <DeleteButton action={deleteWithIds} label="Node" />
      </div>
    </div>
  )
}