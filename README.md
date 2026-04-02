# PokeBinder

A web app for organizing and showcasing your Pokemon TCG collection digitally — so you never have to lug your physical binder around again.

Built by MrWack.

---

## Features

- **Multi-profile support** — create separate profiles for different collectors
- **Custom binders** — configure binder size (rows, columns, pages) per binder
- **Card search** — search the full Pokemon TCG catalog via the Pokemon TCG API
- **Advanced filters** — filter by set, type, rarity, supertype, and language
- **Drag & drop** — rearrange cards within a binder by dragging
- **Real-time sync** — data synced to Firebase Firestore with localStorage fallback
- **Background themes** — customizable app background themes via Settings
- **Binder cover editing** — customize the name and appearance of each binder

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Build tool | Vite 7 |
| Database | Firebase Firestore (migrating to Supabase) |
| Card data | [Pokemon TCG API](https://pokemontcg.io/) |
| Icons | Lucide React |

---

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/MrWack20/pokemon-binder.git
cd pokemon-binder

# 2. Install dependencies
npm install

# 3. Create a .env file in the project root
cp .env.example .env
# Fill in your Firebase config and Pokemon TCG API key

# 4. Start the dev server
npm run dev
```

### Environment variables

Create a `.env` file with the following:

```
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_POKEMON_TCG_API_KEY=your_pokemon_tcg_api_key
```

---

## Project Status

**Under active development.** Core binder and card management features are functional. The project is currently being expanded with authentication, Supabase migration, and additional features. See the roadmap below.

---

## Roadmap

See [ROADMAP_v2.md](./ROADMAP_v2.md) for the full planned feature roadmap.
