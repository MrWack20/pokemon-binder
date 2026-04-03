import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { RefreshCw } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <RefreshCw size={40} className="spinning" />
        <p style={{ opacity: 0.7, fontSize: '1.1rem' }}>Loading…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
}
