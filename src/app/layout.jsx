import NextTopLoader from 'nextjs-toploader';
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
      <head>
        {/* Resource hints for card-image CDNs. Preconnect performs the
            DNS lookup + TLS handshake before the first image is even
            requested, shaving ~150-300ms off the time-to-first-image
            on cold visits. Each card image after the first piggybacks
            on the same warm HTTP/2 connection. */}
        <link rel="preconnect" href="https://assets.tcgdex.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://assets.tcgdex.net" />
        <link rel="preconnect" href="https://images.pokemontcg.io" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.pokemontcg.io" />
      </head>
      <body>
        {/* Top progress bar — gives instant visual ack on every <Link>
            click so even a sub-100ms route change feels intentional.
            Brand-yellow, no spinner (showSpinner: false), 200ms initial
            delay so we don't flicker on truly instant nav. */}
        <NextTopLoader
          color="#fbbf24"
          height={3}
          showSpinner={false}
          shadow="0 0 10px #fbbf24, 0 0 5px #fbbf24"
        />
        <EnvHealthBanner />
        <Providers initialUser={user}>{children}</Providers>
      </body>
    </html>
  );
}
