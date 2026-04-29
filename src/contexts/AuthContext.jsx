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
const VIEW_CACHE_KEY = 'pkb_dashboard_view';

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
  const profileRef = useRef(profile);
  const mountedRef = useRef(true);
  const explicitSignOutRef = useRef(false);

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  // Shallow-equal check for profile rows. Skipping a setProfile when the
  // contents are unchanged keeps the object reference stable, which prevents
  // downstream useEffects (like Dashboard's binder loader) from re-firing on
  // tab focus / token refresh / view switch.
  function profilesEqual(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;
    return a.id === b.id
      && a.user_id === b.user_id
      && a.name === b.name
      && a.avatar_url === b.avatar_url;
  }

  // ── ensureProfile ─────────────────────────────────────────────────────────
  const ensureProfile = useCallback(async (authUser) => {
    try {
      const { data: existing, error } = await getProfile(authUser.id);
      if (error && error.code !== 'PGRST116') { console.error('getProfile:', error); return; }
      if (existing) {
        if (mountedRef.current && !profilesEqual(profileRef.current, existing)) {
          setProfile(existing);
          cacheProfile(existing);
        }
        return;
      }
      const name = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Trainer';
      const { data: created, error: err2 } = await createProfile(authUser.id, name);
      if (err2) { console.error('createProfile:', err2); return; }
      if (mountedRef.current && !profilesEqual(profileRef.current, created)) {
        setProfile(created);
        cacheProfile(created);
      }
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
        // Only update user state if the id actually changed. Replacing the
        // user object on every token refresh creates a new reference that
        // can cascade into expensive re-renders downstream.
        if (u && userRef.current?.id !== u.id) setUser(u);
        return;
      }

      if (event === 'SIGNED_OUT') {
        if (explicitSignOutRef.current) {
          setUser(null); setProfile(null);
          cacheProfile(null); cacheBinders(null);
          try { sessionStorage.removeItem(VIEW_CACHE_KEY); } catch { /* ignore */ }
          explicitSignOutRef.current = false;
        }
        // Transient SIGNED_OUT: do nothing. Don't clear state.
        // The visibilitychange handler and ensureValidSession() in the
        // service layer will recover the session when needed.
        return;
      }

      // SIGNED_IN — fires on first sign-in AND can re-fire when Supabase
      // re-establishes a session from storage. Skip the profile re-fetch
      // when it's the same user we already know about.
      const sameUser = userRef.current?.id === u?.id;
      if (!sameUser) setUser(u);
      if (u && !sameUser) await ensureProfile(u);
      else if (!u) { setProfile(null); cacheProfile(null); }
    });

    return () => {
      cancelled = true;
      mountedRef.current = false;
      clearTimeout(fallback);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Visibility / online / periodic session refresh ────────────────────────
  // Three triggers keep the JWT alive so the next DB call always works:
  //   1. Tab becomes visible (defeats background-tab setTimeout throttling).
  //   2. Browser reports we're back online (network reconnected).
  //   3. Every 4 minutes while user is signed in (catches everything else).
  //
  // Throttled to one refresh per 30s — without this, alt-tabbing rapidly
  // (OS notifications, dev-tools focus, etc.) fired getSession() over and
  // over, and each one could trigger a TOKEN_REFRESHED event that cascaded
  // into re-renders. See Mistakes Log #18 and #21.
  useEffect(() => {
    let lastRefreshAt = 0;
    const MIN_INTERVAL_MS = 30_000;

    function refreshIfSignedIn() {
      if (!userRef.current) return;
      const now = Date.now();
      if (now - lastRefreshAt < MIN_INTERVAL_MS) return;
      lastRefreshAt = now;
      supabase.auth.getSession().catch(() => {});
    }
    function handleVisibility() {
      if (document.visibilityState === 'visible') refreshIfSignedIn();
    }
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', refreshIfSignedIn);

    const intervalId = setInterval(refreshIfSignedIn, 4 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', refreshIfSignedIn);
      clearInterval(intervalId);
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!userRef.current) return;
    await ensureProfile(userRef.current);
  }, [ensureProfile]);

  async function signUp(email, password) { return authSignUp(email, password); }
  async function signIn(email, password) { return authSignIn(email, password); }

  async function signOut() {
    explicitSignOutRef.current = true;
    // Fire the network sign-out but do NOT block the UI on it. The local
    // signOut helper has its own 3s timeout; even so, we clear local state
    // immediately so the user is never stuck on "Signing out…". The Supabase
    // request completes (or times out) in the background. See Mistakes Log #22.
    authSignOut().catch((err) => console.error('signOut (background):', err));
    setUser(null); setProfile(null);
    cacheProfile(null); cacheBinders(null);
    try { sessionStorage.removeItem(VIEW_CACHE_KEY); } catch { /* ignore */ }
    return { error: null };
  }

  /**
   * Last-resort escape hatch. Wipes all auth-related local/session storage
   * keys and reloads the page. Used by UserMenu when the normal sign-out
   * appears stuck (e.g. catastrophic Supabase outage).
   */
  function forceSignOut() {
    try {
      explicitSignOutRef.current = true;
      // Remove all Supabase auth tokens (key prefix is `sb-`).
      Object.keys(localStorage)
        .filter((k) => k.startsWith('sb-'))
        .forEach((k) => localStorage.removeItem(k));
      sessionStorage.removeItem(PROFILE_CACHE_KEY);
      sessionStorage.removeItem(BINDERS_CACHE_KEY);
      sessionStorage.removeItem(VIEW_CACHE_KEY);
    } catch (err) {
      console.error('forceSignOut cleanup:', err);
    }
    window.location.replace('/login');
  }

  return (
    <AuthContext.Provider value={{ user, profile, setProfile, loading, signUp, signIn, signOut, forceSignOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
