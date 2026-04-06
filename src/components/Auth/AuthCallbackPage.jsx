import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { supabase } from '../../supabase.js';

/**
 * Handles the OAuth redirect from Google (and any other OAuth provider).
 * Supabase JS v2 uses PKCE by default — after Google auth it redirects back
 * here with ?code=xxx. We exchange the code for a session, then go to the app.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth
      .exchangeCodeForSession(window.location.href)
      .then(() => navigate('/', { replace: true }))
      .catch(() => navigate('/login', { replace: true }));
  }, [navigate]);

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
      <p style={{ opacity: 0.7, fontSize: '1.1rem' }}>Completing sign in…</p>
    </div>
  );
}
