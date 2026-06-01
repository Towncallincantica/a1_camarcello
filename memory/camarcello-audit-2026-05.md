---
name: camarcello-audit-2026-05
description: Key findings from the 2026-05-31 full code audit of the Ca' Marcello frontend
metadata:
  type: project
---

Full audit performed 2026-05-31. Critical issues found in the Ca' Marcello repo (single-frontend live-event app on shared Supabase):

- **Item-theft via exchange server actions**: `app/play/[episodeId]/exchange/actions.ts` uses the service-role client and trusts a client-supplied `playerId` with no `auth.getUser()` check. An attacker who knows a sessionId + the two player_ids can call `selectItem`/`confirmExchange` on behalf of either player and drain inventories. Same trust flaw in `deleteItem` (actions.ts + inventory/actions.ts).
- **Combine is fully client-trusted**: `combine/CombineClient.tsx` mutates `player_episode_inventory` directly from the browser (anon client). RLS `pei_insert_self` lets a player insert ANY item_id/quantity → free items / economy cheat.
- **Stored XSS via display_name**: `components/MapView.tsx` `playerMarkerHtml()` interpolates the unsanitized `display_name` into a Leaflet `divIcon` HTML string → executes in every nearby player's (and admin's) map view.
- **Realtime GPS fan-out**: `MapView`/`MapWrapper` subscribe to `player_current_location` table-wide (no filter, cross-adventure). `GPSUploader` is mounted twice (both play layouts → 2× write rate). Top scalability bottleneck at 200-500 players.
- (Verified NOT bugs: DB indexing is actually complete; `ExchangeRedirectListener.tsx` is messy with debug logs but valid; `sendMessage` is not used. Don't re-report these.)
- **Privacy**: RLS `pcl_select_all` = `true` exposes every player's raw GPS to anyone with the public anon key. `player_select_all`, `pes_select_all`, `team_messages messages_select_team` are also `qual:true`.
- **Admin server actions** (e.g. `episodes/[id]/editor/actions.ts`) use service role and only rely on the `/admin` layout gate; the actions themselves don't re-check `is_admin()`, so they're independently invokable.
- **`is_admin()`** is not adventure-scoped → admin of any adventure on the shared DB can write all frontends' content.

See [[camarcello-audit-context]] conventions before acting on any of these.
