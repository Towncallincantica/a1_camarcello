# Ca' Marcello — Prioritized Remediation TO DO List
# (Architecture-aware revision)

> **Architecture:** single Supabase DB, multiple independent Next.js frontends, each scoped to one `NEXT_PUBLIC_ADVENTURE_ID`.
> **Target:** hundreds of concurrent players, November 2026 live event.
> Attack one item at a time with Claude, in order.
> Each item is self-contained and Claude-actionable.

---

## BLOCK 0 — RLS FOUNDATION
## (prerequisite for everything else in the multi-frontend model)

> The architecture document states: "Le RLS policies filtrano per player_id, che è legato all'adventure_id."
> This promise is what makes the multi-frontend isolation real. Without it, a user authenticated on
> camarcello.com could query data from other adventures directly via the Supabase JS client.
> The codebase bypasses RLS with service role everywhere, which means RLS either doesn't exist
> or has never been validated. This must be fixed before the platform has multiple real frontends.

---

### 0. Implement and verify Row Level Security policies for all player-facing tables

**Approach:** Supabase dashboard → Authentication → Policies, then validate via migration file.

**Problem:** The entire multi-frontend isolation model relies on RLS preventing cross-adventure data access. The current codebase uses the service role client for most player-facing operations, bypassing RLS entirely. If an authenticated user queries the Supabase API directly (which they can, using the public anon key visible in the browser), they can read data from any adventure.

**Tables that need RLS policies (at minimum):**

| Table | Required policy |
|-------|----------------|
| `player` | Users can only read/write their own player records (`user_id = auth.uid()`) |
| `player_episode_inventory` | Players can only read inventory where `player_id` matches their own player |
| `player_episode_stats` | Players can only read/write their own stats |
| `player_target_progress` | Players can only read/write their own progress |
| `player_steps` | Players can only read/write their own steps |
| `player_current_location` | Players can only write their own location (`user_id = auth.uid()`); all players in same episode can read |
| `player_status_effects` | Players can only read their own status effects |
| `team_messages` | Players can insert messages only for their own player_id; read only messages in their team |
| `exchange_sessions` | Players can only read sessions where they are player_a or player_b |
| `episodes` | Read-only for all authenticated users (scoped to adventure_id on the frontend) |
| `content_nodes` | Read-only for all authenticated users |
| `items` | Read-only for all authenticated users |
| `combination_recipes` | Read-only for all authenticated users |

**Policy pattern for player-owned tables:**
```sql
-- Example: player_episode_inventory
ALTER TABLE player_episode_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players read own inventory"
ON player_episode_inventory FOR SELECT
USING (
  player_id IN (
    SELECT player_id FROM player WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Players write own inventory"
ON player_episode_inventory FOR ALL
USING (
  player_id IN (
    SELECT player_id FROM player WHERE user_id = auth.uid()
  )
);
```

**Once RLS is in place:** player-facing server actions can switch from `createServiceRoleClient()` to `createClient()` (anon), relying on RLS for enforcement instead of application-level checks. The service role client should then be used ONLY in verified admin contexts.

---

## BLOCK 1 — CRITICAL SECURITY
## (must fix before any real testing)

> These are exploitable right now. Any authenticated player can cheat, steal items, or inject content.

---

### 1. Fix: server actions must derive playerId from auth session, never from parameters

**Files:** `app/play/[episodeId]/exchange/actions.ts`, `app/play/[episodeId]/team/actions.ts`, `app/play/[episodeId]/actions.ts`, `app/play/[episodeId]/inventory/actions.ts`

**Problem:** All server actions receive `playerId` as a parameter from the client and use it without verifying it matches the authenticated user. An attacker can pass any other player's ID.

**Fix:** Inside every server action, call `supabase.auth.getUser()` and then query `player` to get the real `player_id`. Remove `playerId` from all action signatures. Pattern:
```ts
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) throw new Error('Not authenticated')
const { data: player } = await supabase
  .from('player').select('player_id')
  .eq('user_id', user.id).eq('adventure_id', ADVENTURE_ID).single()
if (!player) throw new Error('Player not found')
// use player.player_id — never a client-provided value
```

---

### 2. Fix: CombineClient must not write to Supabase directly — move to a Server Action

**Files:** `app/play/[episodeId]/combine/CombineClient.tsx`, create `app/play/[episodeId]/combine/actions.ts`

