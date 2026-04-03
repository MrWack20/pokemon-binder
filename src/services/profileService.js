import { supabase } from '../supabase.js';

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  return { data, error };
}

export async function createProfile(userId, name) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({ user_id: userId, name })
    .select()
    .single();
  return { data, error };
}

export async function updateProfile(profileId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', profileId)
    .select()
    .single();
  return { data, error };
}

export async function deleteProfile(profileId) {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', profileId);
  return { error };
}
