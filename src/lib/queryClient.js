import { QueryClient } from '@tanstack/react-query';

const NO_RETRY_CODES = new Set(['PGRST301', '42501', 'PGRST116']);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        if (failureCount >= 1) return false;
        if (error?.code && NO_RETRY_CODES.has(error.code)) return false;
        return true;
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: { retry: 0 },
  },
});
