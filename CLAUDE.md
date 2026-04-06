# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PokéBinder is a web app for organizing and showcasing a Pokémon TCG collection digitally.
Built by MrWack (GitHub: MrWack20). Repo: https://github.com/MrWack20/pokemon-binder

**Stack:** React 19, Vite 7, Supabase (auth + Postgres + Storage), Pokémon TCG API v2, Lucide React, React Router DOM v7, Recharts, @dnd-kit/core, react-hot-toast.

---

## Roadmap

**Always read `ROADMAP.md` before planning or starting any new phase or feature.** It is the single source of truth for what should be built, in what order, and why. Never propose or begin a phase without first checking which items are complete and what the next unchecked items are.

`ROADMAP.md` is located at the project root. It defines 5 phases:
- **Phase 1** — Foundation, Supabase Migration & Auth ✅ Complete
- **Phase 2** — Core Feature Enhancements ✅ Complete (core items done; stretch items deferred to Phase 5)
- **Phase 3** — Multi-Game Expansion ✅ Complete (Scryfall + YGOPRODeck; see notes below)
- **Phase 4** — Social & Sharing Features 🔲 Next
- **Phase 5** — Production & Performance 🔲 Pending

### Phase 2 remaining items (from ROADMAP.md)
These roadmap items from Phase 2 are NOT yet implemented:

**2.1 Search & Discovery:**
- Autocomplete/suggestions as user types
- Set completion tracking (cards in binder vs total in set)
- Search history synced to Supabase (currently localStorage-only)

**2.2 Statistics:**
- Collection growth over time chart
- Supabase database views for statistics queries

**2.3 Binder Experience:**
- Binder export as image/PDF
- Quick fill (auto-populate from a set)
- Page reordering within a binder
- Multi-select move/remove
- Undo/redo for card placement

**2.4 Pricing:**
- Price trend history (`price_history` table)
- Currency preference saved to DB (currently localStorage-only)
- Total page value displayed on each binder page

### Phase 3 notes
The roadmap referenced "Scrydex API (GraphQL)" — this API does not exist as a production service. Phase 3 was implemented using:
- **Scryfall API** (REST) for Magic: The Gathering — `src/services/mtgService.js`
- **YGOPRODeck API** (REST) for Yu-Gi-Oh! — `src/services/yugiohService.js`
- **OPTCG API** (REST) for One Piece TCG — `src/services/onepieceService.js` (base: `https://www.optcgapi.com/api/`)
- No GraphQL client was needed; all APIs are REST with CORS support, no auth required.

New services normalize all game cards to a shared display shape: `{ id, name, images: { small, large }, set: { name }, _game, _price, _raw }`. This shape is compatible with the existing Pokemon TCG API shape so BinderView requires minimal changes.

`binder_cards.card_game` column already existed from Phase 1. The only new DB column is `binders.default_game` — requires running `supabase/migrations/002_phase3_multigame.sql`.

**3D card inspection** — `CardInspectModal.jsx`:
- Triggered by long-pressing (450ms hold) any card in the binder
- Also accessible via "Inspect 3D" button in CardDetailModal
- CSS `perspective() + rotateX/rotateY` driven by mouse/touch position
- Holographic shine overlay with `mix-blend-mode: screen`
- Flip button for double-faced MTG cards (`card._backImage`)

### Phase 2 remaining stretch items (deferred)
- Binder export as image/PDF (needs html2canvas + jsPDF)
- Page reordering within a binder
- Multi-select move/remove
- Undo/redo for card placement
- Currency preference saved to DB (localStorage-only)
- Price trend history (needs `price_history` table)

When planning next steps, proceed to Phase 4 (Social & Sharing).

---

## Commands

```bash
npm run dev        # Start local dev server on port 5173
npm run build      # Production build → dist/
npm run preview    # Serve the production build locally
npm run lint       # ESLint (eslint-plugin-react-hooks + react-refresh)
```

