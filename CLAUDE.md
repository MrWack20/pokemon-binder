# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PokéBinder is a web app for organizing and showcasing a Pokémon TCG collection digitally.
Built by MrWack (GitHub: MrWack20). Repo: https://github.com/MrWack20/pokemon-binder

**Stack:** React 19, Vite 7, Supabase (auth + Postgres + Storage), Pokémon TCG API v2, Lucide React, React Router DOM v7, Recharts, @dnd-kit/core, react-hot-toast.

---

## Commands

```bash
npm run dev        # Start local dev server on port 5173
npm run build      # Production build → dist/
npm run preview    # Serve the production build locally
npm run lint       # ESLint (eslint-plugin-react-hooks + react-refresh)
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
- `searchService.js` — calls Pokémon TCG API v2 from the browser; has a 15-min TTL localStorage cache (60-entry limit), 24-hour set cache, recent-search history (6 entries), and a `sortBy` parameter (`''|'name'|'number'|'price_desc'|'price_asc'`)
- `statsService.js` — one Supabase FK-embedded query (`binders` + `binder_cards`), aggregated client-side; returns `{ totalBinders, totalCards, totalValue, topSets, binderValues, mostValuable, recentlyAdded }`

### Key architectural decisions

**Slot array model** — Cards in the DB have `slot_index`. `App.jsx:buildCardsArray()` reconstructs a flat array (length = rows × cols × pages, nulls for empty slots) that `BinderView` consumes. Slot-index logic never touches the DB directly.

**Two card shapes** — TCG API objects (`card.images.small`, `card.name`, `card.set.name`) are used only in search results and the Sets browser. DB row objects (`card.card_image_url`, `card.card_name`, `card.card_set`) are used in the binder grid. `CardDetailModal` accepts both shapes and detects them via `!!card.images`. Never conflate the two shapes.

**Pricing** — All prices use TCGPlayer USD. Priority fallback chain: `holofoil → normal → 1stEditionHolofoil → unlimited` market price. `card_price_currency` is always `'USD'` in the DB.

**AuthContext bootstrap** — `getSession()` is called once on mount (reads localStorage, no network call for fresh tokens) to set initial auth state. `onAuthStateChange` handles subsequent events but skips `INITIAL_SESSION` to avoid double-processing. An 8-second fallback calls `setLoading(false)` if Supabase never responds. `ensureProfile()` auto-creates a profile row on first sign-in.

**User settings** — Persisted in localStorage under key `pokemonBinderSettings` as `{ backgroundTheme: string, currency: 'USD'|'EUR'|'GBP' }`. Read by `SettingsPage`, `StatsPage`, `BinderView`, and `SetsPage` directly from localStorage — not stored in the DB or passed as props from `App.jsx`.

**Theme system** — `BACKGROUND_THEMES` in `src/constants/themes.js` has shape `{ [key]: { name: string, css: string } }` where `css` is any valid CSS `background` value (supports `radial-gradient`, multi-stop). `App.jsx` applies it to `document.body.style.background`. The auth pages have their own fixed dark background defined in `.auth-page` CSS and are not affected by the theme.

**BinderView view modes** — `BinderView` manages a local `viewMode` state (`'page'|'spread'|'gallery'`). Page mode fits the grid to viewport height using `height: calc(100vh - 265px)` and removes `aspect-ratio` from card slots. Spread mode shows two pages side by side as a book. Gallery mode renders all filled cards in a continuous responsive grid without page separators.

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
