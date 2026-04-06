import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signUp as authSignUp,
  signIn as authSignIn,
  signOut as authSignOut,
  onAuthStateChange,
} from '../services/supabaseAuth.js';
import { supabase } from '../supabase.js';
import { getProfile, createProfile } from '../services/profileService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Bootstrap: read session from localStorage immediately (no network call if token is fresh).
    // This is the fast path on page refresh — avoids waiting for onAuthStateChange to fire.
    // Fallback increased to 10s — slow networks shouldn't redirect logged-in users to /login
    const fallback = setTimeout(() => { if (!cancelled) setLoading(false); }, 10000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      clearTimeout(fallback);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      // Unblock the UI immediately — ProtectedRoute only needs `user`, not `profile`.
      // ensureProfile() runs in the background; profile state updates when it resolves.
      if (!cancelled) setLoading(false);
      if (currentUser) {
        try { await ensureProfile(currentUser); } catch (err) { console.error('ensureProfile:', err); }
      } else {
        setProfile(null);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    // Subscribe to subsequent auth changes (sign in, sign out, token refresh).
    // Skip INITIAL_SESSION — already handled by getSession() above.
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION' || cancelled) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        try { await ensureProfile(currentUser); } catch (err) { console.error('ensureProfile:', err); }
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(fallback);
      subscription.unsubscribe();
    };
  }, []);

  async function ensureProfile(currentUser) {
    const { data: existing } = await getProfile(currentUser.id);
    if (existing) {
      setProfile(existing);
    } else {
      const displayName =
        currentUser.user_metadata?.full_name ||
        currentUser.user_metadata?.name ||
        currentUser.email?.split('@')[0] ||
        'Trainer';
      const { data: created } = await createProfile(currentUser.id, displayName);
      setProfile(created);
    }
  }

  async function signUp(email, password) {
    return authSignUp(email, password);
  }

  async function signIn(email, password) {
    return authSignIn(email, password);
  }

  async function signOut() {
    const { error } = await authSignOut();
    if (!error) {
      setUser(null);
      setProfile(null);
    }
    return { error };
  }

  return (
    <AuthContext.Provider value={{ user, profile, setProfile, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
