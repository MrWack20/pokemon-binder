'use client';

import { useEffect } from 'react';

/**
 * WebVitalsReporter — instrument Core Web Vitals (LCP, INP, CLS, FCP, TTFB)
 * and log them to the browser console with the standard "good / needs
 * improvement / poor" thresholds.
 *
 * For now we only log; once we wire up an analytics endpoint (Plausible,
 * a Supabase Edge Function, etc.), the body of `report` is the place to
 * forward these. Web Vitals fires each metric only once per page lifetime.
 *
 * Bundle cost: ~5KB gzipped, dynamically imported so it doesn't appear in
 * the initial page chunk — only once `useEffect` runs on the client.
 */
export default function WebVitalsReporter() {
  useEffect(() => {
    // Dynamic import keeps web-vitals out of the initial bundle.
    import('web-vitals').then(({ onLCP, onINP, onCLS, onFCP, onTTFB }) => {
      const report = (m) => {
        // m has { name, value, rating, delta, id, navigationType }.
        // Format: "[Vitals] LCP 1234ms · good"
        const value = ['CLS'].includes(m.name)
          ? m.value.toFixed(3)
          : `${Math.round(m.value)}ms`;
        // eslint-disable-next-line no-console
        console.log(`[Vitals] ${m.name} ${value} · ${m.rating}`);
      };
      onLCP(report);
      onINP(report);
      onCLS(report);
      onFCP(report);
      onTTFB(report);
    }).catch(() => { /* web-vitals failed to load — non-fatal */ });
  }, []);

  return null;
}
