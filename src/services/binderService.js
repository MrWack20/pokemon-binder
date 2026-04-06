import { supabase, ensureValidSession } from '../supabase.js';

/**
 * Fetch all binders for a profile, including a card count.
 * Calls ensureValidSession() first to guarantee the JWT is fresh.
 */
export async function getBinders(profileId) {
  await ensureValidSession();
  const { data, error } = await supabase
    .from('binders')
    .select('*, binder_cards(count)')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true });
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
