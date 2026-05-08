import Parser from 'rss-parser';
import { NextResponse } from 'next/server';
import { SOURCES } from './sources.js';

// Run on Node.js runtime — rss-parser depends on Node-only APIs.
export const runtime = 'nodejs';

// Re-fetch every 30 min. Vercel's CDN caches the response, so even with
// thousands of users the actual upstream feeds get hit at most twice per
// hour total. Well under any RSS rate limit, kind to publishers.
export const revalidate = 1800;

// Single shared parser. We map a couple of common RSS extensions
// (Reddit's `media:thumbnail`, `media:content`) so we can extract
// thumbnails from every source uniformly.
const parser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'PokeBinderNewsBot/1.0 (+https://pokebinder.app)' },
  customFields: {
    item: [
      ['media:thumbnail', 'mediaThumbnail'],
      ['media:content', 'mediaContent'],
      ['content:encoded', 'contentEncoded'],
    ],
  },
});

// ── Helpers ─────────────────────────────────────────────────────────────────
function extractImageFromHtml(html) {
  if (!html) return null;
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  return m ? m[1] : null;
}

// Reddit's `media:thumbnail` and `media:content` carry image URLs in
// different XML attribute shapes depending on the parser. Walk both.
function extractMediaImage(item) {
  const candidates = [
    item.mediaThumbnail?.$?.url,
    item.mediaThumbnail?.url,
    item.mediaContent?.$?.url,
    item.mediaContent?.url,
    item.enclosure?.url,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.startsWith('http')) return c;
  }
  return null;
}

function trimDescription(html, limit = 240) {
  if (!html) return '';
  // Strip tags, collapse whitespace, drop "submitted by /u/..." Reddit
  // boilerplate that adds nothing.
  const text = String(html)
    .replace(/<\/?[^>]+(>|$)/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/submitted by\s+\/u\/[^\s]+/i, '')
    .replace(/\[link\]|\[comments\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > limit ? text.slice(0, limit).trimEnd() + '…' : text;
}

async function fetchOne(source) {
  try {
    const res = await fetch(source.url, {
      next: { revalidate: 1800 },
      headers: {
        'User-Agent': 'PokeBinderNewsBot/1.0 (+https://pokebinder.app)',
      },
    });
    if (!res.ok) {
      console.warn(`[news] ${source.id} returned ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const feed = await parser.parseString(xml);
    const cap = source.maxItems ?? 4;
    return (feed.items || []).slice(0, cap).map(item => ({
      id: `${source.id}:${item.guid || item.link}`,
      source: source.id,
      sourceLabel: source.label,
      sourceKind: source.kind || 'publisher',
      game: source.game,
      title: item.title || '(untitled)',
      link: item.link,
      summary: trimDescription(
        item.contentSnippet || item.contentEncoded || item.content || ''
      ),
      // Look for a thumbnail in: media: extensions, then enclosure,
      // then scrape the first <img> from contentEncoded/content.
      image: extractMediaImage(item)
        || extractImageFromHtml(item.contentEncoded || item.content),
      publishedAt: item.isoDate || item.pubDate || null,
    }));
  } catch (err) {
    console.warn(`[news] ${source.id} fetch failed:`, err?.message);
    return [];
  }
}

// ── Handler ─────────────────────────────────────────────────────────────────
export async function GET() {
  // Fan out to all sources concurrently. One slow source doesn't block
  // the others; any failure (Promise.allSettled) gives an empty array
  // for that source.
  const settled = await Promise.allSettled(SOURCES.map(fetchOne));

  // Drop items without a date (sometimes Reddit feeds malform dates) and
  // dedupe by id (in case the same article shows up via multiple feeds).
  const seen = new Set();
  const items = settled
    .flatMap(r => (r.status === 'fulfilled' ? r.value : []))
    .filter(it => {
      if (!it.publishedAt) return false;
      if (seen.has(it.id)) return false;
      seen.add(it.id);
      return true;
    })
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, 18); // global cap — leaves headroom for the per-game filter

  return NextResponse.json(
    {
      items,
      sources: SOURCES.map(({ id, label, game, kind }) => ({
        id, label, game, kind,
      })),
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    }
  );
}
