import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

function withTimeout(promise, ms, label = 'operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout`)), ms)
    ),
  ]);
}

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
 * Sign out — uses scope: 'global' so the server-side cookies are also
 * invalidated. The middleware's next request validation will then redirect
 * to /login. 3s timeout so the UI never hangs.
 */
export async function signOut() {
  try {
    const { error } = await withTimeout(
      supabase.auth.signOut(),
      3000,
      'signOut'
    );
    return { error };
  } catch (err) {
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
  const redirectTo = `${window.location.origin}/auth/reset-password`;
  console.info('[Auth] resetPassword:', email, '->', redirectTo);
  try {
    const { data, error } = await withTimeout(
      supabase.auth.resetPasswordForEmail(email, { redirectTo }),
      8000,
      'resetPassword'
    );
    if (error) {
      console.warn('[Auth] resetPassword error:', error.message, '(status', error.status, ')');
    } else {
      console.info('[Auth] resetPassword sent (Supabase always returns success for security; check spam, rate limits, and redirect-URL allowlist)');
    }
    return { data, error };
  } catch (err) {
    console.error('[Auth] resetPassword exception:', err);
    return { data: null, error: err };
  }
}

export async function updateEmail(newEmail) {
  const { data, error } = await supabase.auth.updateUser({ email: newEmail });
  return { data, error };
}

export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  return { data, error };
}
