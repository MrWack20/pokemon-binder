// Curated TCG news sources — the trust boundary for /api/news.
//
// ── Adding a source ────────────────────────────────────────────────────────
// 1. Find the publisher's RSS / Atom URL. Look for /feed, /rss, /atom on
//    their site, or in the page source as <link rel="alternate"
//    type="application/rss+xml">. Reddit subs always have /.rss.
// 2. Add an entry below with id, label, url, game, kind, maxItems.
// 3. Verify in the dev preview — dead feeds quietly omit themselves
//    (Promise.allSettled in route.js), so a typo won't break the page.
// 4. If the source proves unreliable (frequent downtime, off-topic spam,
//    affiliate dump posts), drop the entry. Curation IS the credibility
//    boundary.
//
// ── Field reference ───────────────────────────────────────────────────────
// id        Stable string used as the React key prefix and for analytics.
//           Must be unique within this file.
// label     Human-readable name shown on each card ("PokéBeach", etc.).
// url       The RSS/Atom feed URL. HTTPS only.
// game      One of 'pokemon' | 'mtg' | 'yugioh' | 'onepiece'. Drives the
//           per-game tab filter on the news section.
// kind      'publisher' or 'community'. Lets us style or sort differently
//           later if we want; today it's metadata only.
// maxItems  Cap how many items this single source can contribute per
//           refresh, so a high-volume feed can't crowd out the rest.
//           Defaults to 4 if omitted.

export const SOURCES = [
  // ── Pokémon TCG ─────────────────────────────────────────────────────────
  {
    id: 'pokebeach',
    label: 'PokéBeach',
    url: 'https://www.pokebeach.com/feed',
    game: 'pokemon',
    kind: 'publisher',
    maxItems: 4,
  },
  {
    id: 'bulbanews',
    label: 'Bulbanews',
    url: 'https://bulbanews.bulbagarden.net/wiki/?title=Special:RecentChanges&feed=rss',
    game: 'pokemon',
    kind: 'publisher',
    maxItems: 3,
  },
  {
    id: 'reddit-pokemontcg',
    label: 'r/PokemonTCG',
    url: 'https://www.reddit.com/r/PokemonTCG/top/.rss?t=week',
    game: 'pokemon',
    kind: 'community',
    maxItems: 3,
  },

  // ── Magic: The Gathering ────────────────────────────────────────────────
  {
    id: 'wotc',
    label: 'Wizards of the Coast',
    url: 'https://magic.wizards.com/en/rss/rss.xml',
    game: 'mtg',
    kind: 'publisher',
    maxItems: 4,
  },
  {
    id: 'mtgrocks',
    label: 'MTG Rocks',
    url: 'https://mtgrocks.com/feed/',
    game: 'mtg',
    kind: 'publisher',
    maxItems: 3,
  },
  {
    id: 'reddit-magictcg',
    label: 'r/magicTCG',
    url: 'https://www.reddit.com/r/magicTCG/top/.rss?t=week',
    game: 'mtg',
    kind: 'community',
    maxItems: 3,
  },

  // ── Yu-Gi-Oh! ───────────────────────────────────────────────────────────
  {
    id: 'ygorganization',
    label: 'YGOrganization',
    url: 'https://ygorganization.com/feed/',
    game: 'yugioh',
    kind: 'publisher',
    maxItems: 4,
  },
  {
    id: 'reddit-yugioh',
    label: 'r/yugioh',
    url: 'https://www.reddit.com/r/yugioh/top/.rss?t=week',
    game: 'yugioh',
    kind: 'community',
    maxItems: 3,
  },

  // ── One Piece TCG ───────────────────────────────────────────────────────
  // English-language publisher RSS for OPTCG is sparse — the game is
  // newer and most coverage lives on YouTube + Reddit. The subreddit
  // alone is currently the best signal we can aggregate via RSS.
  {
    id: 'reddit-onepiecetcg',
    label: 'r/OnePieceTCG',
    url: 'https://www.reddit.com/r/OnePieceTCG/top/.rss?t=week',
    game: 'onepiece',
    kind: 'community',
    maxItems: 3,
  },
  {
    id: 'reddit-optcg',
    label: 'r/OPTCG',
    url: 'https://www.reddit.com/r/OPTCG/top/.rss?t=week',
    game: 'onepiece',
    kind: 'community',
    maxItems: 3,
  },
];
