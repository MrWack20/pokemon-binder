// TCGdex (https://tcgdex.dev) — multi-language Pokémon TCG data.
//
// We use this when the user picks a non-English language for Pokémon
// search or sets browser. English stays on pokemontcg.io for the better
// English data (TCGPlayer prices, full text search, etc.). TCGdex's
// strength is being the only open API that covers Japan-only sets,
// Korean releases, and Chinese-Traditional releases.
//
// ── API quick reference ─────────────────────────────────────────────────
//   GET https://api.tcgdex.net/v2/{lang}/cards            list/search
//   GET https://api.tcgdex.net/v2/{lang}/cards/{cardId}   full card
//   GET https://api.tcgdex.net/v2/{lang}/sets             all sets
//   GET https://api.tcgdex.net/v2/{lang}/sets/{setId}     set + its cards
//
// ── Image URL conventions ──────────────────────────────────────────────
// TCGdex returns base paths without extensions. Two different patterns:
//   Cards:  `${card.image}/${quality}.${ext}`  e.g. `…/swsh1/1/high.webp`
//           quality ∈ {low, medium, high}; ext ∈ {webp, png}
//   Logos:  `${set.logo}.${ext}`                e.g. `…/swsh1/logo.png`
//           (no quality dimension — just append the extension)

const BASE_URL = 'https://api.tcgdex.net/v2';
const POKEAPI_BASE = 'https://pokeapi.co/api/v2';

// Language codes TCGdex supports. Trimmed to the four locales we care about:
// English baseline, plus the three Asian releases users keep asking for
// (Japan-only sets, Korean releases, zh-tw Traditional Chinese). Other
// TCGdex languages (fr/de/es/it/pt-br/id/th) are intentionally hidden — they
// inflate the dropdown and trigger extra translation API calls that nobody
// uses in practice. Add them back here if user demand returns.
export const TCGDEX_LANGS = [
  { code: 'en',    label: 'English' },
  { code: 'ja',    label: '日本語 · Japanese' },
  { code: 'ko',    label: '한국어 · Korean' },
  { code: 'zh-tw', label: '繁體中文 · Chinese (Traditional)' },
];

// Map our TCGdex language codes → PokéAPI's language identifiers (used by
// the cross-language search translator). PokéAPI uses BCP-47-ish codes
// that don't always match TCGdex's.
const POKEAPI_LANG_MAP = {
  ja:      'ja',
  ko:      'ko',
  'zh-tw': 'zh-Hant',
};

// Whether the language has TCGdex coverage (i.e., we should route to
// this service vs. fall through to pokemontcg.io).
export function isTcgdexLang(code) {
  return TCGDEX_LANGS.some(l => l.code === code);
}

// ── HTTP helpers ────────────────────────────────────────────────────────────
async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.json();
}

// ── Image URL builders ──────────────────────────────────────────────────────
//
// Defensive: if TCGdex ever returns a URL with the extension already on,
// don't double-append. Mostly future-proofing.

function cardImageUrls(base) {
  if (!base) return { small: null, large: null };
  // Strip any trailing extension (shouldn't be there, but be safe)
  const clean = String(base).replace(/\.(webp|png|jpe?g|gif)$/i, '');
  return {
    small: `${clean}/low.webp`,
    large: `${clean}/high.webp`,
  };
}

function logoImageUrl(base) {
  if (!base) return null;
  // If TCGdex ever returns a URL already ending in an extension, respect it.
  if (/\.(webp|png|jpe?g|gif)$/i.test(base)) return base;
  return `${base}.png`;
}

// ── Card normaliser ─────────────────────────────────────────────────────────
function normalizeCard(card, lang) {
  return {
    id: card.id,
    name: card.name,
    images: cardImageUrls(card.image),
    set: card.set
      ? { name: card.set.name, id: card.set.id }
      : { name: '' },
    number: card.localId,
    _game: 'pokemon',
    _lang: lang,
    _price: null,
    _raw: card,
  };
}

// ── Translation layer (PokéAPI) ─────────────────────────────────────────────
//
// PokéAPI exposes Pokémon species names in every officially-supported
// language. We use it to translate user queries: type "blastoise" with
// Japanese selected → look up "blastoise" species → grab the `ja` name
// (カメックス) → search TCGdex with the translated name.
//
// Only works for actual Pokémon names. Trainer cards, Items, Energy
// types, etc. aren't in PokéAPI's species index — translation returns
// null and we fall back to the user's raw query.
//
// In-memory cache for this session (browser-side). PokéAPI is generously
// permissive about caching; we won't hit it repeatedly even without HTTP
// cache headers.
const translationCache = new Map();

async function translatePokemonName(query, targetLang) {
  const pokeApiLang = POKEAPI_LANG_MAP[targetLang];
  if (!pokeApiLang) return null;

  const slug = String(query || '').toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  if (slug.length < 2) return null;

  const cacheKey = `${slug}:${pokeApiLang}`;
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);

  try {
    const data = await getJson(`${POKEAPI_BASE}/pokemon-species/${slug}`);
    const entry = (data.names || []).find(n => n.language?.name === pokeApiLang);
    const translated = entry?.name || null;
    translationCache.set(cacheKey, translated);
    return translated;
  } catch {
    // Not a Pokémon species (Trainer card, partial name, typo, etc.)
    // Cache the miss so we don't retry the same slug.
    translationCache.set(cacheKey, null);
    return null;
  }
}

