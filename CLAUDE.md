# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PokeBinder is a web app for organizing and showcasing a Pokémon TCG collection digitally.
Built by MrWack (GitHub: MrWack20). Repo: https://github.com/MrWack20/pokemon-binder

**Stack:** React 19, Vite 7, Supabase (auth + Postgres + Storage), Pokémon TCG API v2, Lucide React, React Router DOM v7.

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

On Vercel, `VITE_SUPABASE_URL` must be set for **both** the Production *and* Preview (dev branch) environments separately — they are distinct environment types in Vercel. The other two vars can be set for all environments at once. Vite bakes these into the bundle at build time; changing them requires a new deployment.

---

## Supabase Project

- **Project ID:** `ssdmmlxnzlgjriqddpin`
- **Region:** ap-northeast-2
- **Storage bucket:** `binder-covers` (public) — for binder cover image uploads
- **Auth redirect URLs** (must be added in Supabase Dashboard → Auth → URL Configuration):
  - Site URL + redirect allow-list must include the Vercel preview URL for email confirmation and password reset to work on deployed builds.

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

`App.jsx` is both the React Router root and the sole stateful component (Dashboard). All Supabase calls go through `src/services/` — components never import `supabase` directly. The service layer pattern:

- `supabaseAuth.js` — wraps `supabase.auth.*` (signUp, signIn, signOut, onAuthStateChange, updateEmail, updatePassword, resetPassword)
- `profileService.js` — CRUD for `profiles` table
- `binderService.js` — CRUD for `binders` table; `getBinders` uses `.select('*, binder_cards(count)')` so each binder arrives with `binder.binder_cards[0].count`
- `cardService.js` — CRUD for `binder_cards`; `addCard` does delete-then-insert (not upsert) to avoid silent RLS failures on conflict
- `searchService.js` — calls Pokémon TCG API v2 directly from the browser

### Key architectural decisions

**Slot array model** — Cards in the DB are rows with `slot_index`. `App.jsx:buildCardsArray()` reconstructs a flat array (length = rows × cols × pages, nulls for empty slots) that `BinderView` consumes. `BinderView`'s slot-index logic never touches the DB directly.

**Drag/drop swap** — `BinderView` passes absolute slot indices to `onSwapCards`. `App.jsx` looks up the DB row UUID from the local slot array before calling `swapCards` or `moveCard`. `swapCards` uses slot `-1` as a sentinel to work around the `UNIQUE(binder_id, slot_index)` constraint during the 3-step swap.

**Search results vs binder cards** — TCG API objects (`card.images.small`, `card.name`) live only in the search results panel. The binder grid renders DB row objects (`card.card_image_url`, `card.card_name`, `card.card_price`). These are different shapes — don't conflate them.

**Cover image upload** — `EditBinderCover` holds a `File` object in local state and passes it up via `onSave(coverData, imageFile)`. `App.jsx:uploadBinderCover()` does the actual upload to Supabase Storage bucket `binder-covers` and stores the public URL.

**AuthContext** — `onAuthStateChange` subscription drives auth state. An 8-second timeout fallback calls `setLoading(false)` in case Supabase never responds (missing env vars, network error). `ensureProfile()` auto-creates a profile row on first sign-in using OAuth display name or email prefix.

**SettingsPanel** — Has four sections: Appearance (background theme, saved to localStorage), Display Name, Change Email, Change Password. The last three call Supabase directly. OAuth users see a note that email/password is managed by their provider.

### Routing

```
/           → Dashboard (ProtectedRoute — redirects to /login if not authenticated)
/login      → LoginPage
/register   → RegisterPage
/forgot-password → ForgotPasswordPage
*           → redirect to /
```

---

## Vercel Deployment

- **Project:** `prj_FycMGGDOsdmYHkvNJ63VjAbr4cwV` (team: `team_Flq3T8mRbKn2YQ4HQ3Hq96s2`)
- **Dev branch preview URL:** `https://pokemon-binder-git-dev-joaquin-alec-haos-projects.vercel.app`
- Auto-deploys from GitHub on push to `dev` (preview) and `main` (production).

---

## Git Branch Structure

`main` is production. `dev` is the active integration branch. Feature branches are cut from `dev`.
