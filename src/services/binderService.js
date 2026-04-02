import { supabase } from '../supabase.js';

/**
 * Fetch all binders belonging to a profile.
 * @param {string} profileId - UUID of the parent profile
 * @returns {Promise<{ data: object[] | null, error: Error | null }>}
 */
export async function getBinders(profileId) {
  const { data, error } = await supabase
    .from('binders')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true });
  return { data, error };
}

/**
 * Create a new binder under a profile.
 * @param {string} profileId - UUID of the parent profile
 * @param {{ name: string, rows?: number, cols?: number, pages?: number, cover_color?: string, cover_text?: string, cover_image_url?: string }} binderData
 * @returns {Promise<{ data: object | null, error: Error | null }>}
 */
export async function createBinder(profileId, binderData) {
  const { data, error } = await supabase
    .from('binders')
    .insert({ profile_id: profileId, ...binderData })
    .select()
    .single();
  return { data, error };
}

/**
 * Update fields on an existing binder.
 * @param {string} binderId - UUID of the binder row
 * @param {{ name?: string, rows?: number, cols?: number, pages?: number, cover_color?: string, cover_text?: string, cover_image_url?: string }} updates
 * @returns {Promise<{ data: object | null, error: Error | null }>}
 */
export async function updateBinder(binderId, updates) {
  const { data, error } = await supabase
    .from('binders')
    .update(updates)
    .eq('id', binderId)
    .select()
    .single();
  return { data, error };
}

/**
 * Delete a binder and all its cards (cascades via FK).
 * @param {string} binderId - UUID of the binder row
 * @returns {Promise<{ error: Error | null }>}
 */
export async function deleteBinder(binderId) {
  const { error } = await supabase
    .from('binders')
    .delete()
    .eq('id', binderId);
  return { error };
}

/**
 * Duplicate a binder (metadata only — cards are not copied).
 * Inserts a new binder row with the same settings under the same profile,
 * appending " (Copy)" to the name.
 * @param {string} binderId - UUID of the binder to duplicate
 * @returns {Promise<{ data: object | null, error: Error | null }>}
 */
export async function duplicateBinder(binderId) {
  // Fetch the source binder
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