**Problem:** The entire item combination logic runs on the client using the Supabase browser client. The `playerId` is a prop. Any player can call the Supabase API directly (anon key is public) to steal or duplicate items.

**Fix:** Create a `combineItems(episodeId: string, selectedItemIds: string[])` server action. The action derives `playerId` from `auth.getUser()`. `CombineClient` calls the action, never touches Supabase directly.

---

### 3. Fix: admin server actions must verify is_admin or is_event_organizer, scoped to adventure

**Files:** `app/admin/episodes/[id]/editor/actions.ts`, `app/admin/episodes/[id]/editor/[nodeId]/actions.ts`, `app/admin/broadcast/page.tsx` (sendAnnouncement), and all other admin action files.

**Problem:** Server actions are HTTP endpoints callable by any authenticated user. The admin layout renders only for admins, but server actions can be POSTed directly, bypassing the layout entirely. No action checks `is_admin`.

**Architecture note:** `is_admin` on the `users` table is a global super-admin flag (can admin all adventures). `is_event_organizer` is also currently global. For the MVP, global admin is acceptable since there is one team. When multiple adventures are live, add a per-adventure `adventure_organizers` join table.

**Fix:** Create `lib/auth/requireAdmin.ts`:
```ts
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('is_admin, is_event_organizer')
    .eq('user_id', user.id)
    .single()

  if (!userData?.is_admin && !userData?.is_event_organizer) {
    throw new Error('Forbidden')
  }

  return { user, isAdmin: userData.is_admin }
}
```
Call `await requireAdmin()` as the first line of every admin server action.

---

### 4. Fix: sendAnnouncement checks auth but not admin role

**File:** `app/admin/broadcast/page.tsx`

**Problem:** Any logged-in player can POST to `sendAnnouncement` and broadcast arbitrary messages to all episode players in real time.

**Fix:** Add `await requireAdmin()` (from item 3) at the top of `sendAnnouncement`, before any other logic.

---

### 5. Fix: GPS verification must compare against stored location, not self-reported coordinates

**File:** `app/play/[episodeId]/actions.ts` — `verifyGPS` function

**Problem:** `verifyGPS(episodeId, nodeId, targetId, playerLat, playerLng)` accepts coordinates from the client. Players pass the exact target coordinates to pass any GPS challenge from home.

**Fix:** Remove `playerLat`/`playerLng` from the function signature. Inside the action, query `player_current_location` for `auth.uid()` and use those stored coordinates for the distance check.

---

### 6. Fix: effect.type mismatch between admin editor and game engine (silent gameplay bug)

**Files:** `app/admin/episodes/[id]/editor/actions.ts` (createEffect), `app/play/[episodeId]/actions.ts` (applyNodeEffects)

**Problem:** The admin creates effects with type `"give_progress_item"` but the game engine checks for `"grant_progress_item"`. These effects are silently ignored — no player ever receives progress items from node completion.

**Fix:** Audit all effect type strings across both files. Standardize on one set of strings and update both files. Suggested canonical names: `grant_progress_item`, `grant_inventory_item`, `modify_stat`, `add_status_effect`.

---

### 7. Fix: delete duplicate editor actions.ts file

**Files:** `app/admin/episodes/[id]/editor/actions.ts` AND `app/admin/episodes/[id]/editor/[nodeId]/actions.ts`

**Problem:** These two files are 100% identical. They will inevitably diverge.

**Fix:** Delete `app/admin/episodes/[id]/editor/[nodeId]/actions.ts`. In `app/admin/episodes/[id]/editor/[nodeId]/page.tsx`, import actions from `'../actions'`.

---

### 8. Fix: delete duplicate deleteItem function

**Files:** `app/play/[episodeId]/actions.ts` and `app/play/[episodeId]/inventory/actions.ts`

**Problem:** `deleteItem` is copy-pasted identically in two files.

**Fix:** Keep only the one in `app/play/[episodeId]/actions.ts`. In `app/play/[episodeId]/inventory/InventoryClient.tsx`, import from `'../actions'`.

---

## BLOCK 2 — CRITICAL CORRECTNESS
## (game mechanics that don't work or corrupt data)

---

### 9. Fix: add database transactions to all inventory mutations

**Approach:** Create PostgreSQL functions via Supabase migration; call via `supabase.rpc()`.

