import { API_KEY } from '../constants/themes.js';

const BASE_URL = 'https://api.pokemontcg.io/v2';
const PAGE_SIZE = 10;

/**
 * Build request headers, attaching the API key if one is configured.
 * @returns {Record<string, string>}
 */
function getHeaders() {
  return API_KEY ? { 'X-Api-Key': API_KEY } : {};
}

/**
 * Search the Pokemon TCG API for cards matching a query and optional filters.
 *
 * @param {string} query - Card name search string (partial match supported)
 * @param {{ set?: string, type?: string, rarity?: string, supertype?: string, language?: string }} filters
 * @param {number} [page=1] - 1-based page number
 * @returns {Promise<{ data: { results: object[], totalPages: number } | null, error: Error | null }>}
 */
export async function searchCards(query, filters = {}, page = 1) {
  const hasQuery = query && query.trim();
  const hasFilters = filters.set || filters.type || filters.rarity || filters.supertype || filters.language;

  if (!hasQuery && !hasFilters) {
    return { data: { results: [], totalPages: 0 }, error: null };
  }

  try {
    const queryParams = [];

    if (hasQuery) {
      queryParams.push(`name:${query.trim()}*`);
    }
    if (filters.set) {
      queryParams.push(`set.id:${filters.set}`);
    }
    if (filters.type) {
      queryParams.push(`types:${filters.type}`);
    }
    if (filters.rarity) {
      queryParams.push(`rarity:"${filters.rarity}"`);
    }
    if (filters.supertype) {
      queryParams.push(`supertype:${filters.supertype}`);
    }
    if (filters.language) {
      // Language filter scopes to the full national dex range
      queryParams.push(`nationalPokedexNumbers:[1 TO 1025]`);
    }

    const queryString = queryParams.join(' ');
    const url = `${BASE_URL}/cards?q=${encodeURIComponent(queryString)}&page=${page}&pageSize=${PAGE_SIZE}&orderBy=-set.releaseDate`;

    const response = await fetch(url, { headers: getHeaders() });

    if (!response.ok) {
      throw new Error(`Pokemon TCG API error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    const results = json.data || [];
    const totalCount = json.totalCount || results.length;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    return { data: { results, totalPages }, error: null };
  } catch (err) {
    console.error('searchCards error:', err);
    return { data: null, error: err };
  }
}

/**
 * Fetch the full list of Pokemon TCG sets (up to 250).
 * @returns {Promise<{ data: object[] | null, error: Error | null }>}
 */
export async function getSets() {
  try {
    const response = await fetch(`${BASE_URL}/sets?pageSize=250`, { headers: getHeaders() });

    if (!response.ok) {
      throw new Error(`Pokemon TCG API error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    return { data: json.data || [], error: null };
  } catch (err) {
    console.error('getSets error:', err);
    return { data: null, error: err };
  }
}
