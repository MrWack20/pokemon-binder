# PokeBinder — Development Roadmap (v2)

> **Project Goal:** Transform PokeBinder from a single-game collection tool into a full-featured, multi-game trading card collection platform with authentication, real-time data, and production-grade infrastructure — powered by Supabase (PostgreSQL).

---

## Current State (v0.1 — MVP)

**What exists today:**
- React 19 + Vite 7 frontend
- Firebase Firestore for profile/binder data persistence (to be replaced)
- Pokemon TCG API integration with search, filters, and pagination
- Customizable binder layouts (NxN grids, adjustable pages)
- Binder cover personalization (color, text, uploaded images)
- Multiple profile support (no auth — anyone can access any profile)
- Drag-and-drop card rearrangement within binders
- Card market pricing display (Cardmarket EUR)
- Background theme selector (Pokeball-inspired themes)
- Real-time Firebase sync indicator

**Known Issues:**
- README has an unresolved merge conflict
- API keys and Firebase credentials are hardcoded in source code (not in .env)
- No user authentication — anyone can access/modify any profile
- Firebase Auth is imported but never implemented
- Data model is denormalized (entire binder + all card data stored as one nested Firestore document)
- No input validation or error boundaries
- No responsive design considerations
- Search cache is in-memory only (lost on refresh)

---

## Phase 1 — Foundation, Supabase Migration & Auth (Week 1-3)

*Priority: Fix what's broken, migrate from Firebase to Supabase, implement authentication, and set up proper development workflow. This is the largest phase because it rebuilds the foundation everything else depends on.*

### 1.1 Repository Hygiene
- [ ] Fix README merge conflict
- [ ] Write comprehensive README (project overview, setup instructions, tech stack, screenshots, contributing guide)
- [ ] Set up `.env` file and move all secrets (API keys, Supabase URL/keys) out of source code
- [ ] Add `.env.example` with placeholder values
- [ ] Update `.gitignore` to include `.env`
- [ ] Set up proper Git branching strategy (main → dev → feature branches)
- [ ] Add descriptive commit message conventions (conventional commits)

### 1.2 Supabase Project Setup
- [ ] Create a Supabase project (free tier: 500MB database, 1GB storage, 50K MAUs)
- [ ] Design relational database schema:
  ```
  users (managed by Supabase Auth)
    └── profiles (id, user_id FK, name, avatar_url, created_at)
          └── binders (id, profile_id FK, name, rows, cols, pages, cover_color, cover_text, cover_image_url, created_at)
                └── binder_cards (id, binder_id FK, slot_index, card_api_id, card_name, card_image_url, card_set, card_game, card_price, added_at)
  ```
- [ ] Create database tables with proper foreign keys, constraints, and indexes
- [ ] Set up Row Level Security (RLS) policies:
  - Users can only SELECT/INSERT/UPDATE/DELETE their own profiles
  - Users can only access binders belonging to their profiles
  - Public binders are readable by anyone (for Phase 4 sharing)
- [ ] Install Supabase JS client (`@supabase/supabase-js`)
- [ ] Create a `supabase.js` config file (replaces `firebase.js`)
- [ ] Set up Supabase Storage bucket for binder cover images (replaces base64 in Firestore)

### 1.3 Data Migration (Firebase → Supabase)
- [ ] Write a one-time migration script to move existing Firestore data into Supabase tables
- [ ] Normalize the denormalized Firestore documents into relational tables
- [ ] Store card images as API references (card_api_id + image URL) instead of duplicating full card objects
- [ ] Move binder cover images from base64 strings to Supabase Storage (proper file hosting)
- [ ] Remove all Firebase dependencies (`firebase` package, `firebase.js` config)
- [ ] Update all components to use Supabase client instead of Firestore SDK
- [ ] Test data integrity after migration

### 1.4 Supabase Authentication
- [ ] Implement Supabase Auth with email/password sign-up and login
- [ ] Add Google OAuth as an alternative login method
- [ ] Add GitHub OAuth (optional — good for developer portfolio appeal)
- [ ] Create login/register page components with proper form validation
- [ ] Add protected routes — redirect unauthenticated users to login
- [ ] Link each profile to the authenticated user's UUID via `auth.users`
- [ ] Add a user menu in the header (avatar, display name, logout)
- [ ] Implement session persistence (Supabase handles this via refresh tokens)
- [ ] Add password reset flow (Supabase has built-in magic link support)
- [ ] Add email verification flow

### 1.5 API Service Layer
- [ ] Create a `services/` directory with abstracted data access functions
- [ ] Build `profileService.js` — CRUD operations for profiles via Supabase
- [ ] Build `binderService.js` — CRUD operations for binders via Supabase
- [ ] Build `cardService.js` — add/remove/move cards within binders via Supabase
- [ ] Build `authService.js` — login, signup, logout, session management
- [ ] Centralize error handling for all Supabase operations
- [ ] Add real-time subscriptions for live sync (Supabase Realtime replaces Firestore onSnapshot)

