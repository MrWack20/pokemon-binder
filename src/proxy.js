import { updateSession } from '@/lib/supabase/middleware';

// Next.js 16 renamed `middleware` → `proxy`. Same lifecycle: runs on every
// request before the page handler, can read/write cookies, can redirect.
export async function proxy(request) {
  return await updateSession(request);
}

export const config = {
  // Run on every request EXCEPT Next.js internals and static assets.
  // We deliberately include API/route handlers — they're auth-sensitive too.
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)',
  ],
};
