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

// ── Session-Storage helpers ─────────────────────────────────────────────────

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

  const userRef = useRef(user);
  const mountedRef = useRef(true);
  const explicitSignOutRef = useRef(false);

  useEffect(() => { userRef.current = user; }, [user]);

  // ── ensureProfile ─────────────────────────────────────────────────────────
  const ensureProfile = useCallback(async (authUser) => {
    try {
      const { data: existing, error } = await getProfile(authUser.id);
      if (error && error.code !== 'PGRST116') { console.error('getProfile:', error); return; }
      if (existing) {
        if (mountedRef.current) { setProfile(existing); cacheProfile(existing); }
        return;
      }
      const name = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Trainer';
      const { data: created, error: err2 } = await createProfile(authUser.id, name);
      if (err2) { console.error('createProfile:', err2); return; }
      if (mountedRef.current) { setProfile(created); cacheProfile(created); }
    } catch (err) {
      console.error('ensureProfile:', err);
    }
  }, []);

  // ── Bootstrap ─────────────────────────────────────────────────────────────
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
        if (u) setUser(u);
        return;
      }

      if (event === 'SIGNED_OUT') {
        if (explicitSignOutRef.current) {
          setUser(null); setProfile(null);
          cacheProfile(null); cacheBinders(null);
          explicitSignOutRef.current = false;
        }
        // Transient SIGNED_OUT: do nothing. Don't clear state.
        // The visibilitychange handler and ensureValidSession() in the
        // service layer will recover the session when needed.
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

  // ── Visibility change: keep session alive when returning to tab ───────────
  // This ONLY refreshes the Supabase session (so the next DB call works).
  // It does NOT touch React state — no re-renders, no race conditions.
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState !== 'visible') return;
      if (!userRef.current) return;
      // getSession() reads from memory. If the JWT inside is expired,
      // Supabase internally calls refreshSession() before returning.
      // We don't care about the result — we just want the token refreshed.
      supabase.auth.getSession().catch(() => {});
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
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
    // ALWAYS clear — honour user intent even if Supabase call fails
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
