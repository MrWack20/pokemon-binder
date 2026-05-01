import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env.js';

// Routes that don't need an authenticated user. Anything not in this list
// will be redirected to /login when the middleware can't find a user.
const PUBLIC_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/auth', // /auth/callback, /auth/reset-password
];

function isPublicPath(pathname) {
  return PUBLIC_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Per-request session refresh + auth gate.
 *
 * The Supabase SDK's getUser() call validates the JWT against the auth
 * server. If the access token is expired but the refresh token is still
 * valid, the SDK refreshes BOTH tokens and we propagate the new cookies
 * onto the response. If the refresh fails (refresh token also dead), the
 * user is treated as signed-out and redirected to /login.
 *
 * This is the fix for "stale-token-returns-empty-data": by the time the
 * page renders, the cookies are guaranteed fresh — there's no client-side
 * race window where queries fire with an expired token.
 */
export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    SUPABASE_URL ?? 'https://placeholder.supabase.co',
    SUPABASE_ANON_KEY ?? 'placeholder',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not run any code between createServerClient and getUser —
  // the @supabase/ssr docs are explicit about this. getUser is the only call
  // that revalidates the session against the auth server.
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Unauthenticated users hitting a protected route → /login
  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated users on /login or /register → /
  if (user && (pathname === '/login' || pathname === '/register')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
