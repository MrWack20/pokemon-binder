import { supabase, withTimeout } from '../supabase.js';

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { data, error };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  return { data, error };
}

/**
 * Sign out — guaranteed to return within ~3s.
 *
 * Uses scope: 'local' so we don't need a network round-trip to revoke the
 * server session (revocation can complete in the background; the user just
 * needs the client cleared). Even if that hangs, withTimeout() rejects after
 * 3s. The caller (AuthContext) clears local state regardless of the result,
 * so the user can ALWAYS sign out — see Mistakes Log #22.
 */
export async function signOut() {
  try {
    const { error } = await withTimeout(
      supabase.auth.signOut({ scope: 'local' }),
      3000,
      'signOut'
    );
    return { error };
  } catch (err) {
    // Timeout or unexpected throw — caller still clears local state.
    return { error: err };
  }
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  return { data, error };
}

export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange(callback);
  return { data };
}

export async function resetPassword(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  return { data, error };
}

export async function updateEmail(newEmail) {
  const { data, error } = await supabase.auth.updateUser({ email: newEmail });
  return { data, error };
}

export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  return { data, error };
}
