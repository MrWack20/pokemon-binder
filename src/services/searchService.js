import { API_KEY } from '../constants/themes.js';

const BASE_URL = 'https://api.pokemontcg.io/v2';
const PAGE_SIZE = 10;

function getHeaders() {
  return API_KEY ? { 'X-Api-Key': API_KEY } : {};
}

/**
 * Search the Pokemon TCG API.
 * Returns { data: { results, totalPages }, error }
 */
export async function searchCards(query, filters = {}, page = 1) {
  const hasQuery = query && query.trim();
  const hasFilters = filters.set || filters.type || filters.rarity || filters.supertype;
  if (!hasQuery && !hasFilters) return { data: { results: [], totalPages: 0 }, error: null };

  try {
    const queryParams = [];
    if (hasQuery)          queryParams.push(`name:${query.trim()}*`);
    if (filters.set)       queryParams.push(`set.id:${filters.set}`);
    if (filters.type)      queryParams.push(`types:${filters.type}`);
    if (filters.rarity)    queryParams.push(`rarity:"${filters.rarity}"`);
    if (filters.supertype) queryParams.push(`supertype:${filters.supertype}`);

    const url = `${BASE_URL}/cards?q=${encodeURIComponent(queryParams.join(' '))}&page=${page}&pageSize=${PAGE_SIZE}&orderBy=-set.releaseDate`;
    const response = await fetch(url, { headers: getHeaders() });
    if (!response.ok) throw new Error(`TCG API ${response.status}`);

    const json = await response.json();
    const results = json.data || [];
    const totalPages = Math.ceil((json.totalCount || results.length) / PAGE_SIZE);
    return { data: { results, totalPages }, error: null };
  } catch (err) {
    console.error('searchCards error:', err);
    return { data: null, error: err };
  }
}

/**
 * Fetch all Pokemon TCG sets (up to 250).
 * Returns { data: sets[], error }
 */
export async function getSets() {
  try {
    const response = await fetch(`${BASE_URL}/sets?pageSize=250`, { headers: getHeaders() });
    if (!response.ok) throw new Error(`TCG API ${response.status}`);
    const json = await response.json();
    return { data: json.data || [], error: null };
  } catch (err) {
    console.error('getSets error:', err);
    return { data: null, error: err };
  }
}
