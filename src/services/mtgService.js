/**
 * Magic: The Gathering — Scryfall API integration
 * Docs: https://scryfall.com/docs/api
 * No API key required. Rate limit: ~10 req/sec.
 */

const BASE_URL = 'https://api.scryfall.com';
const CACHE_KEY = 'pkb_mtg_cache';
const CACHE_TTL = 15 * 60 * 1000;

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
 * Normalise a Scryfall card object to the shared display shape used
 * throughout the app (same `images` / `set` structure as Pokemon TCG API).
 * Double-faced cards use the front face image.
 */
export function normalizeMtgCard(card) {
  const front = card.card_faces?.[0];
  const imageSmall = card.image_uris?.small   ?? front?.image_uris?.small  ?? '';
  const imageLarge = card.image_uris?.normal  ?? front?.image_uris?.normal ?? '';
  const backSmall  = card.card_faces?.[1]?.image_uris?.small  ?? null;
  const backLarge  = card.card_faces?.[1]?.image_uris?.normal ?? null;

  return {
    id: card.id,
    name: card.name,
    images: { small: imageSmall, large: imageLarge },
    set: { name: card.set_name },
    number: card.collector_number ?? null,
    rarity: card.rarity ?? null,
    artist: card.artist ?? (front?.artist ?? null),
    _game: 'mtg',
    _price: parseFloat(card.prices?.usd) || parseFloat(card.prices?.usd_foil) || null,
    _backImage: backSmall ? { small: backSmall, large: backLarge } : null,
    _raw: card,
  };
}

/**
 * Map a normalised MTG card to binder_cards DB columns.
 */
export function mtgCardToDbRow(card) {
  return {
    card_api_id: card.id,
    card_name:   card.name,
    card_image_url: card.images.small,
    card_set:    card.set.name,
    card_game:   'mtg',
    card_price:  card._price,
    card_price_currency: 'USD',
  };
}

/**
 * Search MTG cards via Scryfall.
 * Scryfall returns up to 175 results per page.
 * Returns 404 (empty, no error) when nothing matches.
 */
export async function searchMtgCards(query, page = 1) {
  if (!query?.trim()) return { data: { results: [], totalPages: 0 }, error: null };

  const cacheKey = `mtg_${query.trim()}_p${page}`;
  const cache = readCache();
  const hit = cache[cacheKey];
  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    return { data: hit.data, error: null };
  }

  try {
    const url = `${BASE_URL}/cards/search?q=${encodeURIComponent(query.trim())}&page=${page}&order=name`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (res.status === 404) return { data: { results: [], totalPages: 0 }, error: null };
    if (!res.ok) throw new Error(`Scryfall ${res.status}`);

    const json = await res.json();
    const results = (json.data || []).map(normalizeMtgCard);
    // Scryfall returns 175 per page; estimate total pages from total_cards
    const totalPages = json.has_more ? Math.ceil((json.total_cards || results.length) / 175) : 1;

    writeCache({ ...cache, [cacheKey]: { data: { results, totalPages }, ts: Date.now() } });
    return { data: { results, totalPages }, error: null };
  } catch (err) {
    console.error('searchMtgCards error:', err);
    return { data: null, error: err };
  }
}
