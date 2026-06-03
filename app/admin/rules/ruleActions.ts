'use server'

// app/admin/rules/ruleActions.ts
// ============================================================================
// CRUD generico per targets / effects / conditions.
// Stessa forma di tabella (id, node_id, episode_id, type, payload) → un solo
// set di action parametrizzate su `kind`.
//
// Sicurezza:
//   - requireAdmin(): solo is_admin o is_event_organizer.
//   - scrittura via service role (bypassa RLS) DOPO il check admin.
//   - validazione/normalizzazione payload dal registry (lib/rules/schema).
//   - i type con active:false (conditions) sono RIFIUTATI lato server:
//     l'admin non può salvare regole che nessun executor legge.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import {
  getRuleDef,
  normalizePayload,
  validatePayload,
  type RuleKind,
  type RuleTypeDef,
} from '@/lib/rules/schema'

const TABLE: Record<RuleKind, string> = {
  target: 'targets',
  effect: 'effects',
  condition: 'conditions',
}
const ID_COL: Record<RuleKind, string> = {
  target: 'target_id',
  effect: 'effect_id',
  condition: 'condition_id',
}

export type RuleRow = {
  id: string
  type: string
  payload: Record<string, unknown>
}

export type RuleResult =
  | { success: true; row: RuleRow }
  | { success: false; errors: string[] }

// ─── Guard ──────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data } = await supabase
    .from('users')
    .select('is_admin, is_event_organizer')
    .eq('user_id', user.id)
    .single()

  if (!data || !(data.is_admin || data.is_event_organizer)) {
    throw new Error('Forbidden')
  }
}

/** Valida il type (esistenza + attivo) e ritorna la def, o un errore. */
type ResolveResult =
  | { ok: true; def: RuleTypeDef }
  | { ok: false; error: string }

function resolveDef(kind: RuleKind, type: string): ResolveResult {
  const def = getRuleDef(kind, type)
  if (!def) return { ok: false, error: `Tipo "${type}" sconosciuto.` }
  if (!def.active) return { ok: false, error: `Tipo "${type}" non ancora attivo in gioco.` }
  return { ok: true, def }
}

/** Mappa una riga DB (con id_col variabile) al formato RuleRow uniforme. */
function toRuleRow(kind: RuleKind, raw: Record<string, unknown>): RuleRow {
  return {
    id: raw[ID_COL[kind]] as string,
    type: raw.type as string,
    payload: (raw.payload ?? {}) as Record<string, unknown>,
  }
}

// ─── CREATE ────────────────────────────────────────────────────────────────

export async function createRule(
  kind: RuleKind,
  input: {
    episodeId: string
    nodeId: string
    type: string
    payload: Record<string, unknown>
  }
): Promise<RuleResult> {
  await requireAdmin()

  const r = resolveDef(kind, input.type)
  if (!r.ok) return { success: false, errors: [r.error] }

  const errors = validatePayload(r.def, input.payload)
  if (errors.length) return { success: false, errors }

  const payload = normalizePayload(r.def, input.payload)
  const service = createServiceRoleClient()

  const { data, error } = await service
    .from(TABLE[kind])
    .insert({
      node_id: input.nodeId,
      episode_id: input.episodeId,
      type: input.type,
      payload,
    })
    .select()
    .single()

  if (error || !data) return { success: false, errors: [error?.message ?? 'Insert fallito'] }
  return { success: true, row: toRuleRow(kind, data) }
}

// ─── UPDATE ────────────────────────────────────────────────────────────────

export async function updateRule(
  kind: RuleKind,
  id: string,
  input: { type: string; payload: Record<string, unknown> }
): Promise<RuleResult> {
  await requireAdmin()

  const r = resolveDef(kind, input.type)
  if (!r.ok) return { success: false, errors: [r.error] }

  const errors = validatePayload(r.def, input.payload)
  if (errors.length) return { success: false, errors }

  const payload = normalizePayload(r.def, input.payload)
  const service = createServiceRoleClient()

  const { data, error } = await service
    .from(TABLE[kind])
    .update({ type: input.type, payload })
    .eq(ID_COL[kind], id)
    .select()
    .single()

  if (error || !data) return { success: false, errors: [error?.message ?? 'Update fallito'] }
  return { success: true, row: toRuleRow(kind, data) }
}

// ─── DELETE ────────────────────────────────────────────────────────────────

export async function deleteRule(
  kind: RuleKind,
  id: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()
  const service = createServiceRoleClient()

  const { error } = await service.from(TABLE[kind]).delete().eq(ID_COL[kind], id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── CONTENT NODE — aggiornamento contenuto HTML ─────────────────────────────
// onSave dell'editor WYSIWYG (ContentHtmlEditor).

export async function updateNodeContent(
  nodeId: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()
  const service = createServiceRoleClient()

  const { error } = await service
    .from('content_nodes')
    .update({ content_html: html, updated_at: new Date().toISOString() })
    .eq('node_id', nodeId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}