### 1.6 Code Quality & Error Handling
- [ ] Add React Error Boundaries to catch component crashes gracefully
- [ ] Add form validation (profile names, binder settings, search inputs)
- [ ] Add loading skeletons instead of blank screens
- [ ] Add toast notification system for success/error feedback (replace all alert() calls)
- [ ] Add PropTypes or begin TypeScript migration (recommended for resume)

### 1.7 Responsive Design
- [ ] Make the app fully responsive (mobile, tablet, desktop)
- [ ] Adjust binder grid to adapt to screen size
- [ ] Add a mobile-friendly navigation (hamburger menu or bottom nav)
- [ ] Ensure search panel and filters work on small screens
- [ ] Test touch interactions for drag-and-drop on mobile

**Milestone:** A clean, secure, authenticated app running on Supabase with a proper relational database, RLS security, and professional Git workflow.

---

## Phase 2 — Core Feature Enhancements (Week 4-6)

*Priority: Make the existing Pokemon experience best-in-class before expanding to multi-game. The relational database now makes complex queries simple.*

### 2.1 Enhanced Card Search & Discovery
- [ ] Add autocomplete/suggestions as user types card names
- [ ] Add "Browse by Set" view — show all sets with logos, select to see all cards
- [ ] Add set completion tracking (query: count cards in binder where set = X vs total cards in set)
- [ ] Add sorting options (by price, name, number, rarity, release date)
- [ ] Implement search history (store recent searches per user in Supabase)
- [ ] Add card detail modal (full card image, all pricing sources, set info, card stats)
- [ ] Persist search cache to localStorage for faster repeat searches

### 2.2 Collection Statistics & Dashboard
- [ ] Create a dashboard/home page after login with collection overview
- [ ] Show total collection value (SQL: `SELECT SUM(card_price) FROM binder_cards WHERE user_id = ?`)
- [ ] Show collection breakdown by set, type, rarity (SQL aggregations with GROUP BY — trivial with Postgres)
- [ ] Display most valuable cards across all binders (SQL: `ORDER BY card_price DESC LIMIT 10`)
- [ ] Show recently added cards timeline (SQL: `ORDER BY added_at DESC`)
- [ ] Add collection growth over time (track `added_at` timestamps, chart with Recharts)
- [ ] Create Supabase database views for common statistics queries (reusable, performant)

### 2.3 Binder Experience Improvements
- [ ] Add binder duplication (SQL: `INSERT INTO binders ... SELECT ... FROM binders WHERE id = ?`)
- [ ] Add binder export as image/PDF (html2canvas or puppeteer for screenshots)
- [ ] Add "quick fill" — auto-populate a binder with all cards from a specific set
- [ ] Allow reordering pages within a binder
- [ ] Add multi-select to move/remove multiple cards at once
- [ ] Add "card details" tooltip on hover (name, set, price, rarity)
- [ ] Implement undo/redo for card placement actions
- [ ] Add binder sorting (alphabetical, by date created, by total value)

### 2.4 Pricing Enhancements
- [ ] Show price trends (store historical price snapshots in a `price_history` table)
- [ ] Add TCGPlayer pricing alongside Cardmarket
- [ ] Add currency selection (EUR, USD, GBP) — store user preference in profiles table
- [ ] Show total page value on each binder page
- [ ] Add price alerts via Supabase Edge Functions (notify when price changes significantly) — future

**Milestone:** A polished, feature-rich Pokemon card collection manager with powerful SQL-driven statistics.

---

## Phase 3 — Multi-Game Expansion via Scrydex API (Week 7-9)

*Priority: Expand from Pokemon-only to a universal trading card platform. This is the major resume differentiator.*

### 3.1 Scrydex API Integration
- [ ] Research and validate Scrydex API availability and endpoints
- [ ] Set up GraphQL client (Apollo Client or urql)
- [ ] Create an API service layer that abstracts Pokemon TCG API and Scrydex
- [ ] Implement fallback logic: try Scrydex first, fall back to Pokemon TCG API for Pokemon cards
- [ ] Add data normalization layer (map different API responses to a unified card model)

### 3.2 Multi-Game Support
- [ ] Add `game` column to `binder_cards` table and `default_game` to `binders` table
- [ ] Add game selector to the UI (Pokemon TCG, Magic: The Gathering, Yu-Gi-Oh!, One Piece, etc.)
- [ ] Allow binders to be tagged by game type
- [ ] Add game-specific search filters (e.g., MTG has "color identity", Yu-Gi-Oh has "attribute")
- [ ] Support cross-game binders (mixed collections)
- [ ] Update dashboard statistics to show per-game and cross-game totals
- [ ] SQL makes this easy: `SELECT game, COUNT(*), SUM(card_price) FROM binder_cards GROUP BY game`

### 3.3 Enhanced Pricing (Multi-Source)
- [ ] Aggregate pricing from TCGPlayer, Cardmarket, and eBay via Scrydex
- [ ] Show price comparison across marketplaces
- [ ] Let users set a preferred marketplace for default pricing (stored in user profile)
- [ ] Add historical price charts per card (store in `price_history` table, chart with Recharts)