**Problem:** All multi-step inventory operations (combine, exchange, grant) do multiple sequential Supabase queries with no transaction. Two concurrent requests reading `quantity = 1` both decrement to 0, allowing item duplication or items going negative.

**Functions to create:**
- `combine_items(p_player_id uuid, p_episode_id uuid, p_input_item_ids uuid[], p_recipe_id uuid) → json`
- `transfer_item(p_from_player_id uuid, p_to_player_id uuid, p_episode_id uuid, p_item_id uuid) → void`
- `grant_item(p_player_id uuid, p_episode_id uuid, p_item_id uuid, p_quantity int) → void`

Each function wrapped in an implicit transaction (PostgreSQL function = auto-transaction).

---

### 10. Fix: add unique constraint (user_id, adventure_id) on player table

**Approach:** Supabase migration.

**Problem:** The onboarding route does a plain `insert` with no conflict handling. Rapid double-submits or network retries create duplicate player records.

**Fix:**
```sql
ALTER TABLE player ADD CONSTRAINT player_user_adventure_unique UNIQUE (user_id, adventure_id);
```
Update the onboarding insert to use `ON CONFLICT ON CONSTRAINT player_user_adventure_unique DO NOTHING`.

---

### 11. Fix: add unique constraint (player_id, item_id, episode_id) on player_episode_inventory

**Approach:** Supabase migration.

**Problem:** Race conditions in `grant_item` and other paths can insert duplicate rows for the same player/item/episode.

**Fix:**
```sql
ALTER TABLE player_episode_inventory ADD CONSTRAINT inventory_unique UNIQUE (player_id, item_id, episode_id);
```
Update all inserts to `ON CONFLICT (player_id, item_id, episode_id) DO UPDATE SET quantity = player_episode_inventory.quantity + EXCLUDED.quantity`.

---

### 12. Fix: resolve team_members table — exists in code but not in schema types

**File:** `app/play/[episodeId]/team/actions.ts`

**Problem:** `createTeam`, `joinTeam`, `leaveTeam` all insert/delete from `team_members` which is absent from `database.types.ts`. The team feature is currently broken at runtime.

**Fix:** Decide: either create the `team_members` table via migration (and regenerate types), or remove all references to it and rely solely on `player_episode_stats.team_id` for team membership tracking.

---

## BLOCK 3 — HIGH SECURITY
## (important before launch with real players)

---

### 13. Add: middleware.ts for route protection and session refresh

**File:** Create `middleware.ts` at project root.

**Problem:** No middleware exists. Auth is enforced only in layouts, which don't apply to direct API calls or new routes added without a layout. Supabase sessions also need to be refreshed at the edge on every request (required by `@supabase/ssr`).

**Fix:**
```ts
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (c) => c.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        ),
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  if (!user && (pathname.startsWith('/play') || pathname.startsWith('/admin'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return response
}

export const config = { matcher: ['/play/:path*', '/admin/:path*'] }
```

---

### 14. Fix: sanitize content_html before rendering with dangerouslySetInnerHTML

**File:** `app/play/[episodeId]/EpisodeGameplay.tsx` — NodeCard component, line ~1155

**Problem:** `content_html` from the database is rendered raw as HTML. If an admin account is compromised, arbitrary JavaScript can be injected into every player's browser.

**Fix:** `npm install isomorphic-dompurify`. Then:
```tsx
import DOMPurify from 'isomorphic-dompurify'
// ...
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(node.content_html) }} />
```

---

### 15. Fix: avatar upload uses wrong storage bucket

**File:** `app/play/[episodeId]/profile/AvatarUpload.tsx`

**Problem:** Avatars are uploaded to the `item-images` bucket under `avatars/` prefix. Wrong bucket, likely wrong access policies. Path `avatars/${userId}.jpg` could collide with future item image paths.

**Fix:** Create a dedicated `avatars` Supabase storage bucket with public read access. Update all `from('item-images')` calls in this file to `from('avatars')`.

---

### 16. Fix: validate and sanitize display_name input

**File:** `app/play/onboarding/route.ts`

**Problem:** `display_name` is inserted as-is from form data. No length limit, no character validation. A player could inject a 10,000-character string or special characters that break layout rendering.

