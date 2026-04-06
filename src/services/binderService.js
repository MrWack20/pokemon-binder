import { supabase, ensureValidSession } from '../supabase.js';

/**
 * Fetch all binders for a profile, including a card count from binder_cards.
 * Each returned binder has: binder_cards: [{ count: "N" }]
 *
 * If the first attempt returns empty (possible expired JWT + RLS),
 * forces a session refresh and retries once.
 */
export async function getBinders(profileId) {
  const { data, error } = await supabase
    .from('binders')
    .select('*, binder_cards(count)')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true });

  // RLS silently returns [] when JWT is expired — detect and retry
  if (!error && data && data.length === 0) {
    const session = await ensureValidSession();
    if (session) {
      // Retry with (hopefully) refreshed token
      const retry = await supabase
        .from('binders')
        .select('*, binder_cards(count)')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: true });
      return { data: retry.data, error: retry.error };
    }
  }

  return { data, error };
}

export async function createBinder(profileId, binderData) {
  await ensureValidSession();
  const { data, error } = await supabase
    .from('binders')
    .insert({ profile_id: profileId, ...binderData })
    .select()
    .single();
  return { data, error };
}

export async function updateBinder(binderId, updates) {
  await ensureValidSession();
  const { data, error } = await supabase
    .from('binders')
    .update(updates)
    .eq('id', binderId)
    .select()
    .single();
  return { data, error };
}

export async function deleteBinder(binderId) {
  await ensureValidSession();
  const { error } = await supabase
    .from('binders')
    .delete()
    .eq('id', binderId);
  return { error };
}

export async function duplicateBinder(binderId) {
  await ensureValidSession();
  const { data: source, error: fetchError } = await supabase
    .from('binders')
    .select('*')
    .eq('id', binderId)
    .single();
  if (fetchError) return { data: null, error: fetchError };
  const { id, created_at, ...fields } = source;
  const { data, error } = await supabase
    .from('binders')
    .insert({ ...fields, name: `${source.name} (Copy)` })
    .select()
    .single();
  return { data, error };
}
