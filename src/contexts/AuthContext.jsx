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

const PROFILE_CACHE_KEY = 'pkb_profile_cache';
const BINDERS_CACHE_KEY = 'pkb_binders_cache';

/**
 * Read cached profile from sessionStorage.
 * Provides instant data on refresh while we wait for the DB.
 */
function getCachedProfile() {
  try {
    const raw = sessionStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function cacheProfile(profile) {
  try {
    if (profile) sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    else sessionStorage.removeItem(PROFILE_CACHE_KEY);
  } catch { /* ignore */ }
}

/** Cache binders so Dashboard can show them instantly on refresh. */
export function getCachedBinders() {
  try {
    const raw = sessionStorage.getItem(BINDERS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function cacheBinders(binders) {
  try {
    if (binders) sessionStorage.setItem(BINDERS_CACHE_KEY, JSON.stringify(binders));
    else sessionStorage.removeItem(BINDERS_CACHE_KEY);
  } catch { /* ignore */ }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(() => getCachedProfile());
  const [loading, setLoading] = useState(true);

  // Refs to avoid stale closures in callbacks
  const profileRef = useRef(profile);
  const userRef = useRef(user);
  const mountedRef = useRef(true);
  const explicitSignOutRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { userRef.current = user; }, [user]);

  /**
   * Fetch or create the profile for a user.
   * On failure: never clears an existing profile — stale data > no data.
   */
  const ensureProfile = useCallback(async (currentUser) => {
    try {
      const { data: existing, error } = await getProfile(currentUser.id);
      if (error && error.code !== 'PGRST116') {
        // Real error (not "no rows") — keep existing profile if we have one
        console.error('getProfile error:', error);
        return;
      }
      if (existing) {
        if (mountedRef.current) {
          setProfile(existing);
          cacheProfile(existing);
        }
        return;
      }
      // New user — create profile
      const displayName =
        currentUser.user_metadata?.full_name ||
        currentUser.user_metadata?.name ||
        currentUser.email?.split('@')[0] ||
        'Trainer';
      const { data: created, error: createErr } = await createProfile(currentUser.id, displayName);
      if (createErr) {
        console.error('createProfile error:', createErr);
        return;
      }
      if (mountedRef.current) {
        setProfile(created);
        cacheProfile(created);
      }
    } catch (err) {
      console.error('ensureProfile exception:', err);
      // Keep whatever profile we have — don't blank the UI
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    // Fallback: if Supabase never responds, unblock UI after 6s
    const fallback = setTimeout(() => {
      if (!cancelled && mountedRef.current) setLoading(false);
    }, 6000);

    // Bootstrap: read session from localStorage (fast path, no network if token is fresh)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      clearTimeout(fallback);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      // Unblock UI immediately — ProtectedRoute only needs `user`, not `profile`
      setLoading(false);

      if (currentUser) {
        // We may already have a cached profile from sessionStorage (set in useState init).
        // Still fetch fresh data from DB in the background.
        await ensureProfile(currentUser);
      } else {
        setProfile(null);
        cacheProfile(null);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    // Listen for subsequent auth events
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION' || cancelled) return;

      const currentUser = session?.user ?? null;

      if (event === 'TOKEN_REFRESHED') {
        // Token refreshed — update user object but DON'T re-fetch profile.
        // We already have it. This prevents unnecessary DB calls and state churn.
        if (currentUser) {
          setUser(currentUser);
        }
        return;
      }

      if (event === 'SIGNED_OUT') {
        // Only clear state if the user explicitly signed out.
        // Supabase can fire SIGNED_OUT on token refresh failure — we don't
        // want to boot the user just because of a transient network issue.
        if (explicitSignOutRef.current) {
          setUser(null);
          setProfile(null);
          cacheProfile(null);
          cacheBinders(null);
          explicitSignOutRef.current = false;
        } else {
          // Transient — try to recover the session silently
          console.warn('Unexpected SIGNED_OUT event — attempting session recovery');
          try {
            const { data: { session: recovered } } = await supabase.auth.getSession();
            if (recovered?.user) {
              setUser(recovered.user);
              // Profile is still in state from before, so no action needed
            }
            // If no session recovered, the user's refresh token truly expired.
            // In that case we do need to clear state.
            else {
              setUser(null);
              setProfile(null);
              cacheProfile(null);
              cacheBinders(null);
            }
          } catch {
            // Network completely down — keep current state, don't boot user
            console.warn('Session recovery failed — keeping current state');
          }
        }
        return;
      }

      // SIGNED_IN or other events
      setUser(currentUser);
      if (currentUser) {
        await ensureProfile(currentUser);
      } else {
        setProfile(null);
        cacheProfile(null);
      }
    });

    return () => {
      cancelled = true;
      mountedRef.current = false;
      clearTimeout(fallback);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshProfile = useCallback(async () => {
    if (!userRef.current) return;
    await ensureProfile(userRef.current);
  }, [ensureProfile]);

  async function signUp(email, password) {
    return authSignUp(email, password);
  }

  async function signIn(email, password) {
    return authSignIn(email, password);
  }

  async function signOut() {
    // Mark explicit sign-out BEFORE calling Supabase.
    // This tells the onAuthStateChange handler to actually clear state.
    explicitSignOutRef.current = true;
    try {
      const { error } = await authSignOut();
      if (error) {
        console.error('signOut error:', error);
        // Even if Supabase call fails, STILL clear local state.
        // User clicked "sign out" — honour their intent.
      }
    } catch (err) {
      console.error('signOut exception:', err);
    }
    // Always clear local state regardless of Supabase response
    setUser(null);
    setProfile(null);
    cacheProfile(null);
    cacheBinders(null);
    return { error: null };
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
