// lib/nodeVisibility.ts
// Logica condivisa di visibilità nodi (usata da page.tsx episodio e dalla
// pagina-nodo dedicata). Valutazione server-side delle conditions.

export type Condition = {
  condition_id: string
  type: string
  payload: Record<string, unknown> | null
}

/**
 * Un nodo è visibile se TUTTE le sue condizioni sono soddisfatte (AND).
 *   - progress_item    → il player possiede quel progress item (player_steps)
 *   - target_completed → quel target è completato
 *   - gps_location     → non valutabile a page-load (trattata come soddisfatta)
 * Tipi sconosciuti → non bloccano (true).
 * Nodo senza condizioni → sempre visibile.
 */
export function isNodeVisible(
  conditions: Condition[],
  ownedProgress: Set<string>,
  completedTargets: Set<string>
): boolean {
  for (const c of conditions) {
    const p = c.payload ?? {}
    if (c.type === 'progress_item') {
      if (!ownedProgress.has(p.progress_item_id as string)) return false
    } else if (c.type === 'target_completed') {
      if (!completedTargets.has(p.target_id as string)) return false
    }
    // gps_location e altri tipi: non bloccano (TODO valutazione live)
  }
  return true
}