import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

/**
 * All cards on a profile's wishlist, newest + highest-priority first.
 */
export async function getWishlist(profileId) {
  const { data, error } = await supabase
    .from('wishlists')
    .select('*')
    .eq('profile_id', profileId)
    .order('priority', { ascending: false })
    .order('added_at', { ascending: false });
  return { data, error };
}

/**
 * Lightweight Set<string> of "<card_api_id>::<game>" tuples used by search
 * results to draw the "wishlisted" badge without fetching the full row.
 */
export async function getWishlistedKeys(profileId) {
  const { data, error } = await supabase
    .from('wishlists')
    .select('card_api_id, card_game')
    .eq('profile_id', profileId);
  if (error) return { data: new Set(), error };
  return {
    data: new Set((data || []).map(r => `${r.card_api_id}::${r.card_game}`)),
    error: null,
  };
}

/**
 * Add a card to the wishlist. Idempotent — if the same (profile, card, game)
 * row already exists, returns it without an error rather than blowing up on
 * the UNIQUE constraint.
 *
 * cardData fields: card_api_id, card_name, card_image_url, card_set,
 *   card_game, card_price, card_price_currency, priority, notes.
 */
export async function addToWishlist(profileId, cardData) {
  const { data, error } = await supabase
    .from('wishlists')
    .insert({ profile_id: profileId, ...cardData })
    .select()
    .single();

  // 23505 = unique_violation — already on the wishlist. Treat as success
  // and return the existing row.
  if (error?.code === '23505') {
    const { data: existing, error: fetchError } = await supabase
      .from('wishlists')
      .select('*')
      .eq('profile_id', profileId)
      .eq('card_api_id', cardData.card_api_id)
      .eq('card_game', cardData.card_game ?? 'pokemon')
      .maybeSingle();
    return { data: existing, error: fetchError };
  }

  return { data, error };
}

export async function removeFromWishlist(wishlistId) {
  const { error } = await supabase
    .from('wishlists')
    .delete()
    .eq('id', wishlistId);
  return { error };
}

/**
 * Variant that removes by (profile, card_api_id, card_game) — handy when
 * the caller only knows the card identity, not the wishlist row id.
 */
export async function removeFromWishlistByCard(profileId, cardApiId, cardGame = 'pokemon') {
  const { error } = await supabase
    .from('wishlists')
    .delete()
    .eq('profile_id', profileId)
    .eq('card_api_id', cardApiId)
    .eq('card_game', cardGame);
  return { error };
}

export async function updateWishlistItem(wishlistId, updates) {
  const { data, error } = await supabase
    .from('wishlists')
    .update(updates)
    .eq('id', wishlistId)
    .select()
    .single();
  return { data, error };
}
