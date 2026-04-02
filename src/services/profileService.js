import { supabase } from '../supabase.js';

/**
 * Fetch the profile row for a given user.
 * @param {string} userId - UUID from auth.users
 * @returns {Promise<{ data: object | null, error: Error | null }>}
 */
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  return { data, error };
}

/**
 * Create a new profile for the given user.
 * @param {string} userId - UUID from auth.users
 * @param {string} name - Display name for the profile
 * @returns {Promise<{ data: object | null, error: Error | null }>}
 */
export async function createProfile(userId, name) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({ user_id: userId, name })
    .select()
    .single();
  return { data, error };
}

/**
 * Update fields on an existing profile.
 * @param {string} profileId - UUID of the profile row
 * @param {{ name?: string, avatar_url?: string }} updates
 * @returns {Promise<{ data: object | null, error: Error | null }>}
 */
export async function updateProfile(profileId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', profileId)
    .select()
    .single();
  return { data, error };
}

/**
 * Delete a profile and all its binders/cards (cascades via FK).
 * @param {string} profileId - UUID of the profile row
 * @returns {Promise<{ error: Error | null }>}
 */
export async function deleteProfile(profileId) {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', profileId);
  return { error };
}
