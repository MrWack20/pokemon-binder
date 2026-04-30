import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const envHealth = {
  urlMissing: !supabaseUrl,
  keyMissing: !supabaseAnonKey,
  ok: !!supabaseUrl && !!supabaseAnonKey,
};

if (!envHealth.ok) {
  const missing = [
    envHealth.urlMissing && 'VITE_SUPABASE_URL',
    envHealth.keyMissing && 'VITE_SUPABASE_ANON_KEY',
  ].filter(Boolean).join(', ');
  console.error(
    `[PokeBinder] Missing Supabase env var(s): ${missing}\n` +
    'Local: add them to .env in the project root (or current worktree) and restart `npm run dev`.\n' +
    'Vercel: Project Settings → Environment Variables. NOTE: VITE_SUPABASE_URL must be set for ' +
    'BOTH Production AND Preview separately. Then redeploy.'
  );
}

// Hard upper-bound on ANY Supabase HTTP request. If the network stalls or the
// server stops responding, the request is aborted instead of hanging forever
// (which used to lock up the UI — see Mistakes Log #19, #20, #22).
const REQUEST_TIMEOUT_MS = 15000;

// Lightweight diagnostic logger. Toggle from DevTools with:
//   localStorage.setItem('pkb_debug', '1')  // enable
//   localStorage.removeItem('pkb_debug')    // disable
function debugEnabled() {
  try { return localStorage.getItem('pkb_debug') === '1'; }
  catch { return false; }
}
function debug(...args) {
  if (debugEnabled()) console.log('[Supabase]', ...args);
}

/**
 * Defensive fetch wrapper passed as `global.fetch` to the Supabase client.
 * - Hard 15s timeout via AbortController so requests can never hang forever.
 * - Forwards caller-supplied AbortSignals (so cancel propagation still works).
 * - Handles already-aborted signals, undefined `init`, and Request inputs.
 * - Logs slow/failed requests when `pkb_debug` is enabled.
 */
function timeoutFetch(input, init) {
  const opts = init || {};
  const upstream = opts.signal;

  // If the caller's signal is ALREADY aborted, fail immediately. (Adding an
  // 'abort' listener after the event fired would never trigger.)
  if (upstream && upstream.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    debug('TIMEOUT after', REQUEST_TIMEOUT_MS, 'ms ->', requestUrl(input));
    controller.abort(new DOMException('Request timeout', 'TimeoutError'));
  }, REQUEST_TIMEOUT_MS);

  let upstreamHandler;
  if (upstream) {
    upstreamHandler = () => controller.abort(upstream.reason);
    upstream.addEventListener('abort', upstreamHandler, { once: true });
  }

  const startedAt = performance.now();
  return fetch(input, { ...opts, signal: controller.signal })
    .then((res) => {
      const ms = Math.round(performance.now() - startedAt);
      if (debugEnabled() || ms > 3000 || !res.ok) {
        debug(`${res.status} ${res.statusText} (${ms}ms) ->`, requestUrl(input));
      }
      return res;
    })
    .catch((err) => {
      const ms = Math.round(performance.now() - startedAt);
      console.warn(`[Supabase] FAIL (${ms}ms) ${err.name}: ${err.message} ->`, requestUrl(input));
      throw err;
    })
    .finally(() => {
      clearTimeout(timer);
      if (upstream && upstreamHandler) {
        upstream.removeEventListener('abort', upstreamHandler);
      }
    });
}

function requestUrl(input) {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  if (input && typeof input.url === 'string') return input.url; // Request object
  return '<unknown>';
}

// Forward-reference to the supabase client so the 401 retry wrapper can call
// `auth.refreshSession()`. The wrapper only runs when an actual HTTP request
// fires (well after `_supabase` has been assigned below), so this is safe.
let _supabase;

// Single-flight token refresh — if N concurrent requests all 401, only ONE
// refreshSession() call goes out and they all await the same promise.
let _refreshPromise = null;
function refreshOnce() {
  if (!_supabase) return Promise.resolve(null);
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = _supabase.auth
    .refreshSession()
    .then(({ data, error }) => (error ? null : data?.session ?? null))
    .catch(() => null)
    .finally(() => { _refreshPromise = null; });
  return _refreshPromise;
}

/**
 * Wraps timeoutFetch with one-shot 401 retry: on a PostgREST 401, force a
 * single token refresh and replay the request with the new Authorization
 * header. Skips /auth/v1/* (refresh endpoint itself returns 401 when the
 * refresh token is dead — retrying would loop).
 */
async function timeoutFetchWithAuthRetry(input, init) {
  const res = await timeoutFetch(input, init);
  if (res.status !== 401) return res;

  const url = requestUrl(input);
  if (url.includes('/auth/v1/')) return res;

  const session = await refreshOnce();
  if (!session?.access_token) return res;

  // Body replay is safe: supabase-js sends JSON strings, not streams.
  const newInit = { ...(init || {}) };
  const headers = new Headers(newInit.headers || {});
  headers.set('Authorization', `Bearer ${session.access_token}`);
  newInit.headers = headers;

  debug('401 -> refreshed + retrying ->', url);
  return timeoutFetch(input, newInit);
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
      fetch: timeoutFetchWithAuthRetry,
    },
  }
);
_supabase = supabase;

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
 * Race any promise against a timeout.
 */
export function withTimeout(promise, ms, label = 'operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), ms)),
  ]);
}

/**
 * Run a self-test against Supabase to surface configuration / connectivity
 * issues the user is hitting. Logs results to the console; returns a report
 * object so a UI can also render it.
 *
 * Usage from DevTools console:
 *   import('/src/supabase.js').then(m => m.runDiagnostics()).then(console.table)
 *
 * Or call from a debug button.
 */
export async function runDiagnostics() {
  const report = { env: {}, auth: {}, db: {}, ok: true };

  // 1. Env vars set?
  report.env.url = supabaseUrl ? '✓ set' : '✗ MISSING';
  report.env.anonKey = supabaseAnonKey ? '✓ set' : '✗ MISSING';
  if (!supabaseUrl || !supabaseAnonKey) report.ok = false;

  // 2. Auth health
  const t1 = performance.now();
  try {
    const { data, error } = await withTimeout(supabase.auth.getSession(), 5000, 'getSession');
    report.auth.getSession = error
      ? `✗ ${error.message}`
      : `✓ ${data?.session ? 'session found' : 'no session'} (${Math.round(performance.now() - t1)}ms)`;
    if (error) report.ok = false;
  } catch (err) {
    report.auth.getSession = `✗ ${err.message}`;
    report.ok = false;
  }

  // 3. Anonymous DB read (verifies the project is awake / RLS reachable)
  const t2 = performance.now();
  try {
    const { error } = await withTimeout(
      supabase.from('profiles').select('id').limit(1),
      5000,
      'db ping'
    );
    report.db.ping = error
      ? `✗ ${error.message} (${error.code || 'no code'})`
      : `✓ ok (${Math.round(performance.now() - t2)}ms)`;
    // Empty result with no error is fine — it means RLS just filtered everything out.
  } catch (err) {
    report.db.ping = `✗ ${err.message}`;
    report.ok = false;
  }

  console.group('[Supabase Diagnostics]');
  console.log('Env:', report.env);
  console.log('Auth:', report.auth);
  console.log('DB:', report.db);
  console.log('Overall:', report.ok ? '✓ healthy' : '✗ problems detected');
  console.groupEnd();

  return report;
}

// Make diagnostics callable from DevTools without imports
if (typeof window !== 'undefined') {
  window.__pkbDiagnostics = runDiagnostics;
}