When asked to "run the dev server" or "open the app", start the dev server AND open `http://localhost:5173` in Chrome:
```bash
npm run dev &
start chrome http://localhost:5173
```

No test suite is configured. There is no `npm test`.

---

## Environment Variables

Copy `.env.example` to `.env`. Required vars:

```
VITE_SUPABASE_URL=https://ssdmmlxnzlgjriqddpin.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_POKEMON_TCG_API_KEY=<tcg api key>
```

On Vercel, `VITE_SUPABASE_URL` must be set for **both** Production *and* Preview environments separately. The other two vars can be set for all environments at once. Vite bakes these into the bundle at build time; changing them requires a new deployment.

---

## Supabase Project

- **Project ID:** `ssdmmlxnzlgjriqddpin`
- **Region:** ap-northeast-2
- **Storage bucket:** `binder-covers` (public) — for binder cover image uploads
- **Auth redirect URLs** must include the Vercel preview URL for email confirmation and password reset to work on deployed builds.

---

## Database Schema

Migration file: `supabase/migrations/001_initial_schema.sql`

| Table | Key columns |
|---|---|
| `profiles` | id, user_id (FK → auth.users, UNIQUE), name, avatar_url, created_at |
| `binders` | id, profile_id (FK → profiles, cascade), name, rows, cols, pages, cover_color, cover_text, cover_image_url, created_at |
| `binder_cards` | id, binder_id (FK → binders, cascade), slot_index, card_api_id, card_name, card_image_url, card_set, card_game, card_price, card_price_currency, added_at |

RLS is enabled on all three tables — policies enforce users can only access their own data.
`UNIQUE(binder_id, slot_index)` constraint on `binder_cards`.

---

## Architecture

### Data flow

`App.jsx` is both the React Router root and the sole stateful component (`Dashboard`). All Supabase calls go through `src/services/` — components never import `supabase` directly.

- `supabaseAuth.js` — wraps `supabase.auth.*`
- `profileService.js` — CRUD for `profiles`
- `binderService.js` — CRUD for `binders`; `getBinders` uses `.select('*, binder_cards(count)')` so each binder arrives with `binder.binder_cards[0].count`; also exports `duplicateBinder`
- `cardService.js` — CRUD for `binder_cards`; `addCard` does delete-then-insert (not upsert) to avoid silent RLS failures on conflict
- `cardService.js:swapCards` uses slot index `-1` as a sentinel to work around the `UNIQUE(binder_id, slot_index)` constraint during the 3-step swap
- `searchService.js` — calls Pokémon TCG API v2 from the browser; has a 15-min TTL localStorage cache (60-entry limit), 24-hour set cache, recent-search history (6 entries), and a `sortBy` parameter (`''|'name'|'number'|'price_desc'|'price_asc'`); exports `getSetCards(setId, sort)` which fetches up to 250 cards per set in one request, sorted client-side via `sortSetCards()` with natural number parsing via `parseCardNumber()` (regex extracts leading digits from strings like "TG01", "SV001")
- `statsService.js` — one Supabase FK-embedded query (`binders` + `binder_cards`), aggregated client-side; returns `{ totalBinders, totalCards, totalValue, topSets, binderValues, mostValuable, recentlyAdded, growthOverTime, gameBreakdown }`
- `mtgService.js` — Scryfall REST API for MTG; `searchMtgCards(query, page)` returns normalized cards; `normalizeMtgCard(raw)` maps Scryfall → shared display shape; `mtgCardToDbRow(card)` maps to binder_cards columns
- `yugiohService.js` — YGOPRODeck API for Yu-Gi-Oh!; same pattern as mtgService; returns 400 (not 404) for empty results — handled as empty array

### Key architectural decisions

**Slot array model** — Cards in the DB have `slot_index`. `App.jsx:buildCardsArray()` reconstructs a flat array (length = rows × cols × pages, nulls for empty slots) that `BinderView` consumes. Slot-index logic never touches the DB directly.