**Fix:** Add server-side validation before the insert:
```ts
const raw = formData.get('display_name') as string
const display_name = raw?.trim()
if (!display_name || display_name.length < 2 || display_name.length > 30) {
  return NextResponse.redirect(new URL('/play?error=invalid_name', request.url))
}
```
Also add `minlength="2" maxlength="30"` to the HTML input on the onboarding form.

---

### 17. Fix: verify NEXT_PUBLIC_SITE_URL is set correctly per deployment domain

**File:** `app/auth/login/route.ts` and `.env` files

**Problem:** The OAuth `redirectTo` is `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`. In the multi-frontend architecture, Ca' Marcello runs on its own domain. If `NEXT_PUBLIC_SITE_URL` is wrong or missing, the OAuth callback returns to the wrong domain and the session is not established.

**Architecture note:** Each frontend deployment needs its own `NEXT_PUBLIC_SITE_URL` set to its exact domain (e.g., `https://camarcello.com`). Also verify this URL is listed in the Supabase dashboard under Authentication → URL Configuration → Redirect URLs.

**Fix:** Add `NEXT_PUBLIC_SITE_URL` to the env validation list (item 36). Add a runtime check in `auth/login/route.ts` that throws clearly if the variable is missing.

---

## BLOCK 4 — PERFORMANCE
## (critical for hundreds of concurrent players)

---

### 18. Fix: add database indexes on all high-frequency query columns

**Approach:** Single Supabase migration with all indexes.

**Problem:** Without indexes, every query on `player.user_id`, `player_episode_inventory.player_id`, etc. performs a full table scan. At 200 players each making several queries per minute, this becomes the primary database bottleneck.

```sql
CREATE INDEX IF NOT EXISTS idx_player_user_id ON player(user_id);
CREATE INDEX IF NOT EXISTS idx_player_adventure_id ON player(adventure_id);
CREATE INDEX IF NOT EXISTS idx_player_user_adventure ON player(user_id, adventure_id);
CREATE INDEX IF NOT EXISTS idx_player_episode_stats_player ON player_episode_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_player_episode_stats_episode ON player_episode_stats(episode_id);
CREATE INDEX IF NOT EXISTS idx_player_episode_stats_composite ON player_episode_stats(player_id, episode_id);
CREATE INDEX IF NOT EXISTS idx_player_episode_inventory_player ON player_episode_inventory(player_id);
CREATE INDEX IF NOT EXISTS idx_player_episode_inventory_episode ON player_episode_inventory(episode_id);
CREATE INDEX IF NOT EXISTS idx_player_episode_inventory_composite ON player_episode_inventory(player_id, episode_id);
CREATE INDEX IF NOT EXISTS idx_player_target_progress_composite ON player_target_progress(player_id, episode_id);
CREATE INDEX IF NOT EXISTS idx_content_nodes_episode ON content_nodes(episode_id);
CREATE INDEX IF NOT EXISTS idx_targets_node ON targets(node_id);
CREATE INDEX IF NOT EXISTS idx_targets_episode ON targets(episode_id);
CREATE INDEX IF NOT EXISTS idx_conditions_node ON conditions(node_id);
CREATE INDEX IF NOT EXISTS idx_effects_node ON effects(node_id);
CREATE INDEX IF NOT EXISTS idx_team_messages_team ON team_messages(team_id);
CREATE INDEX IF NOT EXISTS idx_team_messages_episode ON team_messages(episode_id);
CREATE INDEX IF NOT EXISTS idx_exchange_sessions_player_a ON exchange_sessions(player_a_id);
CREATE INDEX IF NOT EXISTS idx_exchange_sessions_player_b ON exchange_sessions(player_b_id);
CREATE INDEX IF NOT EXISTS idx_exchange_sessions_status ON exchange_sessions(status);
CREATE INDEX IF NOT EXISTS idx_player_steps_player ON player_steps(player_id);
CREATE INDEX IF NOT EXISTS idx_player_status_effects_player ON player_status_effects(player_id);
```

---

### 19. Fix: eliminate the 4-wave sequential query waterfall in EpisodePage

**File:** `app/play/[episodeId]/page.tsx`

**Problem:** The page makes queries in 4 sequential async rounds, each waiting for the previous:
1. Fetch episode + player + userData
2. Fetch stats + nodes + progress + inventory (waits for player_id from round 1)
3. Fetch team + messages (waits for team_id from round 2)
4. Fetch announcements (sequential after round 3)

