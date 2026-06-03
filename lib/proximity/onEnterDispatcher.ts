// lib/proximity/onEnterDispatcher.ts
// Pure client module — NO 'use server'. Decides what happens when a player
// enters a marker's proximity radius. Cosmetic effects run locally (0 DB);
// persistent effects delegate to server actions passed in by the caller.

// ---- Action types (shape stored in map_markers.on_enter_actions JSONB) ----

export type OnEnterAction =
  | { type: 'reveal_marker'; marker_id: string }
  | { type: 'show_narrative'; title?: string; content: string; once?: boolean }
  | { type: 'apply_effect'; give_item_id?: string; xp?: number; status?: string }
  | { type: 'complete_target'; target_id: string }

// ---- Handlers the caller wires up (EpisodeGameplay) ----

export interface OnEnterHandlers {
  // Cosmetic — local, synchronous, 0 DB
  revealMarker: (markerId: string) => void
  showNarrative: (n: { title?: string; content: string; key: string; once: boolean }) => void
  // Persistent — async. Receives the SOURCE markerId; the server re-reads the
  // marker's apply_effect actions from the DB (client payload is not trusted).
  applyEffect: (markerId: string) => Promise<void>
  completeTarget: (targetId: string) => Promise<void>
}

// ---- Dispatch ----
// markerId is the SOURCE marker being entered (used to build narrative dedupe key).

export async function dispatchOnEnter(
  markerId: string,
  actions: OnEnterAction[] | null | undefined,
  handlers: OnEnterHandlers
): Promise<void> {
  if (!Array.isArray(actions) || actions.length === 0) return

  // apply_effect actions are processed server-side in one call (by markerId),
  // so we only need to know whether at least one is present.
  let hasPersistentEffect = false

  for (const action of actions) {
    try {
      switch (action.type) {
        case 'reveal_marker':
          handlers.revealMarker(action.marker_id)
          break

        case 'show_narrative':
          handlers.showNarrative({
            title: action.title,
            content: action.content,
            key: `${markerId}:narrative`,
            once: action.once ?? false,
          })
          break

        case 'apply_effect':
          hasPersistentEffect = true
          break

        case 'complete_target':
          await handlers.completeTarget(action.target_id)
          break

        default:
          // Unknown action type — ignore gracefully (forward-compatible)
          console.warn('[onEnter] unknown action type', action)
      }
    } catch (err) {
      // One failing action must not block the rest
      console.error('[onEnter] action failed', action, err)
    }
  }

  // Single authoritative server call: re-reads & applies all apply_effect actions.
  if (hasPersistentEffect) {
    try {
      await handlers.applyEffect(markerId)
    } catch (err) {
      console.error('[onEnter] applyEffect failed', err)
    }
  }
}