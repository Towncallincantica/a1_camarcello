'use client'

// components/admin/RuleListEditor.tsx
// Lista target/effect di un nodo (kind parametrico). Salvataggio immediato.
// Righe salvate read-only (card) + pannello "Aggiungi" distinto.

import { useState, useTransition } from 'react'
import {
  getActiveRuleTypes,
  getRuleDef,
  buildDefaultPayload,
  validatePayload,
  type RuleKind,
} from '@/lib/rules/schema'
import { createRule, deleteRule, type RuleRow } from '@/app/admin/rules/ruleActions'
import { PayloadFields, type EntityOptions } from './PayloadFields'
import { C, inputStyle, labelStyle, btnStyle } from './adminTheme'

interface Props {
  kind: RuleKind
  episodeId: string
  nodeId: string
  initialRows: RuleRow[]
  entityOptions: EntityOptions
  title?: string
}

export function RuleListEditor({ kind, episodeId, nodeId, initialRows, entityOptions, title }: Props) {
  const activeTypes = getActiveRuleTypes(kind)
  const [rows, setRows] = useState<RuleRow[]>(initialRows)
  const [pending, startTransition] = useTransition()
  const [errors, setErrors] = useState<string[]>([])

  const [draftType, setDraftType] = useState<string>(activeTypes[0]?.type ?? '')
  const [draftPayload, setDraftPayload] = useState<Record<string, unknown>>(
    activeTypes[0] ? buildDefaultPayload(activeTypes[0]) : {}
  )
  const draftDef = getRuleDef(kind, draftType)

  function onChangeType(type: string) {
    setDraftType(type)
    const def = getRuleDef(kind, type)
    setDraftPayload(def ? buildDefaultPayload(def) : {})
    setErrors([])
  }

  function onAdd() {
    if (!draftDef) return
    const errs = validatePayload(draftDef, draftPayload)
    if (errs.length) { setErrors(errs); return }
    setErrors([])
    startTransition(async () => {
      const res = await createRule(kind, { episodeId, nodeId, type: draftType, payload: draftPayload })
      if (res.success) {
        setRows((r) => [...r, res.row])
        setDraftPayload(draftDef ? buildDefaultPayload(draftDef) : {})
      } else setErrors(res.errors)
    })
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const res = await deleteRule(kind, id)
      if (res.success) setRows((r) => r.filter((x) => x.id !== id))
      else setErrors([res.error ?? 'Eliminazione fallita'])
    })
  }

  return (
    <section
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: '1.25rem',
      }}
    >
      {title && (
        <h3
          style={{
            margin: '0 0 0.9rem',
            fontFamily: C.cinzel,
            fontSize: '0.95rem',
            fontWeight: 400,
            letterSpacing: '0.04em',
            color: C.gold,
          }}
        >
          {title}
        </h3>
      )}

      {/* Righe salvate */}
      {rows.length === 0 ? (
        <p style={{ fontSize: '0.82rem', color: C.muted2 }}>Nessuna voce.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {rows.map((row) => (
            <li
              key={row.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '1rem',
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: '0.65rem 0.85rem',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.gold }}>
                  {getRuleDef(kind, row.type)?.label ?? row.type}
                </div>
                <PayloadSummary kind={kind} row={row} entityOptions={entityOptions} />
              </div>
              <button style={{ ...btnStyle('danger'), flexShrink: 0, padding: '0.3rem 0.7rem', fontSize: '0.72rem' }} onClick={() => onDelete(row.id)} disabled={pending}>
                Elimina
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Pannello aggiungi */}
      {activeTypes.length === 0 ? (
        <p style={{ marginTop: '0.9rem', fontSize: '0.8rem', color: C.goldDark }}>Nessun tipo attivo disponibile.</p>
      ) : (
        <div
          style={{
            marginTop: '1.1rem',
            background: 'rgba(255,255,255,0.015)',
            border: `1px dashed ${C.borderStrong}`,
            borderRadius: 8,
            padding: '1rem',
          }}
        >
          <div style={{ fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted2, marginBottom: '0.75rem' }}>
            Aggiungi voce
          </div>

          <label style={labelStyle}>Tipo</label>
          <select style={inputStyle} value={draftType} onChange={(e) => onChangeType(e.target.value)}>
            {activeTypes.map((t) => (
              <option key={t.type} value={t.type} style={{ background: '#111' }}>{t.label}</option>
            ))}
          </select>
          {draftDef?.description && (
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.72rem', color: C.muted2 }}>{draftDef.description}</p>
          )}

          <div style={{ marginTop: '0.85rem' }}>
            {draftDef && (
              <PayloadFields def={draftDef} value={draftPayload} onChange={setDraftPayload} entityOptions={entityOptions} />
            )}
          </div>

          {errors.length > 0 && (
            <ul style={{ margin: '0.85rem 0 0', padding: 0, listStyle: 'none' }}>
              {errors.map((e, i) => (
                <li key={i} style={{ fontSize: '0.74rem', color: C.danger }}>{e}</li>
              ))}
            </ul>
          )}

          <button style={{ ...btnStyle('primary'), marginTop: '0.95rem' }} onClick={onAdd} disabled={pending}>
            {pending ? 'Salvataggio…' : 'Aggiungi'}
          </button>
        </div>
      )}
    </section>
  )
}

function PayloadSummary({ kind, row, entityOptions }: { kind: RuleKind; row: RuleRow; entityOptions: EntityOptions }) {
  const def = getRuleDef(kind, row.type)
  if (!def) return null
  const parts = def.fields
    .map((f) => {
      const v = row.payload[f.key]
      if (v === undefined || v === null || v === '') return null
      let display = String(v)
      if (f.widget === 'entity_ref' && f.source) {
        const opt = (entityOptions[f.source] ?? []).find((o) => o.value === v)
        if (opt) display = opt.label
      }
      return `${f.label}: ${display}`
    })
    .filter(Boolean)
  if (parts.length === 0) return null
  return <div style={{ marginTop: '0.2rem', fontSize: '0.76rem', color: C.muted }}>{parts.join('  ·  ')}</div>
}