Total: ~400–800ms of serial latency before anything renders.

**Fix:**
- Collapse rounds 1+2 by fetching player_id and episode in parallel, then fetching the rest in one large `Promise.all`
- Move team messages and announcements into a separate Suspense boundary with its own async component, so they stream in after the main content is already visible
- Result: reduce serial latency to ~2 rounds instead of 4

---

### 20. Fix: deduplicate the two realtime map subscriptions

**Files:** `components/MapView.tsx` and `app/play/[episodeId]/MapWrapper.tsx`

**Problem:** Both `MapView` and `MapWrapper` independently subscribe to `player_current_location` realtime changes on different channel names. Every GPS update fires two handlers and triggers two re-renders. This doubles the realtime channel count and causes unnecessary React work.

**Fix:** Remove the realtime subscription entirely from `MapView.tsx`. `MapWrapper` is the sole owner of location state; it passes `locations` down as a prop. `MapView` becomes a pure, stateless display component that just renders what it receives.

---

### 21. Fix: GPS update triggers full RPC re-fetch on every position fix

**File:** `app/play/[episodeId]/MapWrapper.tsx`

**Problem:** Every GPS position fix dispatches `gps:ok`, which `MapWrapper` listens to and calls `loadLocations()` — a full RPC call re-fetching all players' locations. The realtime subscription already delivers individual location updates in real time. The two systems fight each other.

**Fix:** Remove the `window.addEventListener('gps:ok', () => loadLocations())` from MapWrapper. The realtime subscription handles live updates. `loadLocations()` runs once on mount to get initial state, then realtime takes over.

---

### 22. Fix: createClient() called repeatedly — use a module-level singleton

**Files:** `TeamChat.tsx`, `MapView.tsx`, `MapWrapper.tsx`, `CombineClient.tsx`, `ExchangeSessionClient.tsx`, `GPSUploader.tsx`, `AvatarUpload.tsx`

**Problem:** Every component creates its own Supabase browser client instance, each maintaining separate internal state, separate auth state listener, and separate WebSocket multiplexer overhead.

**Fix:** Create `lib/supabase/browserClient.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```
Replace every `createClient()` call in Client Components with `import { supabase } from '@/lib/supabase/browserClient'`.

---

### 23. Fix: replace Google Fonts <link> with next/font/google

**File:** `app/layout.tsx`

**Problem:** Three font families are loaded via external `<link>` tags that block first render, depend on Google's servers, and bypass Next.js font optimization (subsetting, preloading, no flash of unstyled text).

**Fix:**
```ts
import { Cinzel, EB_Garamond, Space_Mono } from 'next/font/google'

const cinzel = Cinzel({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-cinzel' })
const garamond = EB_Garamond({ subsets: ['latin'], weight: ['400','500'], style: ['normal','italic'], variable: '--font-garamond' })
const spaceMono = Space_Mono({ subsets: ['latin'], weight: ['400','700'], variable: '--font-mono' })
```
Apply `className={`${cinzel.variable} ${garamond.variable} ${spaceMono.variable}`}` to `<html>`. Replace all inline font-family strings with `var(--font-cinzel)` etc.

---

### 24. Fix: replace all <img> tags with next/image

**Files:** `EpisodeGameplay.tsx`, `ExchangeScanClient.tsx`, `AvatarUpload.tsx`, admin item pages

**Problem:** Raw `<img>` tags have no lazy loading, no automatic WebP/AVIF conversion, no size optimization, and cause layout shift. With dozens of item images in an inventory grid, this is significant load-time cost on mobile.

**Fix:** Use `<Image>` from `next/image`. Configure `images.remotePatterns` in `next.config.ts` for the Supabase storage domain. For avatar and item images where dimensions aren't known upfront, use `fill` with a relative-positioned container.

---

### 25. Fix: remove Leaflet CDN dependency — bundle Leaflet CSS locally

**Files:** `components/MapView.tsx` (line 221) and `app/admin/markers/AdminMapPicker.tsx` (line 331)

**Problem:** Both components inject `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">` at runtime. This is an external CDN dependency with no integrity (SRI) hash. Also hardcodes marker icon URLs from unpkg.

