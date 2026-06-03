'use client'

// components/admin/PayloadFields.tsx
// Campi del payload da una RuleTypeDef. Controllato dal parent.
// entity_ref (item_id, progress_item_id) popolati da entityOptions.

import type { EntitySource, FieldDef, RuleTypeDef } from '@/lib/rules/schema'
import { C, inputStyle, labelStyle, helpStyle } from './adminTheme'

export type EntityOptions = Record<EntitySource, { value: string; label: string }[]>

interface Props {
  def: RuleTypeDef
  value: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
  entityOptions: EntityOptions
}

export function PayloadFields({ def, value, onChange, entityOptions }: Props) {
  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {def.fields.map((f) => (
        <Field
          key={f.key}
          field={f}
          value={value[f.key]}
          onChange={(v) => set(f.key, v)}
          entityOptions={entityOptions}
        />
      ))}
    </div>
  )
}

function Field({
  field,
  value,
  onChange,
  entityOptions,
}: {
  field: FieldDef
  value: unknown
  onChange: (v: unknown) => void
  entityOptions: EntityOptions
}) {
  const label = (
    <label style={labelStyle}>
      {field.label}
      {field.required && <span style={{ color: C.goldAction }}> *</span>}
    </label>
  )
  const help = field.help ? <p style={helpStyle}>{field.help}</p> : null

  if (field.widget === 'entity_ref') {
    const opts = field.source ? entityOptions[field.source] ?? [] : []
    return (
      <div>
        {label}
        <select style={inputStyle} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
          <option value="" style={{ background: '#111' }}>— seleziona —</option>
          {opts.map((o) => (
            <option key={o.value} value={o.value} style={{ background: '#111' }}>{o.label}</option>
          ))}
        </select>
        {opts.length === 0 && (
          <p style={{ ...helpStyle, color: C.goldDark }}>Nessun elemento disponibile. Creane uno prima.</p>
        )}
        {help}
      </div>
    )
  }

  if (field.widget === 'select') {
    return (
      <div>
        {label}
        <select style={inputStyle} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
          <option value="" style={{ background: '#111' }}>— seleziona —</option>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value} style={{ background: '#111' }}>{o.label}</option>
          ))}
        </select>
        {help}
      </div>
    )
  }

  if (field.widget === 'number') {
    return (
      <div>
        {label}
        <input
          type="number"
          style={inputStyle}
          value={value === undefined || value === null ? '' : String(value)}
          min={field.min}
          max={field.max}
          step={field.step}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        />
        {help}
      </div>
    )
  }

  if (field.widget === 'textarea') {
    return (
      <div>
        {label}
        <textarea
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
        {help}
      </div>
    )
  }

  return (
    <div>
      {label}
      <input
        type="text"
        style={inputStyle}
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
      />
      {help}
    </div>
  )
}