### 3.4 Database Schema Updates
- [ ] Add migration for new columns (`game`, `marketplace_preference`, etc.)
- [ ] Create a `card_cache` table to locally cache API card data (reduce external API calls)
- [ ] Add database indexes on frequently queried columns (game, set, card_api_id)
- [ ] Create database views for cross-game statistics
- [ ] Write migration script for existing Pokemon-only binder_cards to include `game: 'pokemon'`

**Milestone:** A universal trading card collection platform supporting 5+ games with GraphQL integration.

---

## Phase 4 — Social & Sharing Features (Week 10-11)

*Priority: Add community features that make the app shareable and social. Supabase RLS makes permission management clean.*

### 4.1 Public Profiles & Sharing
- [ ] Add `is_public` boolean column to `binders` and `profiles` tables
- [ ] Add RLS policy: `SELECT` allowed on binders where `is_public = true` (no auth required)
- [ ] Generate shareable links for individual binders (read-only public view)
- [ ] Add an embeddable widget (share binder on forums/social media via iframe or OG tags)
- [ ] Create a public gallery page showing featured/popular binders
- [ ] Add React Router for proper URL-based navigation (required for shareable links)

### 4.2 Wishlist & Trading
- [ ] Create a `wishlists` table (user_id, card_api_id, card_name, card_game, priority, added_at)
- [ ] Add a wishlist UI — cards you want but don't have yet
- [ ] Show "have/want" indicators on card search results (cross-reference binder_cards and wishlists)
- [ ] Create a `trade_list` table (cards you're willing to trade)
- [ ] Notify users when another user has a card they want (Supabase Edge Functions + Realtime) — future

### 4.3 Import/Export
- [ ] Export collection as CSV/JSON for backup (SQL query → download)
- [ ] Import cards from CSV (bulk insert into binder_cards)
- [ ] Export binder as printable PDF (html2canvas per page → jsPDF)

**Milestone:** A social, shareable collection platform with public binders and wishlists.

---

## Phase 5 — Production & Performance (Week 12-13)

*Priority: Make it production-ready, fast, and maintainable.*

### 5.1 Performance Optimization
- [ ] Implement lazy loading for binder pages and card images
- [ ] Add image optimization (WebP format, responsive sizes via Supabase Storage transforms)
- [ ] Add virtual scrolling for large search results (react-window or react-virtuoso)
- [ ] Implement service worker for offline support (PWA)
- [ ] Add request debouncing for search autocomplete
- [ ] Optimize Supabase queries (use `.select()` to only fetch needed columns, add proper indexes)
- [ ] Use Supabase database functions for complex aggregations (run on server, not client)

### 5.2 Testing
- [ ] Add unit tests (Vitest + React Testing Library)
- [ ] Add integration tests for Supabase operations (use Supabase local dev for testing)
- [ ] Add end-to-end tests (Playwright or Cypress)
- [ ] Set up CI/CD pipeline (GitHub Actions) — lint, test, build on every PR

### 5.3 Deployment & DevOps
- [ ] Deploy frontend to Vercel (integrates natively with Supabase)
- [ ] Set up staging and production Supabase projects (separate environments)
- [ ] Add environment-based configuration (.env.local, .env.production)
- [ ] Set up error monitoring (Sentry)
- [ ] Add analytics (Google Analytics or Plausible)
- [ ] Set up Supabase database backups (automatic on Pro plan, manual export on free)

### 5.4 TypeScript Migration (Optional but Recommended)
- [ ] Incrementally migrate components to TypeScript
- [ ] Use Supabase CLI to auto-generate TypeScript types from database schema (`supabase gen types`)
- [ ] Add type definitions for card models, API responses, service functions
- [ ] Add strict mode TypeScript config

### 5.5 Future AI Features (Stretch Goals)
- [ ] Enable `pgvector` extension in Supabase for vector embeddings
- [ ] Add "similar cards" feature using embedding similarity search
- [ ] Add smart collection recommendations ("you might also like...")
- [ ] Add natural language collection search ("show me all my holographic fire types worth over $10")

**Milestone:** A production-grade, tested, deployed application with room for AI features.

---

## Tech Stack Summary (Final State)

| Layer | Current | Target |
|-------|---------|--------|
| Framework | React 19 + Vite 7 | React 19 + Vite 7 (+ TypeScript) |
| State Management | useState/props drilling | React Context + useReducer (or Zustand) |
| Authentication | None (Firebase Auth imported but unused) | Supabase Auth (email + Google/GitHub OAuth) |
| Database | Firebase Firestore (NoSQL, denormalized) | Supabase PostgreSQL (relational, normalized, RLS) |
| File Storage | Base64 strings in Firestore documents | Supabase Storage (proper CDN-backed file hosting) |
| Card API | Pokemon TCG API (REST) | Scrydex API (GraphQL) + Pokemon TCG fallback |
| Styling | Custom CSS | Custom CSS + component library consideration |
| Routing | None (view state in useState) | React Router (URL-based navigation) |
| Testing | None | Vitest + RTL + Playwright |
| CI/CD | None | GitHub Actions |
| Hosting | None (local dev only) | Vercel (frontend) + Supabase (backend) |
| Monitoring | None | Sentry + Analytics |

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