**Fix:**
- Add `import 'leaflet/dist/leaflet.css'` to the component (already installed as a dep)
- Replace the unpkg marker icon URLs with local imports from `leaflet/dist/images/`
- Remove the dynamic `<link>` injection

---

### 26. Fix: add Next.js caching for static game data

**Files:** `app/play/[episodeId]/combine/page.tsx`, `app/play/[episodeId]/page.tsx` (nodes/items), `app/admin/items/page.tsx`, `app/admin/combinations/page.tsx`

**Problem:** Items catalog, combination recipes, and content nodes rarely change during a live event but are fetched fresh on every request. At 200 players, episode nodes are fetched 200 times per minute from the same unchanged data.

**Fix:** Wrap stable queries in `unstable_cache`:
```ts
import { unstable_cache } from 'next/cache'

const getEpisodeNodes = unstable_cache(
  async (episodeId: string) => {
    const supabase = await createClient()
    return supabase.from('content_nodes').select(`...`).eq('episode_id', episodeId)
  },
  ['episode-nodes'],
  { revalidate: 30, tags: ['episode-nodes'] }
)
```
Use `revalidateTag('episode-nodes')` in admin actions when content is updated.

---

### 27. Fix: debounce GPS writes — maximum 1 write per 5 seconds

**File:** `components/GPSUploader.tsx`

**Problem:** `watchPosition` with `enableHighAccuracy: true` fires every 1–2 seconds on mobile. Every fix writes to Supabase. At 200 players: ~150 DB writes/second just for GPS. This alone saturates Supabase free tier.

**Fix:**
```ts
let lastUpload = 0
const MIN_INTERVAL_MS = 5000

watchId = navigator.geolocation.watchPosition(
  async (pos) => {
    const now = Date.now()
    if (now - lastUpload < MIN_INTERVAL_MS) return
    lastUpload = now
    // ... rest of upload logic
  },
  ...
)
```
Also add `maximumAge: 5000` to the watchPosition options to skip updates if position hasn't meaningfully changed.

---

### 28. Fix: configure next.config.ts (currently empty)

**File:** `next.config.ts`

**Problem:** The Next.js config is completely empty. No image domains, no security headers, no redirects. `next/image` won't work with external URLs until domains are configured.

**Fix:**
```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self), microphone=()' },
        ],
      },
    ]
  },
}

export default nextConfig
```

---

## BLOCK 5 — MAINTAINABILITY & DEVELOPER EXPERIENCE

---

### 29. Fix: regenerate database.types.ts — currently missing several tables

**Approach:** `npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/database.types.ts`

**Problem:** `team_members`, `map_markers`, `episode_announcements`, and at least one `markers` table are used in code but absent from `database.types.ts`. All queries against these tables are untyped.

**Architecture note:** When the platform becomes a monorepo, `database.types.ts` should live in `/packages/db` and be shared across all frontends (hub, camarcello, metalayer). For now, a process document should specify "after every Supabase schema change, regenerate types and update all frontend repos."

---

### 30. Fix: decompose EpisodeGameplay.tsx (1,100 lines) into focused components

**File:** `app/play/[episodeId]/EpisodeGameplay.tsx`

**Problem:** Single component manages GPS state, realtime subscriptions, QR scanner lifecycle, inventory popup, mission tab, team chat, announcement bar, and routing. Impossible to work on one feature without touching unrelated code.

**Suggested breakdown:**
- `components/game/MissionTab.tsx` — mission list, node cards, join prompt
- `components/game/InventoryTab.tsx` — item grid, item popup (actions + details)
- `components/game/TeamTab.tsx` — team header, TeamChat wrapper, join team prompt
- `components/game/QRTab.tsx` — QR scanner, claimed item popup
- `components/game/AnnouncementBar.tsx` — announcement bar + popup
- `components/game/PlayerBadge.tsx` — top-right player badge with GPS dot
- `components/game/TabBar.tsx` — bottom tab switcher with unread badge
- `app/play/[episodeId]/EpisodeGameplay.tsx` — orchestrator only, wires state between children

---

### 31. Fix: create shared getCurrentPlayer() and requirePlayer() utilities

**File:** Create `lib/auth/player.ts`

**Problem:** The pattern of "get user → query player → redirect if missing" is copy-pasted verbatim in at least 12 files. Any schema change (e.g., adding `adventure_id` filtering) must be updated in 12 places.

