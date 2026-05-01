import { createClient } from '@/lib/supabase/client';

// All services run from client components (called by React Query hooks).
// Cookies + middleware keep the session fresh, so no ensureValidSession()
// dance is needed — we just talk to PostgREST.
const supabase = createClient();

export async function getBinders(profileId) {
  const { data, error } = await supabase
    .from('binders')
    .select('*, binder_cards(count)')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true });
  return { data, error };
}

export async function createBinder(profileId, binderData) {
  const { data, error } = await supabase
    .from('binders')
    .insert({ profile_id: profileId, ...binderData })
    .select()
    .single();
  return { data, error };
}

export async function updateBinder(binderId, updates) {
  const { data, error } = await supabase
    .from('binders')
    .update(updates)
    .eq('id', binderId)
    .select()
    .single();
  return { data, error };
}

export async function deleteBinder(binderId) {
  const { error } = await supabase
    .from('binders')
    .delete()
    .eq('id', binderId);
  return { error };
}

export async function duplicateBinder(binderId) {
  const { data: source, error: fetchError } = await supabase
    .from('binders')
    .select('*')
    .eq('id', binderId)
    .single();
  if (fetchError) return { data: null, error: fetchError };
  // eslint-disable-next-line no-unused-vars
  const { id: _id, created_at: _ca, ...fields } = source;
  const { data, error } = await supabase
    .from('binders')
    .insert({ ...fields, name: `${source.name} (Copy)` })
    .select()
    .single();
  return { data, error };
}
