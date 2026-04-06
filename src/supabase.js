import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[PokeBinder] Missing Supabase env vars.\n' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file (local) ' +
    'or in Vercel → Project Settings → Environment Variables (deployed).'
  );
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

/**
 * Ensure we have a valid session before making authenticated requests.
 * Browsers throttle timers in background tabs, so Supabase's auto-refresh
 * might not fire on time. This forces a session check + refresh if needed.
 *
 * Call this before any critical DB operation.
 * Returns the current session or null if truly unauthenticated.
 */
export async function ensureValidSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return session;

    // No session in memory — try refreshing
    const { data: { session: refreshed } } = await supabase.auth.refreshSession();
    return refreshed ?? null;
  } catch {
    return null;
  }
}