**Two card shapes** — TCG API objects (`card.images.small`, `card.name`, `card.set.name`) are used only in search results and the Sets browser. DB row objects (`card.card_image_url`, `card.card_name`, `card.card_set`) are used in the binder grid. `CardDetailModal` accepts both shapes and detects them via `!!card.images`. Never conflate the two shapes.

**Pricing** — All prices use TCGPlayer USD. Priority fallback chain: `holofoil → normal → 1stEditionHolofoil → unlimited` market price. `card_price_currency` is always `'USD'` in the DB.

**AuthContext bootstrap** — `getSession()` is called once on mount (reads localStorage, no network call for fresh tokens) to set initial auth state. `onAuthStateChange` handles subsequent events but skips `INITIAL_SESSION` to avoid double-processing. An 8-second fallback calls `setLoading(false)` if Supabase never responds. `ensureProfile()` auto-creates a profile row on first sign-in.

**User settings** — Persisted in localStorage under key `pokemonBinderSettings` as `{ backgroundTheme: string, currency: 'USD'|'EUR'|'GBP' }`. Read by `SettingsPage`, `StatsPage`, `BinderView`, and `SetsPage` directly from localStorage — not stored in the DB or passed as props from `App.jsx`. Currency preference is localStorage-only (no `currency` column in `profiles` table); resets if localStorage is cleared.

**Header nav** — When `view === 'binders'` (the main dashboard), `App.jsx` renders a `.header-nav` bar below the title with Browse Sets and Statistics as permanent link buttons. These are NOT inside the UserMenu dropdown. `UserMenu` only has Settings, Statistics (redundant shortcut), and Sign out.

**Theme system** — `BACKGROUND_THEMES` in `src/constants/themes.js` has shape `{ [key]: { name: string, css: string } }` where `css` is any valid CSS `background` value (supports `radial-gradient`, multi-stop). `App.jsx` applies it to `document.body.style.background`. The auth pages have their own fixed dark background defined in `.auth-page` CSS and are not affected by the theme.

**BinderView view modes** — `BinderView` manages a local `viewMode` state (`'page'|'spread'|'gallery'`). Page mode is scrollable — cards keep their `aspect-ratio: 2.5/3.5` and the page grows naturally without a height cap. Spread mode shows two pages side by side with a `.binder-spread__spine` divider. Gallery mode renders all filled cards in a continuous auto-fill responsive grid without page separators. Toggle icons: `LayoutGrid` (page), `Columns` (spread), `Images` (gallery).

**Cover image upload** — `EditBinderCover` holds a `File` in local state and passes it up via `onSave(coverData, imageFile)`. `App.jsx:uploadBinderCover()` uploads to Supabase Storage bucket `binder-covers` and stores the public URL.

### Routing

```
/                → Dashboard (ProtectedRoute)
/login           → LoginPage
/register        → RegisterPage
/forgot-password → ForgotPasswordPage
/auth/callback   → AuthCallbackPage (OAuth + email confirm)
/auth/reset-password → ResetPasswordPage
/settings        → SettingsPage (ProtectedRoute)
/stats           → StatsPage (ProtectedRoute) — collection statistics with Recharts
/sets            → SetsPage (ProtectedRoute) — browse all TCG sets and their cards
*                → redirect to /
```

---

## Vercel Deployment

- **Project:** `prj_FycMGGDOsdmYHkvNJ63VjAbr4cwV` (team: `team_Flq3T8mRbKn2YQ4HQ3Hq96s2`)
- **Dev branch preview URL:** `https://pokemon-binder-git-dev-joaquin-alec-haos-projects.vercel.app`
- Auto-deploys from GitHub on push to `dev` (preview) and `main` (production).

---

## Git Branch Structure

`main` is production. `dev` is the active integration branch. Feature branches are cut from `dev`.

---

## Performance & Security Audit (completed 2026-04-04)

### Issues found and fixed

