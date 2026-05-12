import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export async function getBinderCards(binderId) {
  const { data, error } = await supabase
    .from('binder_cards')
    .select('*')
    .eq('binder_id', binderId)
    .order('slot_index', { ascending: true });
  return { data, error };
}

/**
 * Add (or replace) a card at a specific slot.
 * Deletes any existing card in that slot first, then inserts the new one.
 */
export async function addCard(binderId, slotIndex, cardData) {
  // If the DELETE silently fails (e.g. RLS denies it), the INSERT will hit the
  // UNIQUE(binder_id, slot_index) constraint with a confusing error. Surface
  // the real problem instead.
  const { error: deleteError } = await supabase
    .from('binder_cards')
    .delete()
    .eq('binder_id', binderId)
    .eq('slot_index', slotIndex);
  if (deleteError) return { data: null, error: deleteError };

  const { data, error } = await supabase
    .from('binder_cards')
    .insert({ binder_id: binderId, slot_index: slotIndex, ...cardData })
    .select()
    .single();
  return { data, error };
}

export async function removeCard(cardId) {
  const { error } = await supabase
    .from('binder_cards')
    .delete()
    .eq('id', cardId);
  return { error };
}

export async function moveCard(cardId, newSlotIndex) {
  const { data: card, error: fetchError } = await supabase
    .from('binder_cards')
    .select('*')
    .eq('id', cardId)
    .single();
  if (fetchError) return { data: null, error: fetchError };

  await supabase
    .from('binder_cards')
    .delete()
    .eq('binder_id', card.binder_id)
    .eq('slot_index', newSlotIndex);

  const { data, error } = await supabase
    .from('binder_cards')
    .update({ slot_index: newSlotIndex })
    .eq('id', cardId)
    .select()
    .single();
  return { data, error };
}

/**
 * Return a Set of all card_api_id values owned by a profile across all binders.
 */
export async function getOwnedApiIds(profileId) {
  const { data: binders, error: be } = await supabase
    .from('binders')
    .select('id')
    .eq('profile_id', profileId);
  if (be || !binders?.length) return { data: new Set(), error: be };

  const binderIds = binders.map(b => b.id);
  const { data, error } = await supabase
    .from('binder_cards')
    .select('card_api_id')
    .in('binder_id', binderIds);

  return { data: new Set((data || []).map(c => c.card_api_id)), error };
}

/**
 * Global "where is this card?" search across every binder the profile owns.
 * Returns matching binder_cards with their parent binder's name + grid
 * dimensions so the UI can compute which page each card lives on.
 *
 * `query` is matched case-insensitively against `card_name` (ILIKE). Empty
 * query returns nothing — this view is search-only, not "show me everything"
 * (that's what the binders list is for).
 *
 * `gameFilter` is optional — pass 'pokemon' / 'mtg' / 'yugioh' / 'onepiece'
 * to restrict to one game. Pass null/undefined for all games.
 *
 * Results are server-side ordered by card_name so identical cards across
 * binders cluster together, and capped at 200 so very generic queries
 * (e.g. "the") don't blow up the UI.
 */
export async function findOwnedCards(profileId, query, gameFilter) {
  if (!profileId || !query || !query.trim() || query.trim().length < 2) {
    return { data: [], error: null };
  }

  // Embed the parent binder so we get its name + dimensions in one round
  // trip. RLS only lets us see binders we own, and binder_cards inherits
  // via the binder_id FK — so even though we don't filter by profile_id
  // here, the join is implicitly scoped to this profile's binders.
  let q = supabase
    .from('binder_cards')
    .select(`
      id, slot_index, card_api_id, card_name, card_image_url, card_set,
      card_game, card_price, card_price_currency, added_at,
      binder:binders!inner ( id, name, rows, cols, pages, profile_id )
    `)
    .eq('binder.profile_id', profileId)
    .ilike('card_name', `%${query.trim()}%`)
    .order('card_name', { ascending: true })
    .limit(200);

  if (gameFilter) q = q.eq('card_game', gameFilter);

  const { data, error } = await q;
  return { data: data || [], error };
}

/**
 * Swap two cards between slots using sentinel slot -1 for the UNIQUE constraint.
 */
export async function swapCards(cardId1, cardId2) {
  const { data: cards, error: fetchError } = await supabase
    .from('binder_cards')
    .select('id, slot_index')
    .in('id', [cardId1, cardId2]);
  if (fetchError) return { error: fetchError };
  if (cards.length !== 2) return { error: new Error('One or both cards not found') };

  const [a, b] = cards;
  const TEMP = -1;

  const { error: e1 } = await supabase.from('binder_cards').update({ slot_index: TEMP }).eq('id', a.id);
  if (e1) return { error: e1 };
  const { error: e2 } = await supabase.from('binder_cards').update({ slot_index: a.slot_index }).eq('id', b.id);
  if (e2) return { error: e2 };
  const { error: e3 } = await supabase.from('binder_cards').update({ slot_index: b.slot_index }).eq('id', a.id);
  return { error: e3 ?? null };
}