**Architecture note:** This utility is adventure-specific (uses `ADVENTURE_ID`). Each frontend keeps its own copy. If the platform becomes a monorepo, this would live in the frontend app, not in the shared `/packages/db`.

**Fix:**
```ts
// lib/auth/player.ts
import { createClient } from '@/lib/supabase/server'
import { ADVENTURE_ID } from '@/lib/constants'
import { redirect } from 'next/navigation'

export async function requirePlayer() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: player } = await supabase
    .from('player')
    .select('player_id, display_name, level, experience_points, avatar_url')
    .eq('user_id', user.id)
    .eq('adventure_id', ADVENTURE_ID)
    .single()
  if (!player) redirect('/play')

  return { supabase, user, player }
}
```

---

### 32. Fix: remove debug console.log statements

**Files:**
- `app/play/[episodeId]/profile/AvatarUpload.tsx` line 58: `console.log('update result:', updateError)`
- `app/play/[episodeId]/MapWrapper.tsx` line 153: `console.log('[MapWrapper] markers data:', data, 'error:', error)`

---

### 33. Fix: move inline joinEpisode server action to actions.ts

**File:** `app/play/[episodeId]/page.tsx` lines 149–158

**Problem:** An inline `'use server'` function inside a page component captures outer variables via closure. It cannot be tested, reused, or cleanly audited for security.

**Fix:** Move to `app/play/[episodeId]/actions.ts` as a named export. The page imports and passes it as a prop.

---

### 34. Fix: replace window.location.href with router.push in QR scanner handler

**File:** `app/play/[episodeId]/EpisodeGameplay.tsx` lines 267–271

**Problem:** `window.location.href = ...` triggers a full browser page reload, destroying all React state, closing all realtime connections, and forcing a complete re-download of JS bundles. On a slow mobile connection mid-game, this is very noticeable.

**Fix:** Use `router.push(...)` from `next/navigation` instead. Already imported in this component.

---

### 35. Fix: add loading.tsx and error.tsx for all main route segments

**Files to create:**
- `app/play/loading.tsx` — skeleton for the episodes list
- `app/play/[episodeId]/loading.tsx` — skeleton for the main game view
- `app/admin/loading.tsx` — skeleton for admin pages
- `app/error.tsx` — global error boundary
- `app/play/error.tsx` — player-facing error boundary
- `app/admin/error.tsx` — admin error boundary

**Problem:** Any unhandled server error or slow network shows a blank white screen. No user feedback during navigation.

---

### 36. Add: environment variable validation at startup

**File:** Create `lib/env.ts`; import in `next.config.ts`

**Problem:** Missing env vars cause cryptic runtime crashes deep inside request handlers.

**Fix:**
```ts
// lib/env.ts
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_ADVENTURE_ID',
  'NEXT_PUBLIC_SITE_URL',  // must match the deployment domain exactly
]
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`)
}
```

---

## BLOCK 6 — SCALABILITY
## (fine-tuning for the November 2026 live event)

---

### 37. Fix: consolidate realtime channels — reduce from 4–5 to 2 per player

**Problem:** Each player session currently opens: `map:${episodeId}` (MapView), `map-locations:${episodeId}` (MapWrapper), `announcements:${episodeId}` (EpisodeGameplay), `team_chat:${teamId}` (TeamChat), optionally `exchange_session:${sessionId}`. At 200 players = 800–1000 channels. Supabase Pro limit is 500 concurrent connections.

**Fix:** After completing item 20 (deduplicate map subscriptions), consolidate further:
- Use one shared episode channel for both location updates and announcements
- Subscribe to channels from a React Context at the layout level, not per-component
- Unsubscribe channels aggressively when tabs are inactive (use Page Visibility API)

---

### 38. Fix: add message length limit and basic rate limiting to TeamChat

**File:** `app/play/[episodeId]/team/TeamChat.tsx`

**Problem:** No validation on chat message length or frequency. A broken client or adversarial player could flood `team_messages` with thousands of rows per minute.

**Fix:**
- Client-side: disable submit if `text.length > 400`. Show character count.
- Supabase RLS policy to rate-limit: allow insert only if the player hasn't sent a message in the last 2 seconds (use `created_at` on most recent message)
- Keep messages in the UI capped at 100; older ones are still in the DB

---

### 39. Fix: add team_messages pagination

**Files:** `app/play/[episodeId]/page.tsx`, `TeamChat.tsx`

**Problem:** Currently loads up to 50 messages on mount. For a multi-hour event with an active team, older messages are lost. Also 50 messages on cold load is unnecessary data transfer.

**Fix:** Initial load: fetch last 20 messages ordered descending. Add a "load older messages" button that fetches the next 20. Realtime subscription handles new messages appended to the bottom.

---

### 40. Fix: configure Supabase connection pooler (PgBouncer)

**Approach:** Supabase dashboard → Settings → Database → Connection pooling

**Problem:** Each Vercel serverless function invocation opens a new PostgreSQL connection. At 200 concurrent requests during a live event, this exhausts the default PostgreSQL `max_connections` limit (~100 on Supabase free tier, ~200 on Pro).

**Fix:**
- Enable PgBouncer in Transaction mode in the Supabase dashboard
- Update `SUPABASE_DB_URL` env var to use the pooler endpoint (port `6543` instead of `5432`)
- Note: transaction mode does not support `PREPARE` statements — ensure no raw SQL uses them

---

## Quick Reference: Completion Checklist

```
BLOCK 0 — RLS FOUNDATION
[ ]  0. Implement RLS policies for all player-facing tables