| Area | Issue | Fix applied |
|---|---|---|
| Auth refresh | `setLoading(false)` blocked by `ensureProfile()` DB call → circular spinner on hard refresh | Moved `setLoading(false)` before `ensureProfile()`; 8s fallback timer |
| Auth stability | `ensureProfile()` failure on token refresh nulled out profile → binders disappeared | Never null out existing profile on error; `TOKEN_REFRESHED` skips profile re-fetch entirely; `SIGNED_OUT` only clears state on explicit user sign-out (ref flag); transient `SIGNED_OUT` attempts session recovery |
| Auth persistence | No sessionStorage cache for profile/binders → blank UI on slow DB | Profile cached in sessionStorage, loaded as initial state; binders cached on every mutation; stale-while-revalidate pattern |
| Sign out broken | If Supabase session was already dead, `signOut()` errored and never cleared local state → user stuck | Always clear user/profile/cache regardless of Supabase response |
| Binder fetch | `loadBinders` had no retry — single failure left dashboard empty | Returns error info; auto-retries once after 2s on failure |
| Card fetch | `handleSelectBinder` had no retry — network blip left binder empty | Auto-retries once on failure before showing error toast |
| 3D inspect modal | React state updates on every mousemove → 60fps reconciliation jank | Rewrote to use `useRef` + direct DOM mutation + `requestAnimationFrame`; `will-change: transform`; `.inspect-card-wrap--settling` CSS class for smooth return-to-centre |
| Bundle size | Recharts (~300KB), SettingsPage, SetsPage loaded eagerly on first paint | `React.lazy()` + `<Suspense>` for SettingsPage, StatsPage, SetsPage |
| Memory leak | `pointermove`/`pointerup` window listeners in CardSlot leaked if component unmounted mid-press | `cancelLongPressRef` + `useEffect` cleanup |
| Input validation | Binder name, cover text, display name had no `maxLength` | `maxLength={60}` on binder name, `maxLength={40}` on cover text, `maxLength={50}` on display name |
| Security headers | No HTTP security headers on Vercel responses | Created `vercel.json` with X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy |

---

## Feature Accessibility Checklist

After implementing or modifying any feature, always verify it is **reachable by the user** in the live app. A feature that exists in code but is not wired up or pushed is invisible to the user.

Before declaring a feature done, confirm ALL of the following:

1. **Component exists** — the `.jsx` file is created and complete
2. **Imported in App.jsx** — the component is imported at the top of `App.jsx`
3. **Routed or rendered** — the component is either added as a `<Route>` (for pages) or conditionally rendered inside `Dashboard` (for views like `binderView`)
4. **Linked from UI** — the user has a button/link to reach it (header nav, UserMenu, or in-page trigger)
5. **CSS classes exist** — any new class names used in JSX have matching rules in `App.css`
6. **Committed and pushed** — `git push origin <branch>` was run; verify with `git log origin/<branch>..<branch>`

If any step is missing, the feature is not accessible — do not mark it complete.

---

## Mistakes Log

A running log of mistakes made across sessions. Future instances must read this before starting work.

