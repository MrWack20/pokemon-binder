'use client';

import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env.js';

// Browser-side Supabase client. Reads/writes session from cookies set by the
// middleware — no localStorage involved. Each call returns the same instance
// per page lifetime so subscriptions / state stay consistent.
let _client;
export function createClient() {
  if (_client) return _client;
  _client = createBrowserClient(
    SUPABASE_URL ?? 'https://placeholder.supabase.co',
    SUPABASE_ANON_KEY ?? 'placeholder',
  );
  return _client;
}
