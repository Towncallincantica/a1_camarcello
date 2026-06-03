// lib/rules/schema.ts
// ============================================================================
// RULES SCHEMA REGISTRY — single source of truth
// ----------------------------------------------------------------------------
// Descrive, per ogni `type` di target / effect / condition, la forma del
// payload e come l'admin deve renderizzarne il form (dropdown, campi tipizzati,
// picker da elenco). Le pagine admin leggono SOLO da qui: niente JSON a mano.
//
// REGOLA D'ORO: questo file deve rispecchiare esattamente l'executor.
//   - Effects  → applyNodeEffects()  in app/play/[episodeId]/actions.ts
//   - Targets  → verifyCode()/verifyGPS() in app/play/[episodeId]/actions.ts
//   - Conditions → NESSUN executor ancora. I tipi qui sotto hanno active:false
//     e l'admin NON deve permettere di salvarli finché non sono implementati.
//
// Se cambi un payload qui, cambialo anche nell'executor (e viceversa).
// ============================================================================

// ─── Tipi base per descrivere i campi di un payload ────────────────────────

/** Sorgenti per i dropdown che pescano righe reali dal DB. */
export type EntitySource = 'items' | 'progress_items'

export type FieldWidget =
  | 'text'        // input testo libero
  | 'number'      // input numerico
  | 'textarea'    // testo multilinea
  | 'select'      // dropdown a opzioni statiche (field.options)
  | 'entity_ref'  // dropdown popolato da DB (field.source)

export interface FieldDef {
  /** Chiave nel payload JSONB. */
  key: string
  label: string
  widget: FieldWidget
  required?: boolean
  /** Valore di default usato da buildDefaultPayload(). */
  default?: string | number | null
  /** Solo per widget 'entity_ref': quale tabella popola il dropdown. */
  source?: EntitySource
  /** Solo per widget 'select': opzioni statiche. */
  options?: { value: string; label: string }[]
  /** Vincoli numerici (widget 'number'). */
  min?: number
  max?: number
  step?: number
  /** Testo d'aiuto sotto il campo. */
  help?: string
}

export interface RuleTypeDef {
  /** Valore salvato in <tabella>.type. */
  type: string
  label: string
  description: string
  fields: FieldDef[]
  /**
   * true  = l'executor legge davvero questo type in gioco → salvabile.
   * false = scaffolding pronto ma nessun effetto reale → NON salvabile
   *         (l'admin lo mostra disabilitato / etichettato "non attivo").
   */
  active: boolean
}

export type RuleKind = 'target' | 'effect' | 'condition'

// ─── TARGETS ────────────────────────────────────────────────────────────────
// Cosa il player deve FARE per completare il nodo.
// Executor: verifyCode() / verifyGPS().

export const TARGET_TYPES: RuleTypeDef[] = [
  {
    type: 'code_entry',
    label: 'Inserimento codice',
    description: 'Il player digita un codice segreto.',
    active: true,
    fields: [
      {
        key: 'code',
        label: 'Codice atteso',
        widget: 'text',
        required: true,
        help: 'Confronto case-insensitive, spazi esterni ignorati.',
      },
    ],
  },
  {
    type: 'qr_scan',
    label: 'Scansione QR',
    description: 'Il player scansiona un QR specifico.',
    active: true,
    fields: [
      {
        key: 'qr_code',
        label: 'Contenuto QR atteso',
        widget: 'text',
        required: true,
        help: 'Il testo codificato nel QR. Confronto case-insensitive.',
      },
    ],
  },
  {
    type: 'gps',
    label: 'Prossimità GPS',
    description: 'Il player deve trovarsi entro un raggio da un punto.',
    active: true,
    fields: [
      { key: 'lat', label: 'Latitudine', widget: 'number', required: true, step: 0.000001 },
      { key: 'lng', label: 'Longitudine', widget: 'number', required: true, step: 0.000001 },
      {
        key: 'radius_meters',
        label: 'Raggio (metri)',
        widget: 'number',
        required: true,
        default: 30,
        min: 1,
        help: 'Distanza massima dal punto per validare.',
      },
    ],
  },
]

// ─── EFFECTS ──────────────────────────────────────────────────────────────
// Cosa SUCCEDE quando tutti i target del nodo sono completati.
// Executor: applyNodeEffects().

export const EFFECT_TYPES: RuleTypeDef[] = [
  {
    type: 'give_item',
    label: 'Assegna oggetto',
    description: "Aggiunge un oggetto all'inventario del player.",
    active: true,
    fields: [
      { key: 'item_id', label: 'Oggetto', widget: 'entity_ref', source: 'items', required: true },
      { key: 'quantity', label: 'Quantità', widget: 'number', default: 1, min: 1 },
    ],
  },
  {
    type: 'give_xp',
    label: 'Assegna XP',
    description: 'Aggiunge punti esperienza al player.',
    active: true,
    fields: [
      { key: 'amount', label: 'XP', widget: 'number', required: true, min: 0 },
    ],
  },
  {
    type: 'give_status',
    label: 'Applica stato',
    description: 'Applica un effetto di stato (eventualmente a tempo).',
    active: true,
    fields: [
      {
        key: 'status_type',
        label: 'Tipo di stato',
        widget: 'text',
        required: true,
        help: 'Chiave libera (es. "benedetto", "maledetto"). Deve coincidere con quanto gestito in gioco.',
      },
      {
        key: 'duration_minutes',
        label: 'Durata (minuti)',
        widget: 'number',
        min: 1,
        help: 'Lascia vuoto per stato permanente.',
      },
    ],
  },
  {
    type: 'give_progress_item',
    label: 'Sblocca tappa narrativa',
    description: 'Registra il completamento di una tappa (progress item).',
    active: true,
    fields: [
      {
        key: 'progress_item_id',
        label: 'Tappa',
        widget: 'entity_ref',
        source: 'progress_items',
        required: true,
      },
    ],
  },
]

