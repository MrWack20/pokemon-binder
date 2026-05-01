import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * OAuth + email-confirmation callback.
 *
 * Supabase redirects users here after Google sign-in or after they click the
 * confirmation link in their welcome email. The URL carries either a `code`
 * (PKCE flow) that we exchange for a session, or — for some legacy email
 * flows — a `token_hash` + `type` that we verify directly. Either way the
 * session ends up in HttpOnly cookies set by createServerClient, and the
 * user is redirected to the destination.
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
