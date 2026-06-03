'use client'

import type { OnEnterAction } from '@/lib/proximity/onEnterDispatcher'

// Drop-in controlled editor for the two new marker fields.
// Wire it into your existing marker form:
//
//   <MarkerProximityEditor
//     proximityRadiusM={form.proximity_radius_m}
//     onProximityRadiusChange={(v) => setForm(f => ({ ...f, proximity_radius_m: v }))}
//     actions={form.on_enter_actions}
//     onActionsChange={(a) => setForm(f => ({ ...f, on_enter_actions: a }))}
//     markers={allMarkers}   // [{ marker_id, name }]
//     items={allItems}       // [{ item_id, name }]
//   />

type Option = { id: string; name: string }

interface Props {
  proximityRadiusM: number | null
  onProximityRadiusChange: (value: number | null) => void
  actions: OnEnterAction[]
  onActionsChange: (actions: OnEnterAction[]) => void
  markers: { marker_id: string; name: string }[]
  items: { item_id: string; name: string }[]
}

const ACTION_LABELS: Record<OnEnterAction['type'], string> = {
  reveal_marker: 'Rivela marker',
  show_narrative: 'Mostra narrativa',
  apply_effect: 'Applica effetto (item)',
  complete_target: 'Completa target',
}

function defaultAction(type: OnEnterAction['type']): OnEnterAction {
  switch (type) {
    case 'reveal_marker': return { type, marker_id: '' }
    case 'show_narrative': return { type, content: '', once: false }
    case 'apply_effect': return { type, give_item_id: '' }
    case 'complete_target': return { type, target_id: '' }
  }
}

export default function MarkerProximityEditor({
  proximityRadiusM,
  onProximityRadiusChange,
  actions,
  onActionsChange,
  markers,
  items,
}: Props) {
  const hasProximity = proximityRadiusM != null

  const update = (i: number, patch: Partial<OnEnterAction>) => {
    onActionsChange(actions.map((a, k) => (k === i ? { ...a, ...patch } as OnEnterAction : a)))
  }
  const remove = (i: number) => onActionsChange(actions.filter((_, k) => k !== i))
  const add = () => onActionsChange([...actions, defaultAction('show_narrative')])
  const changeType = (i: number, type: OnEnterAction['type']) =>
    onActionsChange(actions.map((a, k) => (k === i ? defaultAction(type) : a)))

  const markerOptions: Option[] = markers.map(m => ({ id: m.marker_id, name: m.name }))
  const itemOptions: Option[] = items.map(it => ({ id: it.item_id, name: it.name }))

  return (
    <div className="space-y-4 rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <h3 className="text-sm font-medium text-amber-200/90">Trigger di prossimità</h3>

      {/* Raggio */}
      <label className="flex items-center gap-3 text-sm text-neutral-300">
        <input
          type="checkbox"
          checked={hasProximity}
          onChange={e => onProximityRadiusChange(e.target.checked ? 10 : null)}
          className="h-4 w-4 accent-amber-300"
        />
        Attiva trigger quando il player entra nel raggio
      </label>

      {hasProximity && (
        <div className="flex items-center gap-2 pl-7 text-sm text-neutral-300">
          <span>Raggio</span>
          <input
            type="number"
            min={1}
            value={proximityRadiusM ?? 0}
            onChange={e => onProximityRadiusChange(Number(e.target.value) || 1)}
            className="w-20 rounded border border-white/10 bg-neutral-900 px-2 py-1 text-neutral-100"
          />
          <span className="text-neutral-500">metri</span>
        </div>
      )}

      {/* Azioni all'ingresso */}
      {hasProximity && (
        <div className="space-y-3 pl-7">
          <div className="text-xs uppercase tracking-wider text-neutral-500">
            Azioni all'ingresso
          </div>

          {actions.length === 0 && (
            <p className="text-sm text-neutral-500">Nessuna azione. Aggiungine una.</p>
          )}

          {actions.map((action, i) => (
            <div key={i} className="space-y-2 rounded-md border border-white/10 bg-neutral-900/60 p-3">
              <div className="flex items-center gap-2">
                <select
                  value={action.type}
                  onChange={e => changeType(i, e.target.value as OnEnterAction['type'])}
                  className="flex-1 rounded border border-white/10 bg-neutral-900 px-2 py-1 text-sm text-neutral-100"
                >
                  {(Object.keys(ACTION_LABELS) as OnEnterAction['type'][]).map(t => (
                    <option key={t} value={t}>{ACTION_LABELS[t]}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="rounded px-2 py-1 text-sm text-red-300 hover:bg-red-500/10"
                >
                  Rimuovi
                </button>
              </div>

              {/* Campi specifici per tipo */}
              {action.type === 'reveal_marker' && (
                <select
                  value={action.marker_id}
                  onChange={e => update(i, { marker_id: e.target.value })}
                  className="w-full rounded border border-white/10 bg-neutral-900 px-2 py-1 text-sm text-neutral-100"
                >
                  <option value="">— seleziona marker —</option>
                  {markerOptions.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              )}

              {action.type === 'show_narrative' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Titolo (opzionale)"
                    value={action.title ?? ''}
                    onChange={e => update(i, { title: e.target.value })}
                    className="w-full rounded border border-white/10 bg-neutral-900 px-2 py-1 text-sm text-neutral-100"
                  />
                  <textarea
                    placeholder="Testo narrativo"
                    value={action.content}
                    onChange={e => update(i, { content: e.target.value })}
                    rows={3}
                    className="w-full rounded border border-white/10 bg-neutral-900 px-2 py-1 text-sm text-neutral-100"
                  />
                  <label className="flex items-center gap-2 text-xs text-neutral-400">
                    <input
                      type="checkbox"
                      checked={action.once ?? false}
                      onChange={e => update(i, { once: e.target.checked })}
                      className="h-3.5 w-3.5 accent-amber-300"
                    />
                    Mostra una sola volta (per dispositivo)
                  </label>
                </div>
              )}

              {action.type === 'apply_effect' && (
                <select
                  value={action.give_item_id ?? ''}
                  onChange={e => update(i, { give_item_id: e.target.value })}
                  className="w-full rounded border border-white/10 bg-neutral-900 px-2 py-1 text-sm text-neutral-100"
                >
                  <option value="">— seleziona item da assegnare —</option>
                  {itemOptions.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              )}

              {action.type === 'complete_target' && (
                <input
                  type="text"
                  placeholder="target_id (sistema target non ancora attivo)"
                  value={action.target_id}
                  onChange={e => update(i, { target_id: e.target.value })}
                  className="w-full rounded border border-white/10 bg-neutral-900 px-2 py-1 text-sm text-neutral-100"
                />
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={add}
            className="rounded border border-amber-300/30 px-3 py-1.5 text-sm text-amber-200 hover:bg-amber-300/10"
          >
            + Aggiungi azione
          </button>
        </div>
      )}
    </div>
  )
}