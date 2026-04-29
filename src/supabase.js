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

// Hard upper-bound on ANY Supabase HTTP request. If the network stalls or the
// server stops responding, the request is aborted instead of hanging forever
// (which used to lock up the UI — see Mistakes Log #19, #20, #22).
const REQUEST_TIMEOUT_MS = 15000;

function timeoutFetch(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  // Honour any caller-supplied signal too
  if (init.signal) {
    init.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return fetch(url, { ...init, signal: controller.signal })
    .finally(() => clearTimeout(timer));
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
    global: {
      fetch: timeoutFetch,
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

/**
 * Race any promise against a timeout. Used by services that want a hard
 * upper bound separate from the underlying fetch timeout.
 */
export function withTimeout(promise, ms, label = 'operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), ms)),
  ]);
}
