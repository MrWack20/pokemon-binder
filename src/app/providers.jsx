'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/contexts/AuthContext';
import WebVitalsReporter from '@/components/WebVitalsReporter';

export function Providers({ initialUser, children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialUser={initialUser}>
        {children}
        <Toaster position="top-right" />
      </AuthProvider>
      {/* Logs Core Web Vitals (LCP, INP, CLS, FCP, TTFB) to the browser
          console. ~5KB, dynamically imported on mount. */}
      <WebVitalsReporter />
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}