// ─── CONDITIONS ─────────────────────────────────────────────────────────────
// Gating: quando un nodo è visibile/disponibile.
// ⚠️ NESSUN EXECUTOR ANCORA. Tutti active:false → scaffolding, non salvabili.
// I payload qui sotto sono una PROPOSTA: vanno confermati quando si implementa
// l'executor delle condizioni (potrebbero cambiare).

export const CONDITION_TYPES: RuleTypeDef[] = [
  {
    type: 'has_item',
    label: 'Possiede oggetto',
    description: "Il player ha un certo oggetto nell'inventario.",
    active: false,
    fields: [
      { key: 'item_id', label: 'Oggetto', widget: 'entity_ref', source: 'items', required: true },
      { key: 'min_quantity', label: 'Quantità minima', widget: 'number', default: 1, min: 1 },
    ],
  },
  {
    type: 'has_progress_item',
    label: 'Ha sbloccato tappa',
    description: 'Il player ha completato una certa tappa narrativa.',
    active: false,
    fields: [
      {
        key: 'progress_item_id',
        label: 'Tappa',
        widget: 'entity_ref',
        source: 'progress_items',
        required: true,
      },
    ],
  },
  {
    type: 'node_completed',
    label: 'Nodo completato',
    description: 'Un altro nodo è già stato completato dal player.',
    active: false,
    fields: [
      // node_id risolto via dropdown nodi dell'episodio nel form (sorgente locale).
      { key: 'node_id', label: 'Nodo richiesto', widget: 'text', required: true, help: 'ID nodo (dropdown nodi episodio).' },
    ],
  },
  {
    type: 'team_size',
    label: 'Dimensione squadra',
    description: 'La squadra del player ha almeno N membri.',
    active: false,
    fields: [
      { key: 'min_members', label: 'Membri minimi', widget: 'number', required: true, min: 1, default: 2 },
    ],
  },
]

// ─── Lookup per kind ─────────────────────────────────────────────────────────

const REGISTRY: Record<RuleKind, RuleTypeDef[]> = {
  target: TARGET_TYPES,
  effect: EFFECT_TYPES,
  condition: CONDITION_TYPES,
}

/** Tutti i tipi di un kind (incl. non attivi). */
export function getRuleTypes(kind: RuleKind): RuleTypeDef[] {
  return REGISTRY[kind]
}

/** Solo i tipi salvabili (active) — usali per popolare i dropdown attivi. */
export function getActiveRuleTypes(kind: RuleKind): RuleTypeDef[] {
  return REGISTRY[kind].filter((t) => t.active)
}

/** Definizione di un singolo type, o undefined se sconosciuto. */
export function getRuleDef(kind: RuleKind, type: string): RuleTypeDef | undefined {
  return REGISTRY[kind].find((t) => t.type === type)
}

// ─── Helper per i form admin ──────────────────────────────────────────────

/** Payload iniziale con i default dichiarati (campi senza default → omessi). */
export function buildDefaultPayload(def: RuleTypeDef): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of def.fields) {
    if (f.default !== undefined) out[f.key] = f.default
  }
  return out
}

/**
 * Valida un payload contro la definizione. Ritorna lista di errori (vuota = ok).
 * Coercizione numerica inclusa: "30" → 30 per i widget number.
 */
export function validatePayload(
  def: RuleTypeDef,
  payload: Record<string, unknown>
): string[] {
  const errors: string[] = []
  for (const f of def.fields) {
    const v = payload[f.key]
    const empty = v === undefined || v === null || v === ''

    if (f.required && empty) {
      errors.push(`"${f.label}" è obbligatorio.`)
      continue
    }
    if (empty) continue

    if (f.widget === 'number') {
      const n = typeof v === 'number' ? v : Number(v)
      if (Number.isNaN(n)) {
        errors.push(`"${f.label}" deve essere un numero.`)
      } else {
        if (f.min !== undefined && n < f.min) errors.push(`"${f.label}" ≥ ${f.min}.`)
        if (f.max !== undefined && n > f.max) errors.push(`"${f.label}" ≤ ${f.max}.`)
      }
    }
  }
  return errors
}

/**
 * Normalizza il payload per il salvataggio: tiene solo le chiavi dichiarate,
 * converte i number, scarta i campi vuoti non required.
 */
export function normalizePayload(
  def: RuleTypeDef,
  raw: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of def.fields) {
    const v = raw[f.key]
    const empty = v === undefined || v === null || v === ''
    if (empty) continue
    out[f.key] = f.widget === 'number' ? Number(v) : v
  }
  return out
}