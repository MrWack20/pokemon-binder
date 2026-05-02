# PokeBinder — Development Roadmap (v3)

> **Project Goal:** A full-featured, multi-game trading card collection platform with authentication, persistent profiles, statistics, and shareable public binders — powered by Supabase (PostgreSQL).

---

## Current State (v0.4 — Production, public)

**Last updated:** 2026-05-01

The app is **live in production** at the project's Vercel domain. Anyone with the link can sign up, build binders, and use every feature listed in Phases 1–3.

**What's shipped:**
- React 19 + Vite 7 SPA, deployed to Vercel from `main` (auto-deploys on push)
- Supabase Auth (email/password + Google OAuth + password reset + email verification)
- Supabase Postgres with RLS — `profiles`, `binders`, `binder_cards` tables, all access enforced server-side
- Supabase Storage bucket (`binder-covers`) for cover image uploads
- TanStack Query v5 for client-side server-state (caching, optimistic updates, refetch-on-focus, retry, 401 interceptor with single-flight refresh)
- URL-driven routing for binder views — refresh on `/binder/:id?page=N` always restores the user's spot
- Full multi-game support: Pokémon TCG, Magic: The Gathering (Scryfall), Yu-Gi-Oh! (YGOPRODeck), One Piece TCG (OPTCG)
- Per-binder default game; mixed-game binders supported
- 3D card inspection modal with holographic effect
- Statistics dashboard with Recharts (totals, top sets, value per binder, most valuable, recently added, growth over time, game breakdown)
- Sets browser per game with set-completion ownership badges
- Search history (localStorage), sort options, filters, pagination, 24-hr set cache, 15-min search cache
- Toasts via react-hot-toast for write feedback
- 5 background themes; currency picker (USD/EUR/GBP)
- Security headers + SPA fallback rewrite in `vercel.json`
- Vite SPA bundle: ~600KB gzipped (lazy-loaded routes for Stats / Sets / Settings)

