import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
  signUp as authSignUp,
  signIn as authSignIn,
  signOut as authSignOut,
  onAuthStateChange,
} from '../services/supabaseAuth.js';
import { supabase } from '../supabase.js';
import { getProfile, createProfile } from '../services/profileService.js';

const AuthContext = createContext(null);

const PROFILE_RETRY_DELAY = 2000;
const PROFILE_MAX_RETRIES = 3;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const profileRetryRef = useRef(null);
  const mountedRef = useRef(true);

  /**
   * Fetch or create the profile row for a given user.
   * Retries on transient failures to avoid leaving profile as null.
   * NEVER nulls out an existing profile on error — only updates on success.
   */
  const ensureProfile = useCallback(async (currentUser, retries = PROFILE_MAX_RETRIES) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const { data: existing, error } = await getProfile(currentUser.id);
        if (error && error.code !== 'PGRST116') {
          // PGRST116 = "no rows returned" (expected for new users)
          throw error;
        }
        if (existing) {
          if (mountedRef.current) setProfile(existing);
          return;
        }
        // No profile yet — create one
        const displayName =
          currentUser.user_metadata?.full_name ||
          currentUser.user_metadata?.name ||
          currentUser.email?.split('@')[0] ||
          'Trainer';
        const { data: created, error: createErr } = await createProfile(currentUser.id, displayName);
        if (createErr) throw createErr;
        if (mountedRef.current) setProfile(created);
        return;
      } catch (err) {
        console.error(`ensureProfile attempt ${attempt + 1}/${retries + 1}:`, err);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, PROFILE_RETRY_DELAY * (attempt + 1)));
        }
      }
    }
    // All retries exhausted — do NOT null out an existing profile
    console.warn('ensureProfile: all retries failed, keeping existing profile state');
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    // Fallback: if Supabase never responds, unblock UI after 8s
    const fallback = setTimeout(() => {
      if (!cancelled && mountedRef.current) setLoading(false);
    }, 8000);

    // Bootstrap: read session from localStorage (no network call if token is fresh)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      clearTimeout(fallback);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      // Unblock UI immediately — ProtectedRoute only needs `user`, not `profile`
      setLoading(false);
      if (currentUser) {
        await ensureProfile(currentUser);
      } else {
        setProfile(null);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    // Subscribe to subsequent auth changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION' || cancelled) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        // On TOKEN_REFRESHED, don't re-fetch profile unless we don't have one
        if (event === 'TOKEN_REFRESHED' && profile) return;
        await ensureProfile(currentUser);
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      mountedRef.current = false;
      clearTimeout(fallback);
      clearTimeout(profileRetryRef.current);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Force-refresh the profile from the database.
   * Components can call this after updating the profile row.
   */
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await ensureProfile(user, 1);
  }, [user, ensureProfile]);

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
    <AuthContext.Provider value={{ user, profile, setProfile, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
