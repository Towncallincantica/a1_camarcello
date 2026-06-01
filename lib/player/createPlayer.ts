import type { SupabaseClient } from '@supabase/supabase-js'
import { ADVENTURE_ID } from '@/lib/constants'

const NAME_MIN = 2
const NAME_MAX = 24
// Lettere (anche accentate), cifre, spazi e pochi segni innocui.
const NAME_ALLOWED = /^[\p{L}\p{N} _.'-]+$/u

export type NameValidation =
  | { ok: true; value: string }
  | { ok: false; error: string }

export function validateDisplayName(raw: unknown): NameValidation {
  const value = String(raw ?? '').trim().replace(/\s+/g, ' ')
  if (value.length < NAME_MIN) return { ok: false, error: 'Il nome è troppo corto.' }
  if (value.length > NAME_MAX) return { ok: false, error: `Massimo ${NAME_MAX} caratteri.` }
  if (!NAME_ALLOWED.test(value)) return { ok: false, error: 'Il nome contiene caratteri non ammessi.' }
  return { ok: true, value }
}

/**
 * Crea il profilo player per l'utente sull'avventura corrente.
 * Idempotente: se esiste già (UNIQUE user_id+adventure_id) non fallisce.
 * Lancia Error con messaggio leggibile se il nome non è valido.
 */
export async function createPlayerForUser(
  supabase: SupabaseClient,
  userId: string,
  rawDisplayName: unknown
): Promise<void> {
  const v = validateDisplayName(rawDisplayName)
  if (!v.ok) throw new Error(v.error)

  // Esiste già? non sovrascrivere
  const { data: existing } = await supabase
    .from('player')
    .select('player_id')
    .eq('user_id', userId)
    .eq('adventure_id', ADVENTURE_ID)
    .maybeSingle()
  if (existing) return

  const { error } = await supabase.from('player').insert({
    user_id: userId,
    adventure_id: ADVENTURE_ID,
    display_name: v.value,
  })

  // 23505 = unique_violation → race: il player è stato creato in parallelo, ok
  if (error && error.code !== '23505') throw new Error(error.message)
}