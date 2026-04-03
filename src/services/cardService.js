import { supabase } from '../supabase.js';

export async function getBinderCards(binderId) {
  const { data, error } = await supabase
    .from('binder_cards')
    .select('*')
    .eq('binder_id', binderId)
    .order('slot_index', { ascending: true });
  return { data, error };
}

/**
 * Add (or replace) a card at a specific slot. Uses upsert on (binder_id, slot_index).
 */
export async function addCard(binderId, slotIndex, cardData) {
  const { data, error } = await supabase
    .from('binder_cards')
    .upsert(
      { binder_id: binderId, slot_index: slotIndex, ...cardData },
      { onConflict: 'binder_id,slot_index' }
    )
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

/**
 * Move a card to a new empty slot. Clears the target slot first, then updates slot_index.
 */
export async function moveCard(cardId, newSlotIndex) {
  const { data: card, error: fetchError } = await supabase
    .from('binder_cards')
    .select('*')
    .eq('id', cardId)
    .single();
  if (fetchError) return { data: null, error: fetchError };

  // Clear any card already in the target slot
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
 * Swap two cards between their slots using a temporary sentinel slot (-1)
 * to avoid the unique constraint during the three-step move.
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
