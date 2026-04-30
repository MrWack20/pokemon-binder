import { QueryClient } from '@tanstack/react-query';

// Codes we never auto-retry on. PGRST301 = JWT invalid (handled by the
// 401 interceptor in supabase.js), 42501 = RLS denied (a real permission
// problem — retrying won't fix it), PGRST116 = single-row not found.
const NO_RETRY_CODES = new Set(['PGRST301', '42501', 'PGRST116']);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30s feels right for collection data — long enough to avoid refetching
      // on every navigation, short enough that the UI feels live.
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        if (failureCount >= 1) return false;
        if (error?.code && NO_RETRY_CODES.has(error.code)) return false;
        return true;
      },
      // These three replace AuthContext's hand-rolled visibility / online /
      // 4-min-interval refresh listeners. React Query already does it.
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
