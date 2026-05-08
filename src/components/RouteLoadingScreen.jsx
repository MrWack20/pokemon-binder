'use client';

import { Book } from 'lucide-react';

/**
 * Shared shell for Next.js per-route loading.jsx files. Renders
 * immediately on navigation while the destination's Server Component
 * fetches its data. Mirrors the app's header so the user perceives
 * the navigation as "I'm on the new page, just loading content"
 * rather than "I'm in nowhere-land waiting for a fetch."
 */
export default function RouteLoadingScreen({ title }) {
  return (
    <div className="app">
      <div className="container">
        <div className="header header--compact">
          <div className="header-top">
            <h1>
              <Book size={36} style={{ marginRight: '12px', flexShrink: 0, color: '#fbbf24' }} />
              <span className="brand-text">PokéBinder</span>
            </h1>
          </div>
        </div>

        {title && (
          <div className="section-header">
            <h2 style={{ opacity: 0.6 }}>{title}</h2>
          </div>
        )}

        <div style={{
          minHeight: '40vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255,255,255,0.15)',
            borderTop: '3px solid #fbbf24',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      </div>
    </div>
  );
}
