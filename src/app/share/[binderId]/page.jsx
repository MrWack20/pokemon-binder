import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PublicBinderView from '@/components/PublicBinderView';

// Always render fresh — public binders may have just been edited / unshared.
// Caching can come later via cacheTag when we add an "unpublish" hook.
export const dynamic = 'force-dynamic';

/**
 * Reconstruct a slot-indexed cards array from binder_cards rows.
 * Matches the shape BinderView/PublicBinderView consume.
 */
function buildCardsArray(rows, cols, pages, cardRows) {
  const total = rows * cols * pages;
  const arr = Array(total).fill(null);
  (cardRows || []).forEach((c) => {
    if (c.slot_index >= 0 && c.slot_index < total) arr[c.slot_index] = c;
  });
  return arr;
}

async function fetchPublicBinder(binderId) {
  const supabase = await createClient();

  // RLS does the heavy lifting — `binders_public_select` only returns rows
  // where is_public = true, even for the anon role. If the row isn't
  // public (or doesn't exist), this returns null and we 404.
  const { data: binder, error } = await supabase
    .from('binders')
    .select('id, name, rows, cols, pages, cover_color, cover_text, cover_image_url, profile_id, is_public')
    .eq('id', binderId)
    .eq('is_public', true)
    .maybeSingle();

  if (error || !binder) return null;

  const [{ data: cardRows }, { data: profile }] = await Promise.all([
    supabase
      .from('binder_cards')
      .select('id, slot_index, card_api_id, card_name, card_image_url, card_set, card_game, card_price, card_price_currency, added_at')
      .eq('binder_id', binderId)
      .order('slot_index', { ascending: true }),
    // Only the display fields — RLS allows the read but we still scope the
    // SELECT defensively (Mistakes Log: row-level security != column-level).
    supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .eq('id', binder.profile_id)
      .maybeSingle(),
  ]);

  return {
    binder: {
      ...binder,
      cards: buildCardsArray(binder.rows, binder.cols, binder.pages, cardRows),
    },
    ownerName: profile?.name || null,
  };
}

// ── OG / Twitter unfurl metadata ────────────────────────────────────────────
export async function generateMetadata({ params }) {
  const { binderId } = await params;
  const result = await fetchPublicBinder(binderId);

  if (!result) {
    return { title: 'Binder not found · PokéBinder' };
  }

  const { binder, ownerName } = result;
  const title = `${binder.name} · PokéBinder`;
  const description = ownerName
    ? `${ownerName}'s ${binder.name} — ${binder.cards.filter(Boolean).length} cards on PokéBinder`
    : `${binder.name} — public collection on PokéBinder`;

  const images = binder.cover_image_url ? [binder.cover_image_url] : [];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images,
    },
  };
}

// ── Page ────────────────────────────────────────────────────────────────────
export default async function SharePage({ params }) {
  const { binderId } = await params;
  const result = await fetchPublicBinder(binderId);
  if (!result) notFound();

  const { binder, ownerName } = result;
  return <PublicBinderView binder={binder} ownerName={ownerName} />;
}