**Architectural pivot in flight:**
- `feat/nextjs-migration` branch has the app rebuilt on **Next.js 16 (App Router) + `@supabase/ssr`** — cookie-based sessions, server-side validation in `src/proxy.js` on every request, no localStorage tokens. This eliminates the entire stale-JWT-empty-RLS class of bug we kept patching (Mistakes Log #15, #17, #18, #21, #23, #25-26). Awaiting user validation on a Vercel preview deploy before merging to `main`. See CLAUDE.md → "Architecture note" for details.

**Known limitations / debt:**
- No tests (Vitest, Playwright) — Phase 5
- No CI/CD pipeline — Phase 5
- No TypeScript — Phase 5
- No `is_public` flag on binders → no shareable public links yet — Phase 4 starts here
- No wishlist / trade list — Phase 4
- No CSV/PDF export — Phase 4
- Currency pref stored in localStorage, not DB
- Search history is per-device, not synced

---

## Phase 1 — Foundation, Supabase Migration & Auth ✅ Complete

*Priority: Fix what's broken, migrate from Firebase to Supabase, implement authentication, and set up proper development workflow.*

### 1.1 Repository Hygiene ✅
- [x] Fix README merge conflict
- [x] Write comprehensive README
- [x] Set up `.env` file and move all secrets out of source code
- [x] Add `.env.example` with placeholder values
- [x] Update `.gitignore` to include `.env`
- [x] Set up Git branching strategy (`main` ← `dev` ← `claude/*`)
- [x] Conventional commit messages

### 1.2 Supabase Project Setup ✅
- [x] Create Supabase project (`ssdmmlxnzlgjriqddpin`, ap-northeast-2)
- [x] Design relational schema (`profiles`, `binders`, `binder_cards`)
- [x] Foreign keys, `UNIQUE(binder_id, slot_index)`, indexes, `card_game` column
- [x] RLS policies on all 3 tables; users only access their own data
- [x] Install `@supabase/supabase-js`
- [x] `src/supabase.js` with timeout-wrapped fetch + diagnostics
- [x] Storage bucket `binder-covers` (public)

### 1.3 Data Migration (Firebase → Supabase) ✅
- [x] All Firebase deps removed
- [x] Components migrated to Supabase service layer
- [x] Cover images now in Supabase Storage (no more base64)

### 1.4 Supabase Authentication ✅
- [x] Email/password sign-up + login
- [x] Google OAuth
- [x] Login / Register / Forgot-password / Reset-password / Auth-callback pages
- [x] Protected routes — `ProtectedRoute` (Vite) / proxy redirects (Next.js)
- [x] Profile auto-created on first sign-in (`ensureProfile`)
- [x] User menu in header with avatar / display name / sign-out
- [x] Session persistence (localStorage on Vite SPA; HttpOnly cookies on Next.js branch)
- [x] Password reset flow (`resetPasswordForEmail`)
- [x] Email verification flow
- [ ] GitHub OAuth — *skipped, not needed*

### 1.5 API Service Layer ✅
- [x] `src/services/` directory with `profileService`, `binderService`, `cardService`, `searchService`, `statsService`, `supabaseAuth`, `mtgService`, `yugiohService`, `onepieceService`
- [x] Centralised error handling (`{ data, error }` return shape)
- [ ] Realtime subscriptions — *not yet implemented; not blocking any feature so deferred*

### 1.6 Code Quality & Error Handling ✅ (mostly)
- [x] React `<ErrorBoundary>` component
- [x] Form validation on auth + binder forms (`maxLength` etc.)
- [x] Loading skeletons via `<PageLoader />` and React Query `isLoading`
- [x] react-hot-toast for all success/error feedback
- [ ] PropTypes / TypeScript — *deferred to Phase 5*

### 1.7 Responsive Design 🚧
- [x] Binder grid scales to viewport
- [x] User-tested on phone — works
- [ ] Comprehensive responsive audit / mobile nav improvements — *iterating as needed*

**Milestone reached:** ✅ Clean, secure, authenticated app on Supabase with RLS and a real Git workflow.

---

## Phase 2 — Core Feature Enhancements ✅ Mostly complete

*The Pokemon experience is polished. Stretch items deferred to Phase 5.*

### 2.1 Enhanced Card Search & Discovery
- [x] "Browse by Set" view (`/sets`) with logos
- [x] Sorting options (name, number, price asc/desc) with natural number parsing
- [x] Card detail modal (image, pricing chain, set info, owned badge)
- [x] Persisted search cache (15-min TTL, 60-entry limit) + 24-hr set cache, localStorage
- [ ] Autocomplete/suggestions as user types
- [ ] Set completion tracking on Pokemon set list (cross-reference owned)
- [ ] Search history synced to Supabase (currently localStorage-only)

### 2.2 Collection Statistics & Dashboard ✅
- [x] `/stats` page with Recharts
- [x] Total collection value, total cards, total binders (StatCards)
- [x] Top sets by card count (BarChart)
- [x] Value per binder (BarChart)
- [x] Most valuable cards list
- [x] Recently added timeline
- [x] Game breakdown (per game card count + value)
- [ ] Collection growth over time chart (have data, no chart yet)
- [ ] Supabase database views for stats queries (currently aggregated client-side)

### 2.3 Binder Experience Improvements ✅ (most)
- [x] Binder duplication (`duplicateBinder` service)
- [x] 3D card inspect modal (long-press 450ms or "Inspect 3D" button)
- [x] Card detail modal on click
- [x] Binder sorting (oldest / newest / name A-Z / name Z-A)
- [x] BinderView modes — page / spread / gallery
- [x] Drag + swap cards between slots (`@dnd-kit/core`, sentinel-slot UNIQUE constraint trick)
- [ ] Binder export as image/PDF (needs `html2canvas` + `jsPDF`)
- [ ] Quick-fill (auto-populate from a set)
- [ ] Page reordering within a binder
- [ ] Multi-select move/remove
- [ ] Undo/redo for card placement

### 2.4 Pricing Enhancements
- [x] TCGPlayer USD pricing (Pokemon TCG); Scryfall USD (MTG); YGOPRODeck (Yu-Gi-Oh); OPTCG (One Piece)
- [x] Currency selector (USD/EUR/GBP) — *localStorage only*
- [ ] Price history table + trend charts (`price_history` table)
- [ ] Currency preference stored in DB
- [ ] Total page value on each binder page

**Milestone reached:** ✅ Polished, feature-rich card collection manager. Remaining items folded into Phase 5 stretch goals.

---

## Phase 3 — Multi-Game Expansion ✅ Complete (with substitutions)

*Originally scoped against the "Scrydex API" — that turned out not to exist as a production service. We pivoted to per-game free REST APIs, which kept the multi-game promise intact and avoided GraphQL complexity.*

### 3.1 API Integration (substituted)
- [x] Scryfall (MTG) — `src/services/mtgService.js`
- [x] YGOPRODeck (Yu-Gi-Oh!) — `src/services/yugiohService.js`
- [x] OPTCG (One Piece TCG) — `src/services/onepieceService.js`
- [x] Pokemon TCG API v2 — already integrated since v0.1
- [x] Shared display shape: `{ id, name, images: { small, large }, set: { name }, _game, _price, _raw }`
- [x] Per-game `*CardToDbRow()` mappers
- [ ] ~~GraphQL client (Apollo / urql)~~ — *not needed; all four APIs are REST + CORS-safe*

### 3.2 Multi-Game Support ✅
- [x] `binder_cards.card_game` column (already existed from Phase 1)
- [x] `binders.default_game` column (`supabase/migrations/002_phase3_multigame.sql`)
- [x] Game-tab selector in `BinderView` search (Pokemon / MTG / Yu-Gi-Oh / One Piece)
- [x] Mixed-game binders supported (cards from any game can land in any binder)
- [x] Game breakdown on `/stats` page (per-game card count + value)
- [x] Sets browser per game (Pokemon + One Piece have set browsers; MTG/YGO use search)

### 3.3 Pricing
- [x] Per-game native pricing — TCGPlayer USD (Pokemon), Scryfall USD (MTG), YGOPRODeck (YGO), OPTCG (One Piece)
- [x] Currency converter UI (USD/EUR/GBP)
- [ ] Multi-marketplace comparison — *deferred; current "best price" picker is good enough*
- [ ] `price_history` table + charts — *deferred to Phase 5*

### 3.4 Schema Updates ✅
- [x] `card_game` and `default_game` columns added
- [x] Indexes on `binder_cards.binder_id`, `binders.profile_id`
- [x] Existing rows defaulted to `card_game = 'pokemon'`
- [ ] `card_cache` table — *not needed; client-side caching has been sufficient*

### Bonus (not originally scoped)
- [x] **3D card inspection modal** with holographic shine effect (`CardInspectModal.jsx`) — long-press 450ms triggers; uses `useRef` + direct DOM mutation + `requestAnimationFrame` for 60fps performance

**Milestone reached:** ✅ Universal trading card platform supporting 4 games with a unified UX.

---

## Phase 4 — Social & Sharing Features 🔲 Next up

*Recommended order of operations: validate `feat/nextjs-migration` on Vercel preview → merge to `main` → start 4.1 on the Next.js base so public binder pages get proper SSR + OG tags out of the box.*

### 4.1 Public Profiles & Sharing
- [x] React Router (URL-based navigation) — *already done in v0.4 (`/binder/:id`, `/stats`, `/sets`, `/settings`); Next.js App Router on the migration branch supersedes this*
- [ ] Add `is_public` boolean column to `binders` (and optionally `profiles`)
- [ ] RLS: `SELECT` allowed on `binders WHERE is_public = true` for any role (anon + authenticated)
- [ ] "Make public / copy share link" toggle on the binder edit screen
- [ ] Read-only public binder view (`/share/:binderId` or similar) — fetches via the public RLS path
- [ ] Open Graph + Twitter meta tags on public pages so links unfurl on Discord/Twitter
- [ ] (Stretch) Public gallery of featured/recent public binders
- [ ] (Stretch) Embeddable iframe widget

### 4.2 Wishlist & Trading
- [ ] `wishlists` table (`user_id`, `card_api_id`, `card_name`, `card_game`, `priority`, `added_at`)
- [ ] Wishlist UI — cards the user wants but doesn't have
- [ ] "Have / Want" indicators on card search results (cross-ref `binder_cards` + `wishlists`)
- [ ] `trade_list` table (cards willing to trade)
- [ ] (Stretch) Notify when another user owns a card you want — Supabase Edge Functions + Realtime

### 4.3 Import / Export
- [ ] Export collection as CSV/JSON (server-side query → download)
- [ ] Import cards from CSV (validation + bulk insert into `binder_cards`)
- [ ] Export binder as printable PDF (`html2canvas` per page → `jsPDF`)

**Milestone:** A social, shareable collection platform with public binders, wishlists, and bring-your-own data export.

---

## Phase 5 — Production & Performance 🚧 Partially shipped out of order

*Some items shipped during the recent stability arc; rest pending.*

### 5.0 Architecture (NEW — pulled in from the auth-stability arc)
- [x] **Supabase fetch hardening** — 15s timeout on every HTTP call via custom `global.fetch` (`src/supabase.js`), so no request can hang forever
- [x] **TanStack Query v5** for client-side server state (`src/hooks/queries.js`) — cache, optimistic updates, retry, refetch-on-focus/reconnect
- [x] **401 retry interceptor** with single-flight refresh (`src/supabase.js#timeoutFetchWithAuthRetry`)
- [x] **`ensureValidSession()` actually validates** — checks `expires_at` with 60s buffer and refreshes when needed
- [x] **URL-driven view state** — refresh on `/binder/:id?page=N` always restores the user's spot
- [x] **Database security/perf audit** — RLS optimisation (`SELECT auth.uid()` pattern), `collection_stats` view set to `SECURITY INVOKER`, dropped unused index + duplicate policy, tightened storage bucket listing (Mistakes Log #25-30)
- [x] **`feat/nextjs-migration` branch ready** — Next.js 16 App Router + `@supabase/ssr` cookie-based sessions; awaiting user validation on a Vercel preview before merge to `main`. This is the canonical fix for the entire stale-JWT class of bug

### 5.1 Performance Optimization
- [x] Lazy loading for heavy routes (`React.lazy` + `<Suspense>`) — Stats / Sets / Settings
- [x] Search request caching (15-min TTL, 60-entry cap)
- [x] Set list cached for 24 hr
- [x] Database indexes on hot paths (added during recent perf audit)
- [ ] Image optimization (WebP, Supabase Storage transforms)
- [ ] Virtual scrolling for large search results (`react-window` / `react-virtuoso`)
- [ ] Service worker / PWA for offline support
- [ ] Search autocomplete with debouncing
- [ ] Server-side aggregations via Supabase database functions (currently aggregated client-side)

### 5.2 Testing 🔲
- [ ] Unit tests (Vitest + React Testing Library)
- [ ] Integration tests against Supabase local dev
- [ ] E2E tests (Playwright)
- [ ] CI/CD pipeline (GitHub Actions): lint + test + build on every PR

### 5.3 Deployment & DevOps
- [x] **Frontend deployed to Vercel** (auto-deploys from `main` and `dev`)
- [x] Environment-based configuration (`.env.local` for dev, Vercel env vars for prod / preview)
- [x] **Security headers in `vercel.json`** (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy)
- [x] **SPA fallback rewrite in `vercel.json`** so deep-link refreshes work on the Vite SPA
- [ ] Staging vs. production Supabase projects (currently a single project)
- [ ] Sentry error monitoring
- [ ] Analytics (Plausible / GA)
- [ ] Automated DB backups (free tier requires manual `pg_dump`)

### 5.4 TypeScript Migration 🔲
- [ ] Incrementally migrate components to TypeScript
- [ ] `supabase gen types typescript` for auto-generated DB types
- [ ] Type service-layer return shapes
- [ ] Enable `strict` mode

### 5.5 Future AI Features (stretch)
- [ ] `pgvector` extension on Supabase
- [ ] "Similar cards" via embedding similarity
- [ ] Smart recommendations
- [ ] Natural-language collection search

**Milestone:** Production-grade, tested, observable application with room for AI features.

---

## Tech Stack Summary

| Layer | Current (`main`, v0.4) | On `feat/nextjs-migration` (awaiting validation) | Stretch (Phase 5) |
|-------|------------------------|-----------------------------------------------|-------------------|
| Framework | React 19 + Vite 7 | React 19 + Next.js 16 (App Router) | + TypeScript |
| Server-state | TanStack Query v5 | TanStack Query v5 | — |
| Authentication | Supabase Auth (email + Google), localStorage tokens | Supabase Auth via `@supabase/ssr`, **HttpOnly cookies**, server-side validation in `proxy.js` | + GitHub OAuth (skipped) |
| Database | Supabase PostgreSQL, RLS enforced | (same) | + Postgres functions / views for stats |
| File Storage | Supabase Storage (`binder-covers` public bucket) | (same) | + image transforms |
| Card APIs | Pokemon TCG API + Scryfall (MTG) + YGOPRODeck + OPTCG | (same) | + price history |
| Styling | Custom CSS (`src/App.css`, ~2k lines) | (same) | — |
| Routing | `react-router-dom` v7 + `vercel.json` SPA fallback | App Router (server-side) | — |
| Testing | None | None | Vitest + RTL + Playwright |
| CI/CD | None | None | GitHub Actions |
| Hosting | Vercel (Production: `main`; Preview: `dev`) | Vercel (Preview: `feat/nextjs-migration`) | — |
| Monitoring | Vercel build logs only | (same) | Sentry + Plausible/GA |

---

## Resume Value By Phase

| Phase | Skills Demonstrated |
|-------|-------------------|
| Phase 1 | PostgreSQL, Supabase, Database Design, Row Level Security, Auth (OAuth), Data Migration, API Service Architecture, Git Workflow |
| Phase 2 | SQL Aggregations, Data Visualization, UI/UX Design, State Management, Caching Strategies |
| Phase 3 | GraphQL (Apollo Client), Multi-API Architecture, Data Normalization, Schema Migration, Database Indexing |
| Phase 4 | Social Features, Public APIs, URL Routing, Access Control Policies, Data Import/Export |
| Phase 5 | Testing (Unit/E2E), CI/CD (GitHub Actions), DevOps, Performance Optimization, TypeScript, pgvector/AI |

---

## Why Supabase Over Firebase (Decision Record)

This project migrates from Firebase Firestore to Supabase PostgreSQL for the following reasons:

1. **Relational data model** — PokeBinder's data (users → profiles → binders → cards) is inherently relational. PostgreSQL handles this natively with foreign keys and JOINs. Firestore required denormalization and client-side joins.

2. **SQL for statistics** — Dashboard queries like "total collection value" or "most valuable cards across all binders" are single SQL statements in Postgres. In Firestore, they require loading all documents client-side and aggregating in JavaScript.

3. **Row Level Security** — RLS policies enforce access control at the database level. Every query goes through the same security check regardless of how it's made. Firebase Security Rules only protect SDK access.

4. **Predictable pricing** — Supabase free tier includes 500MB database, 1GB storage, 50K MAUs, and unlimited API requests. Firebase charges per read/write operation, which can spike with large binder browsing.

5. **Resume value** — PostgreSQL and SQL are universally transferable skills. Supabase has grown 300% in developer adoption in 2025-2026. Firebase/Firestore knowledge is more niche and vendor-locked.

6. **Future-proof** — pgvector support enables AI features (semantic card search, recommendations) without adding another service. No equivalent exists in Firestore.

7. **No vendor lock-in** — Supabase is open-source and built on standard PostgreSQL. Data can be exported with `pg_dump` and moved anywhere. Firebase data requires proprietary export tools and format conversion.

---

## Working Conventions

- **Branching:** `main` (production) ← `dev` (integration) ← `feature/xxx` (individual features)
- **Commits:** Descriptive messages following conventional commits:
  - `feat: add login page with email/password auth`
  - `fix: resolve merge conflict in README`
  - `chore: migrate from Firebase to Supabase`
  - `refactor: extract card search into service layer`
  - `docs: update README with Supabase setup instructions`
- **PRs:** Every feature gets its own branch and a descriptive pull request
- **README:** Updated after every major feature addition
- **Database:** Schema changes tracked via Supabase migrations (version-controlled SQL files)
- **Code Reviews:** Claude reviews code for bugs, security, and best practices before merging