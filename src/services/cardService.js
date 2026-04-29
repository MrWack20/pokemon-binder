import { supabase, ensureValidSession } from '../supabase.js';

export async function getBinderCards(binderId) {
  await ensureValidSession();
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
  await ensureValidSession();
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
  await ensureValidSession();
  const { error } = await supabase
    .from('binder_cards')
    .delete()
    .eq('id', cardId);
  return { error };
}

export async function moveCard(cardId, newSlotIndex) {
  await ensureValidSession();
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
  await ensureValidSession();
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
 * Swap two cards between slots using sentinel slot -1 for the UNIQUE constraint.
 */
export async function swapCards(cardId1, cardId2) {
  await ensureValidSession();
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
