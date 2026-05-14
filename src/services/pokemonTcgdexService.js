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
// that don't always match TCGdex's. CASING MATTERS — PokéAPI returns the
// language name as a literal string and our find() comparison is strict
// equality. PokéAPI uses lowercase `zh-hant` (not `zh-Hant`); getting this
// wrong silently breaks every Chinese-Traditional search because the
// translator returns null and we fall through to the raw English query,
// which TCGdex's zh-tw cards don't match.
const POKEAPI_LANG_MAP = {
  ja:      'ja',
  ko:      'ko',
  'zh-tw': 'zh-hant',
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

// ── English-set metadata cache ─────────────────────────────────────────────
//
// Fetched once per page-load (in-memory). Three responsibilities:
//   1) Show the English name alongside the localized one (e.g. "化石の秘密"
//      with "Fossil" underneath).
//   2) Borrow LOGOS for non-English sets. TCGdex's localized set-list
//      endpoints (`/v2/ja/sets`, `/v2/ko/sets`, etc.) literally return NO
//      logo field at all — confirmed empirically: 0 of 172 Japanese sets
//      have a logo. The English list returns 155/208 with logos. So when
//      the same set exists in English (matched case-insensitively by id),
//      we reuse the English logo.
//   3) Borrow releaseDate. The list endpoint omits releaseDate even on
//      English (only present in the per-set detail endpoint). To keep
//      the UI's "newest first" sort meaningful without 172 extra HTTP
//      calls, we don't actually sort by date for non-English — see the
//      sort logic in getTcgdexPokemonSets. The cached English map still
//      doesn't have dates either, so this is purely about logos.
//
// Keys are lowercased ids so we can match `neo1` (ja) against `neo1` (en),
// `XY1` against `xy1`, etc.
let englishSetsMapCache = null;
let englishSetsMapInflight = null;

async function getEnglishSetsMap() {
  if (englishSetsMapCache) return englishSetsMapCache;
  if (englishSetsMapInflight) return englishSetsMapInflight;

  englishSetsMapInflight = (async () => {
    try {
      const data = await getJson(`${BASE_URL}/en/sets`);
      const list = Array.isArray(data) ? data : (data.items || []);
      const map = new Map(
        list.map(s => [
          String(s.id || '').toLowerCase(),
          { name: s.name, logo: s.logo || null, symbol: s.symbol || null },
        ])
      );
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

// Series prefix → chronological rank. TCGdex prefixes every set id with a
// series code (PMCG1, neo3, XY9, SV1S, M2). Sorting alphabetically gets
// the order wrong because "S" < "X" but Sword&Shield is newer than X&Y.
// This array is oldest → newest, so higher index = newer. Update when
// TPCi launches a new series. Sourced from /v2/{lang}/series.
const SERIES_RANK = [
  'PMCG', 'neo', 'VS', 'web', 'e', 'ADV', 'PCG', 'L',
  'BW', 'XY', 'XYb', 'SM', 'S', 'SV', 'M',
];

function setSeriesRank(setId) {
  const id = String(setId || '');
  // Find LONGEST matching prefix so 'SV' beats 'S' for id 'SV1S'.
  let bestIdx = -1;
  let bestLen = 0;
  for (let i = 0; i < SERIES_RANK.length; i++) {
    const prefix = SERIES_RANK[i];
    if (id.startsWith(prefix) && prefix.length > bestLen) {
      bestIdx = i;
      bestLen = prefix.length;
    }
  }
  return bestIdx;
}

// Per-language sets-list cache. TCGdex's localized set list rarely changes
// (new releases happen ~6×/year). Cache for the page session so language
// switching is instant after the first fetch.
const setsListCache = new Map();          // lang -> { data, fetchedAt }
const setsListInflight = new Map();        // lang -> Promise
const SETS_LIST_TTL_MS = 30 * 60 * 1000;   // 30 minutes

/**
 * List every set available in the chosen language. For non-English
 * languages, each set carries an `englishName` field (when an English
 * equivalent exists — Japan-only sets simply have no englishName) and
 * borrows the English logo/symbol when available (TCGdex's non-English
 * list endpoints return no logo fields at all).
 *
 * Sort strategy:
 *   - Series chronology first (newest series at the top). This is
 *     stable, requires no extra HTTP calls, and gives users the
 *     latest sets without scrolling 170 entries.
 *   - Within the same series: id descending so SV9 comes before SV1.
 *   - releaseDate, when present, refines order within a series.
 */
export async function getTcgdexPokemonSets(lang = 'en') {
  // Cache hit within TTL → return immediately
  const cached = setsListCache.get(lang);
  if (cached && Date.now() - cached.fetchedAt < SETS_LIST_TTL_MS) {
    return { data: cached.data, error: null };
  }
  // Already-in-flight request → share the promise so concurrent callers
  // don't double-fetch (e.g. SetsPage + BinderView rendering same lang).
  if (setsListInflight.has(lang)) {
    return setsListInflight.get(lang);
  }

  const promise = _fetchTcgdexPokemonSets(lang);
  setsListInflight.set(lang, promise);
  try {
    const result = await promise;
    if (result.data) {
      setsListCache.set(lang, { data: result.data, fetchedAt: Date.now() });
    }
    return result;
  } finally {
    setsListInflight.delete(lang);
  }
}

async function _fetchTcgdexPokemonSets(lang) {
  try {
    // Always fetch the English sets map. For English itself, this is a
    // no-op (same URL gets fetched twice in the worst case but Promise.all
    // dedupes via the inflight cache). For non-English, we need it for
    // both the localized English name AND the logo borrow.
    const [data, englishMap] = await Promise.all([
      getJson(`${BASE_URL}/${lang}/sets`),
      getEnglishSetsMap(),
    ]);

    const list = Array.isArray(data) ? data : (data.items || []);
    const sets = list.map(s => {
      // Case-insensitive English lookup. TCGdex uses mixed casing across
      // languages (`neo1` in ja vs `neo1` in en — same; but `XY1` vs
      // `xy1` — different). Lowercase both sides to match.
      const enEntry = englishMap?.get(String(s.id || '').toLowerCase()) || null;
      const englishName = enEntry?.name || null;
      // Borrow logo from English when the localized list doesn't have one.
      // For Japanese: ALWAYS borrow (their list never has logos).
      // For other langs: prefer localized → fall back to English.
      const localizedLogo = lang !== 'en' ? null : (s.logo || null);
      const logoBase = localizedLogo || enEntry?.logo || s.logo || null;
      const symbolBase = s.symbol || enEntry?.symbol || null;
      return {
        id: s.id,
        name: s.name,
        // Only set englishName if it actually differs from the localized
        // name (some European-language sets share the English name).
        englishName: englishName && englishName !== s.name ? englishName : null,
        images: {
          logo: logoImageUrl(logoBase),
          symbol: logoImageUrl(symbolBase),
        },
        total: s.cardCount?.total ?? 0,
        printedTotal: s.cardCount?.official ?? s.cardCount?.total ?? 0,
        releaseDate: s.releaseDate,
        series: s.serie?.name,
        _lang: lang,
      };
    });
    // Sort: series chronology DESC (M/SV/S at top, PMCG at bottom), then
    // releaseDate DESC inside a series if present, then id DESC as final
    // tiebreaker. Unknown prefixes (rank -1) sink to the very bottom.
    sets.sort((a, b) => {
      const rankA = setSeriesRank(a.id);
      const rankB = setSeriesRank(b.id);
      if (rankA !== rankB) return rankB - rankA;
      const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
      const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
      if (dateA !== dateB) return dateB - dateA;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
    return { data: sets, error: null };
  } catch (err) {
    console.error('[tcgdex] sets error:', err);
    return { data: null, error: err };
  }
}

// Per-set cache so clicking back-and-forth between sets is instant.
// Keyed by `${lang}:${setId}`. Set contents are immutable from our
// perspective (TCGdex updates them rarely), so we cache aggressively.
const setCardsCache = new Map();
const setCardsInflight = new Map();
const SET_CARDS_TTL_MS = 60 * 60 * 1000;  // 1 hour

/**
 * Fetch every card in a given set, in the chosen language.
 * Returns the cards plus the set's own metadata so callers can render
 * the page header (logo, English name, etc.) without a second fetch.
 */
export async function getTcgdexPokemonSetCards(setId, lang = 'en') {
  const key = `${lang}:${setId}`;
  const cached = setCardsCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < SET_CARDS_TTL_MS) {
    return { data: cached.data, error: null };
  }
  if (setCardsInflight.has(key)) return setCardsInflight.get(key);

  const promise = (async () => {
    try {
      const data = await getJson(`${BASE_URL}/${lang}/sets/${setId}`);
      const list = data.cards || [];
      const cards = list.map(c =>
        normalizeCard({ ...c, set: { id: data.id, name: data.name } }, lang)
      );
      setCardsCache.set(key, { data: cards, fetchedAt: Date.now() });
      return { data: cards, error: null };
    } catch (err) {
      console.error('[tcgdex] set-cards error:', err);
      return { data: null, error: err };
    } finally {
      setCardsInflight.delete(key);
    }
  })();
  setCardsInflight.set(key, promise);
  return promise;
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
