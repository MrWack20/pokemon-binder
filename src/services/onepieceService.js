/**
 * One Piece Card Game — OPTCG API integration
 * Docs: https://optcgapi.com/documentation
 * No API key required. Free REST API.
 */

const BASE_URL = 'https://www.optcgapi.com/api';
const CACHE_KEY = 'pkb_op_cache';
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
 * Normalise an OPTCG API card object to the shared display shape.
 */
export function normalizeOpCard(card) {
  return {
    id: card.card_set_id || String(card.id || ''),
    name: card.card_name || 'Unknown',
    images: {
      small: card.card_image || '',
      large: card.card_image || '',
    },
    set: { name: card.set_name || 'Unknown Set' },
    number: card.card_set_id || null,
    rarity: card.rarity || null,
    artist: null,
    _game: 'onepiece',
    _price: parseFloat(card.market_price) || parseFloat(card.inventory_price) || null,
    _backImage: null,
    _raw: card,
  };
}

/**
 * Map a normalised One Piece card to binder_cards DB columns.
 */
export function opCardToDbRow(card) {
  return {
    card_api_id: card.id,
    card_name: card.name,
    card_image_url: card.images.small,
    card_set: card.set.name,
    card_game: 'onepiece',
    card_price: card._price,
    card_price_currency: 'USD',
  };
}

/**
 * Search One Piece cards by name via OPTCG API.
 * Uses the filtered endpoint for sets + starter decks.
 */
export async function searchOpCards(query, page = 1) {
  if (!query?.trim()) return { data: { results: [], totalPages: 0 }, error: null };

  const cacheKey = `op_${query.trim()}_p${page}`;
  const cache = readCache();
  const hit = cache[cacheKey];
  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    return { data: hit.data, error: null };
  }

  try {
    // OPTCG API returns all matching cards at once; we paginate client-side
    const url = `${BASE_URL}/sets/filtered/?card_name=${encodeURIComponent(query.trim())}`;
    const res = await fetch(url);
    if (!res.ok && res.status !== 404) throw new Error(`OPTCG API ${res.status}`);

    let allCards = [];
    if (res.ok) {
      const json = await res.json();
      allCards = Array.isArray(json) ? json : (json.data || json.results || []);
    }

    // Also search starter decks
    try {
      const stUrl = `${BASE_URL}/decks/filtered/?card_name=${encodeURIComponent(query.trim())}`;
      const stRes = await fetch(stUrl);
      if (stRes.ok) {
        const stJson = await stRes.json();
        const stCards = Array.isArray(stJson) ? stJson : (stJson.data || stJson.results || []);
        // Deduplicate by card_set_id
        const existingIds = new Set(allCards.map(c => c.card_set_id));
        stCards.forEach(c => {
          if (!existingIds.has(c.card_set_id)) allCards.push(c);
        });
      }
    } catch { /* starter deck search is optional */ }

    const results = allCards.map(normalizeOpCard);
    const totalPages = Math.ceil(results.length / PAGE_SIZE);

    // Client-side pagination
    const start = (page - 1) * PAGE_SIZE;
    const pageResults = results.slice(start, start + PAGE_SIZE);

    const cacheData = { results: pageResults, totalPages };
    writeCache({ ...cache, [cacheKey]: { data: cacheData, ts: Date.now() } });
    return { data: cacheData, error: null };
  } catch (err) {
    console.error('searchOpCards error:', err);
    return { data: null, error: err };
  }
}

/**
 * Fetch all One Piece TCG sets.
 */
export async function getOpSets() {
  const SETS_CACHE = 'pkb_op_sets';
  try {
    const cached = localStorage.getItem(SETS_CACHE);
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < 24 * 60 * 60 * 1000) return { data, error: null };
    }
  } catch { /* ignore */ }

  try {
    const res = await fetch(`${BASE_URL}/allSets/`);
    if (!res.ok) throw new Error(`OPTCG API ${res.status}`);
    const json = await res.json();
    const sets = Array.isArray(json) ? json : (json.data || []);
    // Normalize to a common shape
    const normalized = sets.map(s => ({
      id: s.id || s.set_id,
      name: s.set_name || s.name || `Set ${s.id}`,
      total: s.card_count || s.total || 0,
      _raw: s,
    }));
    try { localStorage.setItem(SETS_CACHE, JSON.stringify({ data: normalized, ts: Date.now() })); } catch { }
    return { data: normalized, error: null };
  } catch (err) {
    console.error('getOpSets error:', err);
    return { data: null, error: err };
  }
}

/**
 * Fetch all cards in a specific One Piece set.
 */
export async function getOpSetCards(setId) {
  const cacheKey = `pkb_op_sc_${setId}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) return { data, error: null };
    }
  } catch { /* ignore */ }

  try {
    const res = await fetch(`${BASE_URL}/sets/${setId}/`);
    if (!res.ok) throw new Error(`OPTCG API ${res.status}`);
    const json = await res.json();
    const cards = Array.isArray(json) ? json : (json.data || json.results || []);
    const normalized = cards.map(normalizeOpCard);
    try { localStorage.setItem(cacheKey, JSON.stringify({ data: normalized, ts: Date.now() })); } catch { }
    return { data: normalized, error: null };
  } catch (err) {
    console.error('getOpSetCards error:', err);
    return { data: null, error: err };
  }
}
