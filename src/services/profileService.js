import { supabase, ensureValidSession } from '../supabase.js';

export async function getProfile(userId) {
  await ensureValidSession();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  return { data, error };
}

export async function createProfile(userId, name) {
  await ensureValidSession();
  const { data, error } = await supabase
    .from('profiles')
    .insert({ user_id: userId, name })
    .select()
    .single();
  return { data, error };
}

export async function updateProfile(profileId, updates) {
  await ensureValidSession();
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', profileId)
    .select()
    .single();
  return { data, error };
}

export async function deleteProfile(profileId) {
  await ensureValidSession();
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', profileId);
  return { error };
}