BLOCK 1 — CRITICAL SECURITY
[ ]  1. Derive playerId from auth in all server actions (never from params)
[ ]  2. Move CombineClient logic to Server Action
[ ]  3. Create requireAdmin() and apply to all admin actions
[ ]  4. Add admin check to sendAnnouncement
[ ]  5. Fix verifyGPS to use stored player location, not client-provided coords
[ ]  6. Fix effect.type string mismatch (give_ vs grant_)
[ ]  7. Delete duplicate [nodeId]/actions.ts
[ ]  8. Delete duplicate deleteItem function

BLOCK 2 — CRITICAL CORRECTNESS
[ ]  9. Add DB transactions for inventory mutations (PostgreSQL functions)
[ ] 10. Add unique constraint on player(user_id, adventure_id)
[ ] 11. Add unique constraint on player_episode_inventory(player_id, item_id, episode_id)
[ ] 12. Fix or create team_members table

BLOCK 3 — HIGH SECURITY
[ ] 13. Add middleware.ts (session refresh + route protection)
[ ] 14. Sanitize content_html with DOMPurify
[ ] 15. Move avatar uploads to dedicated avatars bucket
[ ] 16. Validate display_name input (length + characters)
[ ] 17. Verify NEXT_PUBLIC_SITE_URL is set correctly per deployment domain

BLOCK 4 — PERFORMANCE
[ ] 18. Add all missing DB indexes (one migration)
[ ] 19. Eliminate 4-wave query waterfall in EpisodePage
[ ] 20. Deduplicate map realtime subscriptions (MapView becomes stateless)
[ ] 21. Remove GPS → full re-fetch pattern in MapWrapper
[ ] 22. Use singleton Supabase browser client (lib/supabase/browserClient.ts)
[ ] 23. Replace Google Fonts <link> with next/font/google
[ ] 24. Replace <img> with next/image everywhere
[ ] 25. Bundle Leaflet CSS locally (remove unpkg dependency)
[ ] 26. Add Next.js caching for static game data (unstable_cache)
[ ] 27. Debounce GPS writes to max 1 per 5 seconds
[ ] 28. Configure next.config.ts (security headers + image domains)

BLOCK 5 — MAINTAINABILITY
[ ] 29. Regenerate database.types.ts (add missing tables)
[ ] 30. Decompose EpisodeGameplay.tsx into 7+ focused components
[ ] 31. Create shared requirePlayer() utility (lib/auth/player.ts)
[ ] 32. Remove debug console.log statements
[ ] 33. Move inline joinEpisode server action to actions.ts
[ ] 34. Replace window.location.href with router.push
[ ] 35. Add loading.tsx and error.tsx for all route segments
[ ] 36. Add env variable validation at startup

BLOCK 6 — SCALABILITY
[ ] 37. Consolidate realtime channels (target: max 2 per player session)
[ ] 38. Add message length limit + rate limiting to TeamChat
[ ] 39. Add team_messages pagination (load last 20, scroll for more)
[ ] 40. Configure Supabase PgBouncer connection pooler
```
