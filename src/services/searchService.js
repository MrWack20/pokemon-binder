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
    writeCache({ ...cache, [cacheKey]: { results, totalPages, ts: Date.now() } });

    return { data: { results, totalPages }, error: null };
  } catch (err) {
    console.error('searchCards error:', err);
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
