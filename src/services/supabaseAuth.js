import { supabase } from '../supabase.js';

/**
 * Register a new user with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ data: { user, session } | null, error: Error | null }>}
 */
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { data, error };
}

/**
 * Sign in an existing user with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ data: { user, session } | null, error: Error | null }>}
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

/**
 * Sign in with Google OAuth. Redirects to Google consent screen.
 * @returns {Promise<{ data, error: Error | null }>}
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { data, error };
}

/**
 * Sign out the currently authenticated user.
 * @returns {Promise<{ error: Error | null }>}
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get the currently authenticated user, or null if not signed in.
 * @returns {Promise<{ data: { user } | null, error: Error | null }>}
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  return { data, error };
}

/**
 * Subscribe to authentication state changes (sign in, sign out, token refresh).
 * @param {(event: string, session: object | null) => void} callback
 * @returns {{ data: { subscription } }} - call subscription.unsubscribe() to clean up
 */
export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange(callback);
  return { data };
}

/**
 * Send a password reset email to the given address.
 * @param {string} email
 * @returns {Promise<{ data, error: Error | null }>}
 */
export async function resetPassword(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  return { data, error };
}
