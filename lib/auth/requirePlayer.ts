import { createClient } from '@/lib/supabase/server'
import { ADVENTURE_ID } from '@/lib/constants'

export class AuthError extends Error {
  constructor(message = 'unauthorized') {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Risolve l'identità lato server dalla sessione Supabase.
 * MAI fidarsi di un player_id passato dal client: usare SEMPRE questo helper.
 *
 * @returns { user, player } dove player è il profilo per ADVENTURE_ID
 * @throws AuthError se non autenticato o senza profilo player per questa avventura
 */
export async function requirePlayer() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new AuthError()

  const { data: player, error } = await supabase
    .from('player')
    .select('player_id, user_id, adventure_id, display_name')
    .eq('user_id', user.id)
    .eq('adventure_id', ADVENTURE_ID)
    .single()

  if (error || !player) throw new AuthError('player profile not found')

  return { supabase, user, player }
}