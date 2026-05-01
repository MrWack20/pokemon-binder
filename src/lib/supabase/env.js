// Shared env-var resolution. Accepts either the Next.js convention
// (NEXT_PUBLIC_*) or the legacy Vite name so a Vercel project that hasn't
// renamed its variables yet still boots.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

export const envHealth = {
  urlMissing: !SUPABASE_URL,
  keyMissing: !SUPABASE_ANON_KEY,
  ok: !!SUPABASE_URL && !!SUPABASE_ANON_KEY,
};

if (!envHealth.ok && typeof window !== 'undefined') {
  const missing = [
    envHealth.urlMissing && 'SUPABASE_URL',
    envHealth.keyMissing && 'SUPABASE_ANON_KEY',
  ].filter(Boolean).join(', ');
  console.error(
    `[PokeBinder] Missing Supabase env var(s): ${missing}.\n` +
    'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local ' +
    '(or in Vercel Project Settings → Environment Variables for both Production AND Preview).'
  );
}
