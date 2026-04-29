import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Book } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const { user, loading, profile } = useAuth();

  // Optimistic render: if we already have a cached profile (loaded from
  // sessionStorage on first paint), assume the user is still signed in and
  // render the app immediately. The auth bootstrap continues in the
  // background; if the session is truly stale, it will set user=null and the
  // redirect below will fire on the next render. This eliminates the
  // full-screen spinner flash on every page refresh.
  if (loading && !profile) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.8 }}>
          <Book size={32} />
          <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>PokéBinder</span>
        </div>
        <div style={{
          width: '40px', height: '40px',
          border: '3px solid rgba(255,255,255,0.2)',
          borderTop: '3px solid #fbbf24',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    );
  }

  if (!loading && !user) return <Navigate to="/login" replace />;
  return children;
}