| # | Mistake | What went wrong | What to do instead |
|---|---|---|---|
| 1 | Forgot to push to origin after committing | All Phase 2 features were committed locally but never pushed. User reported features invisible on Vercel. | Always run `git push origin <branch>` after committing. If user says "I don't see the changes", check `git log origin/dev..dev` before assuming a code bug. |
| 2 | New npm package not committed to package.json | Installed `recharts` locally but never staged `package.json`/`package-lock.json`. Vercel build failed with "module not found". | Stage `package.json` and `package-lock.json` in the same commit as the code that uses the new package. |
| 3 | Applied `background-clip: text` gradient to entire `<h1>` | The heading contained a Lucide SVG icon. The gradient made the icon fully transparent. | Wrap only the text node in a `<span className="brand-text">`, never the parent element that contains icons. |
| 4 | Appended CSS to App.css via bash/node -e | Shell escaping left a stray extra `}` brace that silently broke subsequent CSS rules. | Always use the Edit tool for any App.css modification — no bash appending. |
| 5 | Started dev server without opening browser | User asked to "run the app" but only the terminal process was started. | Always run `npm run dev` AND `start chrome http://localhost:5173` together. Never just start the server. |
| 6 | Tried to height-constrain the binder to fit the viewport | Set `height: calc(100vh - 265px)` with `aspect-ratio: unset` on card slots — cards became very small. User rejected it. | Binder page mode must be scrollable. Keep `aspect-ratio: 2.5/3.5` on card slots and let the page grow naturally. Never cap the binder height. |
| 7 | Planned to use "Scrydex API" for Phase 3 multi-game | Scrydex does not exist as a production API. | Use Scryfall (MTG) and YGOPRODeck (YGO) — both are free REST APIs, no auth, CORS-safe. |
| 8 | `setLoading(false)` blocked by `ensureProfile()` DB call | On page refresh, `AuthContext` waited for a Supabase profile fetch before showing the app, causing a circular loading spinner. | Call `setLoading(false)` immediately after `setUser()`. `ensureProfile()` can run async afterward — `ProtectedRoute` only needs `user`, not `profile`. |
| 9 | React state for 3D tilt/shine caused 60fps re-renders | Using `useState` for `tilt`/`shine` in `CardInspectModal` triggered React reconciliation on every mousemove frame causing visible jank. | Use `useRef` + direct DOM style mutation + `requestAnimationFrame`. Zero React re-renders on movement — only `flipped` state needed. |
| 10 | window event listeners in CardSlot never cleaned up on unmount | `pointermove`/`pointerup` added to window inside `handlePointerDown` were only removed when the press sequence completed. If the component unmounted mid-press (e.g. navigating away), listeners leaked. | Store the cancel function in a ref; add a `useEffect` cleanup that calls `cancelLongPressRef.current?.()` and `clearTimeout(longPressRef.current)`. |
| 11 | Broke multi-line CSS rule by replacing only the opening `{` | When adding `position: relative` to `.sets-browse-card`, the Edit matched only `{` which left the rest of the rule as orphaned CSS. | Always read the full selector + declaration block, then replace the entire rule at once. Never match just `{`. |
| 12 | Missing `</div>` when inserting JSX into SetsPage | Added an owned-badge `<div>` inside set-detail-info but forgot its closing tag, breaking the JSX tree. | After inserting any new JSX block, count open/close tags before saving. |
| 13 | Changed Supabase auth `storageKey` to custom value | Supabase stores sessions under `sb-<projectRef>-auth-token` in localStorage. Changing `storageKey: 'pokebinder-auth'` made the client unable to find existing sessions → users appeared logged out on every refresh. | NEVER change `storageKey` on the Supabase client. The default key is tied to the project ref and existing sessions depend on it. |
| 14 | Stale closure for `profile` in `onAuthStateChange` callback | The `profile` variable inside the useEffect callback captured its initial value (`null`). The `TOKEN_REFRESHED` check `event === 'TOKEN_REFRESHED' && profile` was always false → every token refresh triggered a DB re-fetch. | Use `useRef` to track current profile value when reading from inside callbacks/closures. Or restructure the logic so the callback doesn't need to read profile state at all. |
| 15 | `onAuthStateChange` cleared state on transient `SIGNED_OUT` | Supabase fires `SIGNED_OUT` when a token refresh fails (e.g. brief network blip). The handler called `setUser(null)` / `setProfile(null)` → binders vanished, signout button broke. | Only clear auth state on EXPLICIT user-initiated sign-out (track via a ref flag). On unexpected `SIGNED_OUT`, attempt session recovery first. |
| 16 | No sessionStorage cache for auth/binder data | On every page refresh, the app started with `profile = null` and `binders = []`, waiting for DB calls. Any delay or failure left the UI blank. | Cache profile in sessionStorage on every successful fetch; initialise `useState(getCachedProfile())`. Cache binders too. Stale data > blank screen. |
