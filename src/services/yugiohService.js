/**
 * Yu-Gi-Oh! — YGOPRODeck API integration
 * Docs: https://ygoprodeck.com/api-guide/
 * No API key required. Returns 400 when no cards found.
 */

const BASE_URL = 'https://db.ygoprodeck.com/api/v7';
const CACHE_KEY = 'pkb_ygo_cache';
const CACHE_TTL = 15 * 60 * 1000;
const PAGE_SIZE = 20;

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
  catch { return {}; }
}
function writeCache(cache) {
  try {
    const entries = Object.entries(cache);
    const pruned = entries.length > 40
      ? Object.fromEntries(entries.sort((a, b) => b[1].ts - a[1].ts).slice(0, 40))
      : cache;
    localStorage.setItem(CACHE_KEY, JSON.stringify(pruned));
  } catch { /* storage full */ }
}

/**
 * Normalise a YGOPRODeck card object to the shared display shape.
 */
export function normalizeYgoCard(card) {
  return {
    id: String(card.id),
    name: card.name,
    images: {
      small: card.card_images?.[0]?.image_url_small ?? '',
      large: card.card_images?.[0]?.image_url       ?? '',
    },
    set: { name: card.card_sets?.[0]?.set_name ?? 'Unknown Set' },
    number: card.card_sets?.[0]?.set_code ?? null,
    rarity: card.card_sets?.[0]?.set_rarity ?? null,
    artist: null,
    _game: 'yugioh',
    _price: parseFloat(card.card_prices?.[0]?.tcgplayer_price) || null,
    _backImage: null,
    _raw: card,
  };
}

/**
 * Map a normalised YGO card to binder_cards DB columns.
 */
export function ygoCardToDbRow(card) {
  return {
    card_api_id: card.id,
    card_name:   card.name,
    card_image_url: card.images.small,
    card_set:    card.set.name,
    card_game:   'yugioh',
    card_price:  card._price,
    card_price_currency: 'USD',
  };
}

/**
 * Search Yu-Gi-Oh! cards via YGOPRODeck.
 * Uses `fname` (fuzzy name) parameter.
 * Returns 400 when nothing matches — treated as empty result.
 */
export async function searchYgoCards(query, page = 1) {
  if (!query?.trim()) return { data: { results: [], totalPages: 0 }, error: null };

  const cacheKey = `ygo_${query.trim()}_p${page}`;
  const cache = readCache();
  const hit = cache[cacheKey];
  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    return { data: hit.data, error: null };
  }

  try {
    const offset = (page - 1) * PAGE_SIZE;
    const url = `${BASE_URL}/cardinfo.php?fname=${encodeURIComponent(query.trim())}&num=${PAGE_SIZE}&offset=${offset}`;
    const res = await fetch(url);
    // YGOPRODeck returns 400 (Bad Request) for empty results, not 404
    if (res.status === 400 || res.status === 404) {
      return { data: { results: [], totalPages: 0 }, error: null };
    }
    if (!res.ok) throw new Error(`YGOPRODeck ${res.status}`);

    const json = await res.json();
    const results = (json.data || []).map(normalizeYgoCard);
    const totalRows = json.meta?.total_rows ?? results.length;
    const totalPages = Math.ceil(totalRows / PAGE_SIZE);

    writeCache({ ...cache, [cacheKey]: { data: { results, totalPages }, ts: Date.now() } });
    return { data: { results, totalPages }, error: null };
  } catch (err) {
    console.error('searchYgoCards error:', err);
    return { data: null, error: err };
  }
}
