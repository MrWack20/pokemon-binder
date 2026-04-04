import { supabase } from '../supabase.js';

/**
 * Fetch all collection statistics for a profile.
 * Loads binders + their cards in one query, then aggregates client-side.
 * Returns totals, top sets, value per binder, most valuable cards, recently added.
 */
export async function getCollectionStats(profileId) {
  const { data: binders, error } = await supabase
    .from('binders')
    .select(`
      id, name, created_at,
      binder_cards (
        id, card_name, card_image_url, card_set, card_price, added_at
      )
    `)
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true });

  if (error) return { data: null, error };

  const allCards = binders.flatMap(b =>
    (b.binder_cards || []).map(c => ({ ...c, binder_name: b.name }))
  );

  const totalBinders = binders.length;
  const totalCards = allCards.length;
  const totalValue = allCards.reduce((s, c) => s + (c.card_price || 0), 0);

  // Top sets by card count (cap label length for charts)
  const setMap = {};
  allCards.forEach(c => {
    const key = c.card_set || 'Unknown';
    if (!setMap[key]) setMap[key] = { name: key, count: 0, value: 0 };
    setMap[key].count++;
    setMap[key].value += c.card_price || 0;
  });
  const topSets = Object.values(setMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map(s => ({ ...s, shortName: s.name.length > 18 ? s.name.slice(0, 16) + '…' : s.name }));

  // Value per binder (only those with priced cards)
  const binderValues = binders
    .map(b => ({
      name: b.name,
      shortName: b.name.length > 16 ? b.name.slice(0, 14) + '…' : b.name,
      value: +(b.binder_cards || []).reduce((s, c) => s + (c.card_price || 0), 0).toFixed(2),
      count: (b.binder_cards || []).length,
    }))
    .filter(b => b.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Most valuable cards
  const mostValuable = [...allCards]
    .filter(c => c.card_price > 0)
    .sort((a, b) => (b.card_price || 0) - (a.card_price || 0))
    .slice(0, 10);

  // Recently added
  const recentlyAdded = [...allCards]
    .sort((a, b) => new Date(b.added_at) - new Date(a.added_at))
    .slice(0, 8);

  return {
    data: { totalBinders, totalCards, totalValue, topSets, binderValues, mostValuable, recentlyAdded },
    error: null,
  };
}
