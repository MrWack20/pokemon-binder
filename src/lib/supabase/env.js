// Shared env-var resolution.
//
// IMPORTANT: Next.js only inlines `NEXT_PUBLIC_*` variables into the browser
// bundle. Anything else (like the legacy `VITE_*` names) only exists on the
// server. Client code that reads `process.env.VITE_SUPABASE_URL` will get
// `undefined` no matter what's set on Vercel.
//
// We still consult both names below so a half-migrated server still works,
// but the browser bundle requires the `NEXT_PUBLIC_*` versions to be set.

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

// Fields below are computed once at module load. The two `*Missing` flags are
// what the EnvHealthBanner reads; `ok` is the convenient negation.
export const envHealth = {
  urlMissing: !SUPABASE_URL,
  keyMissing: !SUPABASE_ANON_KEY,
  ok: !!SUPABASE_URL && !!SUPABASE_ANON_KEY,
};

// Specifically the *NEXT_PUBLIC_* flags — these are what determine whether
// the BROWSER bundle has working env. If only VITE_* is set on Vercel, the
// server checks above will pass but the browser will fail with "Failed to
// fetch" against the placeholder URL. Surface that explicitly.
export const browserEnvHealth = {
  urlMissing: !process.env.NEXT_PUBLIC_SUPABASE_URL,
  keyMissing: !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ok:
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

if (typeof window !== 'undefined' && !browserEnvHealth.ok) {
  const missing = [
    browserEnvHealth.urlMissing && 'NEXT_PUBLIC_SUPABASE_URL',
    browserEnvHealth.keyMissing && 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ].filter(Boolean).join(', ');
  console.error(
    `[PokeBinder] Browser bundle is missing: ${missing}.\n` +
    'These must be set as NEXT_PUBLIC_* env vars on Vercel (Production AND ' +
    'Preview separately) and the project must be REDEPLOYED — Next.js inlines ' +
    'these at build time, so an existing deployment will not pick them up. ' +
    'Setting only VITE_* will not work for the browser bundle.'
  );
}
