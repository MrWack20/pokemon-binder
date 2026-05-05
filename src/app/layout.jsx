import { createClient } from '@/lib/supabase/server';
import { envHealth, browserEnvHealth } from '@/lib/supabase/env';
import { Providers } from './providers';
import './globals.css';

export const metadata = {
  title: 'PokéBinder',
  description: 'Organize and showcase your TCG collection digitally.',
};

/**
 * Renders a red banner if Supabase env vars are missing. Checks BOTH:
 *   - The general envHealth (server-resolvable URL/key, used by SSR + proxy)
 *   - The browser-specific NEXT_PUBLIC_* flags — because these are what the
 *     client bundle actually reads. With only VITE_* set, server fetches
 *     succeed but every browser fetch fails with "Failed to fetch" against
 *     the placeholder URL.
 */
function EnvHealthBanner() {
  if (envHealth.ok && browserEnvHealth.ok) return null;

  const missing = [
    browserEnvHealth.urlMissing && 'NEXT_PUBLIC_SUPABASE_URL',
    browserEnvHealth.keyMissing && 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ].filter(Boolean).join(', ');

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000,
      background: '#7f1d1d', color: '#fff', padding: '10px 16px',
      fontSize: '0.85rem', textAlign: 'center', lineHeight: 1.4,
      borderBottom: '1px solid #ef4444',
    }}>
      <strong>Configuration error:</strong> Missing env var(s): <code>{missing}</code>.
      {' '}Set them under <strong>Vercel → Project Settings → Environment Variables</strong> for
      both Production AND Preview, then <strong>redeploy</strong> (Next.js inlines these at build
      time, so an existing deployment won&apos;t pick them up).
    </div>
  );
}

export default async function RootLayout({ children }) {
  // Server-side session validation. Middleware has already refreshed the
  // cookie if needed, so getUser() here is talking to the auth server with
  // a guaranteed-fresh token. The result is passed to the client provider
  // so the very first client paint already knows who's signed in.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body>
        <EnvHealthBanner />
        <Providers initialUser={user}>{children}</Providers>
      </body>
    </html>
  );
}
