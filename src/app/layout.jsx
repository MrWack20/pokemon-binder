import { createClient } from '@/lib/supabase/server';
import { envHealth } from '@/lib/supabase/env';
import { Providers } from './providers';
import './globals.css';

export const metadata = {
  title: 'PokéBinder',
  description: 'Organize and showcase your TCG collection digitally.',
};

function EnvHealthBanner() {
  if (envHealth.ok) return null;
  const missing = [
    envHealth.urlMissing && 'SUPABASE_URL',
    envHealth.keyMissing && 'SUPABASE_ANON_KEY',
  ].filter(Boolean).join(', ');
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000,
      background: '#7f1d1d', color: '#fff', padding: '10px 16px',
      fontSize: '0.85rem', textAlign: 'center', lineHeight: 1.4,
      borderBottom: '1px solid #ef4444',
    }}>
      <strong>Configuration error:</strong> Missing env var(s): <code>{missing}</code>.
      {' '}On Vercel set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
      <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> for both Production AND Preview, then redeploy.
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
