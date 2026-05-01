import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env.js';

/**
 * Server-side Supabase client for use in Server Components, Server Actions,
 * and Route Handlers. Reads cookies set by the middleware and writes new
 * ones when the SDK refreshes a token.
 *
 * Server Components are forbidden from setting cookies, so the setAll
 * try/catch is intentional — middleware will refresh on the next request.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    SUPABASE_URL ?? 'https://placeholder.supabase.co',
    SUPABASE_ANON_KEY ?? 'placeholder',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            /* called from a Server Component — ignore, middleware handles it */
          }
        },
      },
    }
  );
}
