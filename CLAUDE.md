# PokeBinder — Claude Context

## Project Overview

PokeBinder is a web app for organizing and showcasing a Pokemon TCG collection digitally.
Built by MrWack (GitHub: MrWack20). Repo: https://github.com/MrWack20/pokemon-binder

**Stack:** React 19, Vite 7, Supabase (auth + Postgres + Storage), Pokemon TCG API, Lucide React, React Router DOM v7.

---

## Supabase Project

- **URL:** https://ssdmmlxnzlgjriqddpin.supabase.co
- **Anon key:** stored in `.env` as `VITE_SUPABASE_ANON_KEY`
- **Storage bucket required:** `binder-covers` — must be created manually in Supabase dashboard (Storage → New bucket → name: `binder-covers` → Public: true)

---

## Database Schema

Migration file: `supabase/migrations/001_initial_schema.sql`

| Table | Key columns |
|---|---|
| `profiles` | id, user_id (FK → auth.users, unique), name, avatar_url, created_at |
| `binders` | id, profile_id (FK → profiles, cascade), name, rows, cols, pages, cover_color, cover_text, cover_image_url, created_at |
| `binder_cards` | id, binder_id (FK → binders, cascade), slot_index, card_api_id, card_name, card_image_url, card_set, card_game, card_price, card_price_currency, added_at |

RLS is enabled on all three tables. Policies enforce that users can only access their own data.
`UNIQUE(binder_id, slot_index)` constraint on binder_cards.

**The schema SQL has been written but NOT yet applied to the Supabase project.**
Run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL Editor before testing end-to-end.

---

## Git Branch Structure

`main` is production. `dev` is the integration branch. All feature branches were created from `dev`.

| Branch | Status | What it does |
|---|---|---|
| `main` | clean | Production — only has original README fix |
| `dev` | **current, up to date** | All Phase 1 merged in, pushed to origin |
| `feature/secure-env` | merged ✅ | Moved Firebase + TCG API keys to `.env` / `import.meta.env` |
| `feature/supabase-setup` | merged ✅ | Added `src/supabase.js`, installed `@supabase/supabase-js`, SQL migration file |
| `feature/service-layer` | merged ✅ | Created `src/services/` — all 5 service files |
| `feature/auth-ui` | merged ✅ | Login/Register/ForgotPassword, AuthContext, ProtectedRoute, UserMenu, React Router |
| `feature/migrate-to-supabase` | merged ✅ | Full Firebase removal, all components migrated to Supabase |

---

## Key Architectural Decisions

1. **One profile per user** — `profiles.user_id` is UNIQUE. Profile is auto-created on first sign-up in `AuthContext.ensureProfile()` using OAuth display name or email prefix as the name.

2. **Card storage model** — Cards are individual rows in `binder_cards` with `slot_index`. `App.jsx` reconstructs a flat slot array (`buildCardsArray`) for `BinderView` to consume. `BinderView`'s internal slot-index logic is unchanged.

3. **Drag/drop** — `BinderView` passes absolute slot indices to `onSwapCards`. `App.jsx` looks up the DB row UUID from the local cards array before calling `swapCards` or `moveCard` in the service layer.

4. **Cover images** — `EditBinderCover` stores a `File` object locally and passes it up via `onSave(coverData, imageFile)`. `App.jsx` handles the actual upload via `uploadBinderCover()` → Supabase Storage bucket `binder-covers`.

5. **Search results vs binder cards** — TCG API objects (`card.images.small`, `card.name`) are only used in the search results panel. The binder grid renders DB row objects (`card.card_image_url`, `card.card_name`, `card.card_price`).

6. **`swapCards` sentinel** — Uses slot `-1` as a temporary position to work around the `UNIQUE(binder_id, slot_index)` DB constraint during a 3-step swap sequence.

7. **`getBinders` count** — `binderService.getBinders()` uses `.select('*, binder_cards(count)')` so each binder comes back with `binder.binder_cards[0].count` for the card count display in `BindersView`.

---

## File Structure

```
src/
  App.jsx                        ← BrowserRouter root + AuthProvider + Dashboard component
  supabase.js                    ← Supabase client (reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
  contexts/
    AuthContext.jsx              ← user, profile, loading, signIn, signUp, signOut
  services/
    supabaseAuth.js              ← signUp, signIn, signInWithGoogle, signOut, onAuthStateChange, resetPassword
    profileService.js            ← getProfile, createProfile, updateProfile, deleteProfile
    binderService.js             ← getBinders (with card count), createBinder, updateBinder, deleteBinder, duplicateBinder
    cardService.js               ← getBinderCards, addCard (upsert), removeCard, moveCard, swapCards
    searchService.js             ← searchCards, getSets (Pokemon TCG API)
  components/
    Auth/
      LoginPage.jsx              ← email/password + Google OAuth button
      RegisterPage.jsx
      ForgotPasswordPage.jsx
      ProtectedRoute.jsx         ← redirects to /login if unauthenticated
      UserMenu.jsx               ← header avatar dropdown with sign out
    BindersView.jsx              ← uses snake_case fields: cover_color, cover_text, cover_image_url
    BinderView.jsx               ← grid renders card.card_image_url / card.card_name / card.card_price
    EditBinderCover.jsx          ← passes File object up to App.jsx for Supabase Storage upload
    ProfilesView.jsx             ← shows single user profile, allows rename via updateProfile
    SettingsPanel.jsx            ← background themes (unchanged from original)
  constants/
    themes.js                   ← BACKGROUND_THEMES + API_KEY (reads from import.meta.env)
supabase/
  migrations/
    001_initial_schema.sql      ← full schema: tables, RLS policies, indexes
```

---

## Environment Variables

`.env` is gitignored. Template is `.env.example`.

```
VITE_POKEMON_TCG_API_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_FIREBASE_API_KEY=          # no longer used — kept in .env.example for reference
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

---

## Phase 1 Status

### Done ✅
- Secrets moved to `.env`
- Supabase client initialized
- Full SQL schema written (profiles, binders, binder_cards, RLS, indexes)
- Service layer: auth, profiles, binders, cards, search
- Auth UI: Login, Register, ForgotPassword, ProtectedRoute, UserMenu
- AuthContext with session persistence and auto-profile creation on sign-up
- All components migrated from Firebase to Supabase data model
- Firebase fully removed (`npm uninstall firebase`, `src/firebase.js` deleted)
- All 5 feature branches merged into `dev`, pushed to origin
- Build: 469 KB gzipped / clean

### Pending ⏳
- [ ] Apply `supabase/migrations/001_initial_schema.sql` in Supabase SQL Editor
- [ ] Create `binder-covers` storage bucket in Supabase dashboard (public)
- [ ] Enable Google OAuth provider in Supabase Auth settings
- [ ] Update README.md for Supabase + auth (started — needs ROADMAP.md content first)
- [ ] Add ROADMAP.md to project root
- [ ] Open PR: `dev` → `main`
- [ ] Phase 2 (per roadmap)
