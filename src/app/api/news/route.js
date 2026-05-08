import Parser from 'rss-parser';
import { NextResponse } from 'next/server';

// Run on Node.js runtime — rss-parser depends on Node-only APIs.
export const runtime = 'nodejs';

// Re-fetch every 30 min. Vercel's CDN caches the response, so even with
// thousands of users the actual upstream feeds get hit at most twice per
// hour total. Well under any RSS rate limit, kind to publishers.
export const revalidate = 1800;

// ── Curated source allowlist ────────────────────────────────────────────────
//
// "Credibility" here is editorial trust, not an algorithm. Each source is
// a TCG-focused outlet with a long-running track record of accurate
// coverage. If a source ever degrades we drop it from this list.
//
// Adding a new source: pick the RSS URL (look for /feed, /rss, /atom on
// the publisher's site), tag the game it covers, and ship a PR.
const SOURCES = [
  {
    id: 'pokebeach',
    label: 'PokéBeach',
    url: 'https://www.pokebeach.com/feed',
    game: 'pokemon',
  },
  {
    id: 'wotc',
    label: 'Wizards of the Coast',
    url: 'https://magic.wizards.com/en/rss/rss.xml',
    game: 'mtg',
  },
  {
    id: 'ygorganization',
    label: 'YGOrganization',
    url: 'https://ygorganization.com/feed/',
    game: 'yugioh',
  },
];

// Single shared parser. Tells rss-parser to also extract the first <img>
// from the description so we can render thumbnails.
const parser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'PokeBinderNewsBot/1.0' },
});

// ── Helpers ─────────────────────────────────────────────────────────────────
function extractImageFromHtml(html) {
  if (!html) return null;
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  return m ? m[1] : null;
}

function trimDescription(html, limit = 240) {
  if (!html) return '';
  // Strip tags, collapse whitespace.
  const text = String(html)
    .replace(/<\/?[^>]+(>|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > limit ? text.slice(0, limit).trimEnd() + '…' : text;
}

async function fetchOne(source) {
  try {
    // Use Next's fetch + revalidate so the response is CDN-cached. We
    // still do server-side parsing (rss-parser doesn't run on edge).
    const res = await fetch(source.url, {
      next: { revalidate: 1800 },
      headers: { 'User-Agent': 'PokeBinderNewsBot/1.0' },
    });
    if (!res.ok) {
      console.warn(`[news] ${source.id} returned ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const feed = await parser.parseString(xml);
    return (feed.items || []).slice(0, 6).map(item => ({
      id: `${source.id}:${item.guid || item.link}`,
      source: source.id,
      sourceLabel: source.label,
      game: source.game,
      title: item.title || '(untitled)',
      link: item.link,
      // Most feeds put summary in `contentSnippet` (rss-parser's normalised
      // form). Fall back to full content if missing.
      summary: trimDescription(item.contentSnippet || item.content || ''),
      image: extractImageFromHtml(item['content:encoded'] || item.content),
      publishedAt: item.isoDate || item.pubDate || null,
    }));
  } catch (err) {
    console.warn(`[news] ${source.id} fetch failed:`, err?.message);
    return [];
  }
}

// ── Handler ─────────────────────────────────────────────────────────────────
export async function GET() {
  // Fan out to all sources concurrently. One slow source doesn't block the
  // others; failures degrade gracefully (empty array for that source).
  const settled = await Promise.allSettled(SOURCES.map(fetchOne));
  const items = settled
    .flatMap(r => (r.status === 'fulfilled' ? r.value : []))
    .filter(it => it.publishedAt) // Drop items with no date — usually broken
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, 12); // Top 12 newest across all sources

  return NextResponse.json(
    {
      items,
      sources: SOURCES.map(({ id, label, game }) => ({ id, label, game })),
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    }
  );
}
