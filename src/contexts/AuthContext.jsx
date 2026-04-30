import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
  signUp as authSignUp,
  signIn as authSignIn,
  signOut as authSignOut,
  onAuthStateChange,
} from '../services/supabaseAuth.js';
import { supabase, ensureValidSession } from '../supabase.js';
import { queryClient } from '../queryClient.js';
import { getProfile, createProfile } from '../services/profileService.js';

const AuthContext = createContext(null);

// Profile is cached in sessionStorage so ProtectedRoute can optimistically
// render the app on a hard refresh without waiting for the auth bootstrap.
// Binder/card data lives in the React Query cache (see queryClient.js).
const PROFILE_CACHE_KEY = 'pkb_profile_cache';

// Legacy keys we proactively clear on sign-out so old cached data from
// previous app versions doesn't leak between accounts on the same device.
const LEGACY_KEYS = ['pkb_binders_cache', 'pkb_dashboard_view', 'pkb_cards_cache'];

function getCachedProfile() {
  try { return JSON.parse(sessionStorage.getItem(PROFILE_CACHE_KEY)); }
  catch { return null; }
}
function cacheProfile(p) {
  try { p ? sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(p)) : sessionStorage.removeItem(PROFILE_CACHE_KEY); }
  catch { /* ignore */ }
}
function clearLegacyCaches() {
  try {
    LEGACY_KEYS.forEach(k => sessionStorage.removeItem(k));
    // Also clear the per-query sessionStorage fallback used by hooks/queries.js
    // so signed-out devices don't leak the previous user's binders/cards.
    Object.keys(sessionStorage)
      .filter(k => k.startsWith('pkb_qcache:'))
      .forEach(k => sessionStorage.removeItem(k));
  } catch { /* ignore */ }
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

    // ensureValidSession() refreshes the JWT if it's near/past expiry, so
    // the very first DB call below uses a fresh token. Without this, an
    // expired-but-not-yet-refreshed token causes RLS to silently return []
    // and the user sees an empty dashboard. See Mistakes Log #17.
    ensureValidSession().then(async (session) => {
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
          cacheProfile(null);
          clearLegacyCaches();
          queryClient.clear();
          explicitSignOutRef.current = false;
        }
        // Transient SIGNED_OUT (failed token refresh, brief network blip):
        // do nothing. The next service call will hit the 401 interceptor
        // in supabase.js, which refreshes + retries — or surfaces the
        // failure cleanly so the user can re-auth.
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

  // Token-keepalive listeners (visibilitychange / online / 4-min interval)
  // used to live here. They were redundant once React Query took over data
  // fetching: every focus/reconnect now triggers refetchOnWindowFocus /
  // refetchOnReconnect, which sends a real query that the 401 interceptor in
  // supabase.js will refresh + retry on if the JWT expired. See Mistakes Log
  // #18, #21, #23 for the pre-React-Query history.

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
    cacheProfile(null);
    clearLegacyCaches();
    queryClient.clear();
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
      clearLegacyCaches();
      queryClient.clear();
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
