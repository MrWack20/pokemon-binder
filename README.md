# PokeBinder

A web app for organizing and showcasing your Pokémon TCG collection digitally — so you never have to lug your physical binder around again.

Built by MrWack.

**Live app:** deployed on Vercel

---

## Features

- **Auth** — email/password sign-up & login, Google OAuth, password reset via email
- **Custom binders** — configure rows, columns, and pages per binder; custom cover color, text, and image
- **Card search** — search the full Pokémon TCG catalog via the Pokémon TCG API with set, type, rarity, and supertype filters
- **Drag & drop** — rearrange cards within a binder (pointer + touch support)
- **Card prices** — displays cardmarket average sell price (EUR) on each card
- **Background themes** — customizable app background via Settings
- **Cloud sync** — all data synced to Supabase Postgres (per-user, RLS enforced)
- **Cover images** — upload a cover photo stored in Supabase Storage

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 7 |
| Auth & Database | Supabase (Postgres + Auth + Storage) |
| Drag & Drop | @dnd-kit/core |
| Toasts | react-hot-toast |
| Card data | Pokémon TCG API |
| Icons | Lucide React |
| Routing | React Router DOM v7 |
| Deployment | Vercel |

---

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/MrWack20/pokemon-binder.git
cd pokemon-binder

# 2. Install dependencies
npm install

# 3. Create a .env file
cp .env.example .env
# Fill in your Supabase URL, anon key, and Pokemon TCG API key
```

### Environment variables

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_POKEMON_TCG_API_KEY=your_pokemon_tcg_api_key
```

### Supabase setup

1. Apply the schema: run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL Editor
2. Create a public storage bucket named `binder-covers` (Storage → New bucket)
3. Enable Google OAuth in Supabase Auth settings (if using Google sign-in)

### Dev server

```bash
npm run dev
```

---

## Project Status

Core features complete. See [ROADMAP.md](./ROADMAP.md) for upcoming phases.
