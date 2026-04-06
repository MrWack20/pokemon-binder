import { API_KEY } from '../constants/themes.js';

const BASE_URL = 'https://api.pokemontcg.io/v2';
const PAGE_SIZE = 20;
const CACHE_KEY = 'pkb_search_cache';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const RECENT_KEY = 'pkb_recent_searches';

function getHeaders() {
  return API_KEY ? { 'X-Api-Key': API_KEY } : {};
}

// ── Search cache (localStorage, TTL-based) ────────────────────────────────────

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
  catch { return {}; }
}

function writeCache(cache) {
  try {
    const entries = Object.entries(cache);
    // Prune to 60 most recent entries to avoid filling storage
    const pruned = entries.length > 60
      ? Object.fromEntries(entries.sort((a, b) => b[1].ts - a[1].ts).slice(0, 60))
      : cache;
    localStorage.setItem(CACHE_KEY, JSON.stringify(pruned));
  } catch { /* storage full — skip caching */ }
}

// ── Recent searches ───────────────────────────────────────────────────────────

export function getRecentSearches() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
  catch { return []; }
}

export function addRecentSearch(query) {
  if (!query?.trim()) return;
  const term = query.trim();
  const recent = getRecentSearches().filter(q => q !== term);
  localStorage.setItem(RECENT_KEY, JSON.stringify([term, ...recent].slice(0, 6)));
}

export function clearRecentSearches() {
  localStorage.removeItem(RECENT_KEY);
}

// ── Card search ───────────────────────────────────────────────────────────────

/**
 * Search the Pokémon TCG API with optional sort.
 * sortBy: '' | 'name' | 'number' | 'price_desc' | 'price_asc'
 */
export async function searchCards(query, filters = {}, page = 1, sortBy = '') {
  const hasQuery = query?.trim();
  const hasFilters = filters.set || filters.type || filters.rarity || filters.supertype;
  if (!hasQuery && !hasFilters) return { data: { results: [], totalPages: 0 }, error: null };

  const cacheKey = JSON.stringify({ query, filters, page, sortBy });
  const cache = readCache();
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return { data: { results: cached.results, totalPages: cached.totalPages }, error: null };
  }

  try {
    const parts = [];
    if (hasQuery)          parts.push(`name:${query.trim()}*`);
    if (filters.set)       parts.push(`set.id:${filters.set}`);
    if (filters.type)      parts.push(`types:${filters.type}`);
    if (filters.rarity)    parts.push(`rarity:"${filters.rarity}"`);
    if (filters.supertype) parts.push(`supertype:${filters.supertype}`);

    // API-level sort (price sort is handled client-side)
    const apiSort = sortBy === 'name' ? 'name'
      : sortBy === 'number' ? 'number'
      : '-set.releaseDate';

    const url = `${BASE_URL}/cards?q=${encodeURIComponent(parts.join(' '))}&page=${page}&pageSize=${PAGE_SIZE}&orderBy=${apiSort}`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error(`TCG API ${res.status}`);

    const json = await res.json();
    let results = json.data || [];

    // Client-side price sort
    if (sortBy === 'price_desc' || sortBy === 'price_asc') {
      const getPrice = c =>
        c.tcgplayer?.prices?.holofoil?.market ??
        c.tcgplayer?.prices?.normal?.market ??
        c.tcgplayer?.prices?.['1stEditionHolofoil']?.market ??
        c.tcgplayer?.prices?.unlimited?.market ?? 0;
      results = [...results].sort((a, b) =>
        sortBy === 'price_desc' ? getPrice(b) - getPrice(a) : getPrice(a) - getPrice(b)
      );
    }

    const totalPages = Math.ceil((json.totalCount || results.length) / PAGE_SIZE);

    // Tag every result with _game and _price so multi-game code can use a single path
    results = results.map(c => ({
      ...c,
      _game: 'pokemon',
      _price: c.tcgplayer?.prices?.holofoil?.market
        ?? c.tcgplayer?.prices?.normal?.market
        ?? c.tcgplayer?.prices?.['1stEditionHolofoil']?.market
        ?? c.tcgplayer?.prices?.unlimited?.market
        ?? null,
    }));

    writeCache({ ...cache, [cacheKey]: { results, totalPages, ts: Date.now() } });

    return { data: { results, totalPages }, error: null };
  } catch (err) {
    console.error('searchCards error:', err);
    return { data: null, error: err };
  }
}

// ── Set cards (all cards in a single set, up to 250) ─────────────────────────

/**
 * Parse a card number string into a sortable integer.
 * Handles "1", "001", "TG01", "GX01", "SV001", "RC01", "SWSH001", etc.
 * Returns the first numeric run as an integer, or Infinity if none found.
 */
function parseCardNumber(numStr) {
  if (!numStr) return Infinity;
  const match = String(numStr).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : Infinity;
}

function sortSetCards(cards, sort) {
  if (sort === 'price_desc' || sort === 'price_asc') {
    const getPrice = c =>
      c.tcgplayer?.prices?.holofoil?.market ??
      c.tcgplayer?.prices?.normal?.market ??
      c.tcgplayer?.prices?.['1stEditionHolofoil']?.market ??
      c.tcgplayer?.prices?.unlimited?.market ?? -1;
    return [...cards].sort((a, b) =>
      sort === 'price_desc' ? getPrice(b) - getPrice(a) : getPrice(a) - getPrice(b)
    );
  }
  if (sort === 'number' || sort === '-number') {
    const dir = sort === '-number' ? -1 : 1;
    return [...cards].sort((a, b) => dir * (parseCardNumber(a.number) - parseCardNumber(b.number)));
  }
  if (sort === '-name') {
    return [...cards].sort((a, b) => (b.name || '').localeCompare(a.name || ''));
  }
  if (sort === 'name') {
    return [...cards].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }
  return cards;
}

/**
 * Fetch ALL cards for a set (up to 250 per request, covers virtually all sets).
 * Results are cached in localStorage for 15 minutes per set+sort combo.
 */
export async function getSetCards(setId, sort = 'number') {
  const cacheKey = `pkb_sc_${setId}_${sort}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < 15 * 60 * 1000) return { data, error: null };
    }
  } catch { /* ignore */ }

  try {
    // Fetch up to 250; sort by number at API level for initial order
    const url = `${BASE_URL}/cards?q=${encodeURIComponent(`set.id:${setId}`)}&pageSize=250&orderBy=number`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error(`TCG API ${res.status}`);
    const json = await res.json();
    const cards = sortSetCards(json.data || [], sort);
    try { localStorage.setItem(cacheKey, JSON.stringify({ data: cards, ts: Date.now() })); } catch { /* storage full */ }
    return { data: cards, error: null };
  } catch (err) {
    console.error('getSetCards error:', err);
    return { data: null, error: err };
  }
}

// ── Sets ──────────────────────────────────────────────────────────────────────

export async function getSets() {
  const SETS_CACHE_KEY = 'pkb_sets_cache';
  try {
    const cached = localStorage.getItem(SETS_CACHE_KEY);
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < 24 * 60 * 60 * 1000) return { data, error: null }; // 24h TTL
    }
  } catch { /* ignore */ }

  try {
    const res = await fetch(`${BASE_URL}/sets?pageSize=250&orderBy=-releaseDate`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`TCG API ${res.status}`);
    const json = await res.json();
    const data = json.data || [];
    try { localStorage.setItem(SETS_CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch { }
    return { data, error: null };
  } catch (err) {
    console.error('getSets error:', err);
    return { data: null, error: err };
  }
}
