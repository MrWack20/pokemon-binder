// TCGdex (https://tcgdex.dev) — multi-language Pokémon TCG data.
//
// We use this when the user picks a non-English language for Pokémon
// search or sets browser. English stays on pokemontcg.io for the better
// English data (TCGPlayer prices, full text search, etc.). TCGdex's
// strength is being the only open API that covers Japan-only sets,
// Korean releases, and Chinese-Traditional releases.
//
// API quick reference:
//   GET https://api.tcgdex.net/v2/{lang}/cards            list/search
//   GET https://api.tcgdex.net/v2/{lang}/cards/{cardId}   full card
//   GET https://api.tcgdex.net/v2/{lang}/sets             all sets
//   GET https://api.tcgdex.net/v2/{lang}/sets/{setId}     set + its cards
//
// Image URLs come back as a base path; append `/<quality>.<ext>` where
// quality ∈ {low, medium, high} and ext ∈ {webp, png}. We use
// `low.webp` for thumbnails and `high.webp` for the detail modal.

const BASE_URL = 'https://api.tcgdex.net/v2';

// Language codes TCGdex supports (as of late 2025). zh-cn / Simplified
// Chinese is NOT in their catalog — only zh-tw (Traditional). Keep this
// list authoritative; the UI dropdown reads from it.
export const TCGDEX_LANGS = [
  { code: 'en',    label: 'English' },
  { code: 'ja',    label: '日本語 · Japanese' },
  { code: 'ko',    label: '한국어 · Korean' },
  { code: 'zh-tw', label: '繁體中文 · Chinese (Traditional)' },
  { code: 'fr',    label: 'Français · French' },
  { code: 'de',    label: 'Deutsch · German' },
  { code: 'es',    label: 'Español · Spanish' },
  { code: 'it',    label: 'Italiano · Italian' },
  { code: 'pt-br', label: 'Português · Portuguese (BR)' },
  { code: 'id',    label: 'Bahasa Indonesia · Indonesian' },
  { code: 'th',    label: 'ไทย · Thai' },
];

// Whether the language has TCGdex coverage (i.e., we should route to
// this service vs. fall through to pokemontcg.io).
export function isTcgdexLang(code) {
  return TCGDEX_LANGS.some(l => l.code === code);
}

// ── HTTP helpers ────────────────────────────────────────────────────────────
async function getJson(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`TCGdex ${res.status} for ${path}`);
  return res.json();
}

// ── Image URL builder ───────────────────────────────────────────────────────
// `card.image` is the base path (no extension). Some cards have no image
// at all (very old promos) — return null in that case so the UI shows the
// placeholder rectangle.
function imageUrls(base) {
  if (!base) return { small: null, large: null };
  return {
    small: `${base}/low.webp`,
    large: `${base}/high.webp`,
  };
}

// ── Card normaliser ─────────────────────────────────────────────────────────
//
// Maps a TCGdex card object (brief or full) to the shared display shape
// the rest of the app uses for all four games. Sets `_game: 'pokemon'`
// and `_lang` so DashboardShell can later dispatch the right db-row mapper.
function normalizeCard(card, lang) {
  return {
    id: card.id,
    name: card.name,
    images: imageUrls(card.image),
    // The brief endpoint omits set; the full endpoint includes it nested.
    // localId is the printed collector number ("1/124" etc.).
    set: card.set
      ? { name: card.set.name, id: card.set.id }
      : { name: '' },
    number: card.localId,
    _game: 'pokemon',
    _lang: lang,
    _price: null, // TCGdex pricing is cardmarket-EUR and we don't standardise on it yet
    _raw: card,
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Free-text search across all cards in the chosen language.
 * Returns up to `pageSize` matches; TCGdex's pagination is implicit
 * (returns all matches up to the configured page), so we always start
 * at page 1 and let the UI request more later if needed.
 */
export async function searchTcgdexPokemon(query, lang = 'en', page = 1, pageSize = 24) {
  if (!query?.trim()) {
    return { data: { results: [], totalPages: 0 }, error: null };
  }
  try {
    const path = `/${lang}/cards?name=${encodeURIComponent(query.trim())}&pagination:page=${page}&pagination:itemsPerPage=${pageSize}`;
    const data = await getJson(path);
    // TCGdex returns an array of brief cards.
    const list = Array.isArray(data) ? data : (data.items || []);
    return {
      data: {
        results: list.map(c => normalizeCard(c, lang)),
        // Without a totalCount header we assume "got pageSize = there's more".
        totalPages: list.length >= pageSize ? page + 1 : page,
      },
      error: null,
    };
  } catch (err) {
    console.error('[tcgdex] search error:', err);
    return { data: null, error: err };
  }
}

/**
 * List every set available in the chosen language.
 * Sets are returned sorted by release date (newest first).
 */
export async function getTcgdexPokemonSets(lang = 'en') {
  try {
    const data = await getJson(`/${lang}/sets`);
    const list = Array.isArray(data) ? data : (data.items || []);
    // Normalise to the same shape as pokemontcg.io's getSets:
    //   { id, name, images: { logo }, total, releaseDate, series }
    const sets = list.map(s => ({
      id: s.id,
      name: s.name,
      images: { logo: s.logo ? `${s.logo}.png` : null, symbol: s.symbol ? `${s.symbol}.png` : null },
      total: s.cardCount?.total ?? 0,
      printedTotal: s.cardCount?.official ?? s.cardCount?.total ?? 0,
      releaseDate: s.releaseDate,
      series: s.serie?.name,
      _lang: lang,
    }));
    // Newest first (matches pokemontcg.io's default order).
    sets.sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0));
    return { data: sets, error: null };
  } catch (err) {
    console.error('[tcgdex] sets error:', err);
    return { data: null, error: err };
  }
}

/**
 * Fetch every card in a given set, in the chosen language.
 */
export async function getTcgdexPokemonSetCards(setId, lang = 'en') {
  try {
    const data = await getJson(`/${lang}/sets/${setId}`);
    const list = data.cards || [];
    // The set endpoint returns brief cards without their `set` field
    // populated — we know the set, so attach it manually.
    return {
      data: list.map(c =>
        normalizeCard({ ...c, set: { id: data.id, name: data.name } }, lang)
      ),
      error: null,
    };
  } catch (err) {
    console.error('[tcgdex] set-cards error:', err);
    return { data: null, error: err };
  }
}

/**
 * Convert a normalised TCGdex card (the shape that flows through search
 * results) into the `binder_cards` DB row shape for adding to a binder.
 * Mirrors the per-game mappers in mtgService / yugiohService / onepieceService.
 */
export function tcgdexPokemonCardToDbRow(card) {
  return {
    card_api_id: card.id,
    card_name: card.name,
    card_image_url: card.images?.small || card.images?.large || '',
    card_set: card.set?.name || null,
    card_game: 'pokemon',
    card_price: null, // TCGdex prices are cardmarket-EUR; not unified with our USD pipeline
    card_price_currency: 'USD',
  };
}
