import { supabase } from '../supabase.js';

/**
 * Fetch all cards in a binder, ordered by slot position.
 * @param {string} binderId - UUID of the parent binder
 * @returns {Promise<{ data: object[] | null, error: Error | null }>}
 */
export async function getBinderCards(binderId) {
  const { data, error } = await supabase
    .from('binder_cards')
    .select('*')
    .eq('binder_id', binderId)
    .order('slot_index', { ascending: true });
  return { data, error };
}

/**
 * Add a card to a specific slot in a binder.
 * If a card already occupies the slot, it is replaced (upsert).
 * @param {string} binderId - UUID of the parent binder
 * @param {number} slotIndex - Zero-based slot position
 * @param {{ card_api_id: string, card_name: string, card_image_url: string, card_set?: string, card_game?: string, card_price?: number, card_price_currency?: string }} cardData
 * @returns {Promise<{ data: object | null, error: Error | null }>}
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

/**
 * Remove a card from a binder by its row ID.
 * @param {string} cardId - UUID of the binder_cards row
 * @returns {Promise<{ error: Error | null }>}
 */
export async function removeCard(cardId) {
  const { error } = await supabase
    .from('binder_cards')
    .delete()
    .eq('id', cardId);
  return { error };
}

/**
 * Move a card to a different slot, overwriting whatever was there.
 * The card's old slot is left empty after the move.
 * @param {string} cardId - UUID of the binder_cards row to move
 * @param {number} newSlotIndex - Target slot position
 * @returns {Promise<{ data: object | null, error: Error | null }>}
 */
export async function moveCard(cardId, newSlotIndex) {
  // Fetch the card so we know its binder_id (needed for the upsert conflict check)
  const { data: card, error: fetchError } = await supabase
    .from('binder_cards')
    .select('*')
    .eq('id', cardId)
    .single();

  if (fetchError) return { data: null, error: fetchError };

  // Delete any card currently occupying the target slot
  await supabase
    .from('binder_cards')
    .delete()
    .eq('binder_id', card.binder_id)
    .eq('slot_index', newSlotIndex);

  // Move the card to the new slot
  const { data, error } = await supabase
    .from('binder_cards')
    .update({ slot_index: newSlotIndex })
    .eq('id', cardId)
    .select()
    .single();

  return { data, error };
}

/**
 * Swap two cards between their slots.
 * Both cards must belong to the same binder.
 * @param {string} cardId1 - UUID of the first binder_cards row
 * @param {string} cardId2 - UUID of the second binder_cards row
 * @returns {Promise<{ error: Error | null }>}
 */
export async function swapCards(cardId1, cardId2) {
  // Fetch both cards
  const { data: cards, error: fetchError } = await supabase
    .from('binder_cards')
    .select('id, slot_index')
    .in('id', [cardId1, cardId2]);

  if (fetchError) return { error: fetchError };
  if (cards.length !== 2) return { error: new Error('One or both cards not found') };

  const [a, b] = cards;

  // Use a temporary sentinel slot to avoid the unique constraint during swap
  const TEMP_SLOT = -1;

  // Step 1: move card A to temp slot
  const { error: e1 } = await supabase
    .from('binder_cards')
    .update({ slot_index: TEMP_SLOT })
    .eq('id', a.id);
  if (e1) return { error: e1 };

  // Step 2: move card B to card A's original slot
  const { error: e2 } = await supabase
    .from('binder_cards')
    .update({ slot_index: a.slot_index })
    .eq('id', b.id);
  if (e2) return { error: e2 };

  // Step 3: move card A from temp slot to card B's original slot
  const { error: e3 } = await supabase
    .from('binder_cards')
    .update({ slot_index: b.slot_index })
    .eq('id', a.id);

  return { error: e3 ?? null };
}
