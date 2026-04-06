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

// ── Session-Storage helpers (survive refresh within same tab) ────────────────

function getCachedProfile() {
  try { return JSON.parse(sessionStorage.getItem(PROFILE_CACHE_KEY)); }
  catch { return null; }
}
function cacheProfile(p) {
  try { p ? sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(p)) : sessionStorage.removeItem(PROFILE_CACHE_KEY); }
  catch { /* ignore */ }
}

export function getCachedBinders() {
  try { return JSON.parse(sessionStorage.getItem(BINDERS_CACHE_KEY)); }
  catch { return null; }
}
export function cacheBinders(b) {
  try { b ? sessionStorage.setItem(BINDERS_CACHE_KEY, JSON.stringify(b)) : sessionStorage.removeItem(BINDERS_CACHE_KEY); }
  catch { /* ignore */ }
}

// ── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(() => getCachedProfile());
  const [loading, setLoading] = useState(true);

  const profileRef = useRef(profile);
  const userRef = useRef(user);
  const mountedRef = useRef(true);
  const explicitSignOutRef = useRef(false);

  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { userRef.current = user; }, [user]);

  // ── ensureProfile: fetch or create, NEVER null out on failure ─────────────
  const ensureProfile = useCallback(async (authUser) => {
    try {
      const { data: existing, error } = await getProfile(authUser.id);
      // PGRST116 = "no rows" — expected for brand-new users
      if (error && error.code !== 'PGRST116') {
        console.error('getProfile error:', error);
        return; // keep stale profile
      }
      if (existing) {
        if (mountedRef.current) { setProfile(existing); cacheProfile(existing); }
        return;
      }
      const displayName =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.email?.split('@')[0] ||
        'Trainer';
      const { data: created, error: err2 } = await createProfile(authUser.id, displayName);
      if (err2) { console.error('createProfile error:', err2); return; }
      if (mountedRef.current) { setProfile(created); cacheProfile(created); }
    } catch (err) {
      console.error('ensureProfile exception:', err);
    }
  }, []);

  // ── Bootstrap + auth listener ─────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    const fallback = setTimeout(() => {
      if (!cancelled && mountedRef.current) setLoading(false);
    }, 6000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      clearTimeout(fallback);
      const u = session?.user ?? null;
      setUser(u);
      setLoading(false);
      if (u) await ensureProfile(u);
      else { setProfile(null); cacheProfile(null); }
    }).catch(() => { if (!cancelled) setLoading(false); });

    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION' || cancelled) return;
      const u = session?.user ?? null;

      if (event === 'TOKEN_REFRESHED') {
        // Just update user ref — don't touch profile or trigger re-fetches
        if (u) setUser(u);
        return;
      }

      if (event === 'SIGNED_OUT') {
        if (explicitSignOutRef.current) {
          // User clicked "sign out" — clear everything
          setUser(null); setProfile(null);
          cacheProfile(null); cacheBinders(null);
          explicitSignOutRef.current = false;
        }
        // If not explicit, do NOTHING. Don't clear state on transient failures.
        // The visibilitychange handler below will recover the session when the
        // user returns to the tab.
        return;
      }

      // SIGNED_IN
      setUser(u);
      if (u) await ensureProfile(u);
      else { setProfile(null); cacheProfile(null); }
    });

    return () => {
      cancelled = true;
      mountedRef.current = false;
      clearTimeout(fallback);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Visibility change: refresh session when tab regains focus ─────────────
  //
  // Browsers throttle setTimeout in background tabs, so Supabase's auto-refresh
  // timer might not fire. When the user returns, the JWT could be expired and
  // ALL RLS queries silently return empty data.
  //
  // This listener fires getSession() (which triggers a refresh if the JWT is
  // expired but the refresh token is still valid). If the session is truly dead,
  // we clear state and let ProtectedRoute redirect to /login.
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState !== 'visible') return;
      if (!userRef.current) return; // not logged in
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!mountedRef.current) return;
        if (session?.user) {
          // Session is valid (or was just refreshed) — update user in case JWT changed
          setUser(session.user);
        } else if (!explicitSignOutRef.current) {
          // Session truly expired — clear state
          setUser(null);
          setProfile(null);
          cacheProfile(null);
          cacheBinders(null);
        }
      }).catch(() => {
        // Network down — keep current state, don't boot user
      });
    }

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // ── Periodic session health check (every 4 minutes) ──────────────────────
  // Safety net: even if the user never leaves the tab, ensure the JWT stays fresh.
  useEffect(() => {
    const interval = setInterval(() => {
      if (!userRef.current) return;
      supabase.auth.getSession().catch(() => {});
    }, 4 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!userRef.current) return;
    await ensureProfile(userRef.current);
  }, [ensureProfile]);

  async function signUp(email, password) { return authSignUp(email, password); }
  async function signIn(email, password) { return authSignIn(email, password); }

  async function signOut() {
    explicitSignOutRef.current = true;
    try { await authSignOut(); } catch (err) { console.error('signOut:', err); }
    // ALWAYS clear local state — honour user intent even if Supabase call fails
    setUser(null); setProfile(null);
    cacheProfile(null); cacheBinders(null);
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