// ── Internal single-query search ────────────────────────────────────────────
async function tcgdexSearchOne(query, lang, page, pageSize) {
  const path = `/${lang}/cards?name=${encodeURIComponent(query)}&pagination:page=${page}&pagination:itemsPerPage=${pageSize}`;
  try {
    const data = await getJson(`${BASE_URL}${path}`);
    const list = Array.isArray(data) ? data : (data.items || []);
    return list.map(c => normalizeCard(c, lang));
  } catch (err) {
    console.error('[tcgdex] search error:', err);
    return [];
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Free-text search with cross-language fallback.
 *
 * When `lang` is non-English, runs TWO searches in parallel:
 *   1) The user's raw query against TCGdex/{lang}
 *   2) If the query looks like a Pokémon species name, translate it
 *      via PokéAPI into the target language and search that too.
 *
 * Results are merged and deduped by card id. So a user can type
 * "blastoise" with Japanese selected and find カメックス cards, OR
 * type カメックス directly — both paths work.
 */
export async function searchTcgdexPokemon(query, lang = 'en', page = 1, pageSize = 24) {
  const trimmed = (query || '').trim();
  if (!trimmed) {
    return { data: { results: [], totalPages: 0 }, error: null };
  }

  // Build the set of query variants to fan out to.
  const variants = new Set([trimmed]);
  if (lang !== 'en') {
    const translated = await translatePokemonName(trimmed, lang);
    if (translated && translated.toLowerCase() !== trimmed.toLowerCase()) {
      variants.add(translated);
    }
  }

  try {
    const batches = await Promise.allSettled(
      Array.from(variants).map(q => tcgdexSearchOne(q, lang, page, pageSize))
    );

    // Merge + dedupe by id, preserving the order of the first variant's
    // hits (usually the raw query's results come first).
    const seen = new Set();
    const merged = [];
    for (const b of batches) {
      if (b.status !== 'fulfilled') continue;
      for (const card of b.value) {
        if (seen.has(card.id)) continue;
        seen.add(card.id);
        merged.push(card);
      }
    }

    return {
      data: {
        results: merged,
        totalPages: merged.length >= pageSize ? page + 1 : page,
      },
      error: null,
    };
  } catch (err) {
    console.error('[tcgdex] search error:', err);
    return { data: null, error: err };
  }
}

// ── English-set-name cache ─────────────────────────────────────────────────
//
// Fetched once per page-load (in-memory). Lets the SetsPage show the
// English name alongside the localized one when browsing Japanese,
// Korean, etc. For Japan-only sets (no EN release), the lookup returns
// undefined and the UI falls back to just the localized name.
let englishSetsMapCache = null;
let englishSetsMapInflight = null;

async function getEnglishSetsMap() {
  if (englishSetsMapCache) return englishSetsMapCache;
  if (englishSetsMapInflight) return englishSetsMapInflight;

  englishSetsMapInflight = (async () => {
    try {
      const data = await getJson(`${BASE_URL}/en/sets`);
      const list = Array.isArray(data) ? data : (data.items || []);
      const map = new Map(list.map(s => [s.id, s.name]));
      englishSetsMapCache = map;
      return map;
    } catch {
      return new Map();
    } finally {
      englishSetsMapInflight = null;
    }
  })();

  return englishSetsMapInflight;
}

/**
 * List every set available in the chosen language. For non-English
 * languages, each set carries an `englishName` field (when an English
 * equivalent exists — Japan-only sets simply have no englishName).
 */
export async function getTcgdexPokemonSets(lang = 'en') {
  try {
    // For non-English: fetch the English sets map in parallel so we can
    // attach English names. For English, no second call needed.
    const [data, englishMap] = await Promise.all([
      getJson(`${BASE_URL}/${lang}/sets`),
      lang !== 'en' ? getEnglishSetsMap() : Promise.resolve(null),
    ]);

    const list = Array.isArray(data) ? data : (data.items || []);
    const sets = list.map(s => {
      const englishName = englishMap?.get(s.id) || null;
      return {
        id: s.id,
        name: s.name,
        // Only set englishName if it actually differs from the localized
        // name (some European-language sets share the English name).
        englishName: englishName && englishName !== s.name ? englishName : null,
        images: {
          logo: logoImageUrl(s.logo),
          symbol: logoImageUrl(s.symbol),
        },
        total: s.cardCount?.total ?? 0,
        printedTotal: s.cardCount?.official ?? s.cardCount?.total ?? 0,
        releaseDate: s.releaseDate,
        series: s.serie?.name,
        _lang: lang,
      };
    });
    sets.sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0));
    return { data: sets, error: null };
  } catch (err) {
    console.error('[tcgdex] sets error:', err);
    return { data: null, error: err };
  }
}

/**
 * Fetch every card in a given set, in the chosen language.
 * Returns the cards plus the set's own metadata so callers can render
 * the page header (logo, English name, etc.) without a second fetch.
 */
export async function getTcgdexPokemonSetCards(setId, lang = 'en') {
  try {
    const data = await getJson(`${BASE_URL}/${lang}/sets/${setId}`);
    const list = data.cards || [];
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
 * Convert a normalised TCGdex card to the binder_cards DB row shape.
 */
export function tcgdexPokemonCardToDbRow(card) {
  return {
    card_api_id: card.id,
    card_name: card.name,
    card_image_url: card.images?.small || card.images?.large || '',
    card_set: card.set?.name || null,
    card_game: 'pokemon',
    card_price: null,
    card_price_currency: 'USD',
  };
}
