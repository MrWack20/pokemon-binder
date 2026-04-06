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
 * Ensure we have a valid session. Calls getSession() which triggers an
 * internal refresh if the JWT is expired. Has a 5-second timeout so it
 * can never hang the UI.
 */
export async function ensureValidSession() {
  try {
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Session check timeout')), 5000)),
    ]);
    return result.data?.session ?? null;
  } catch {
    return null;
  }
}
