'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  signUp as authSignUp,
  signIn as authSignIn,
  signOut as authSignOut,
  onAuthStateChange,
} from '@/services/supabaseAuth';
import { getProfile, createProfile } from '@/services/profileService';

const AuthContext = createContext(null);

/**
 * AuthProvider — client mirror of the server-validated session.
 *
 * The server has ALREADY validated the user (via middleware) before this
 * component renders. `initialUser` is what the server saw. The browser
 * client subscribes to `onAuthStateChange` to stay in sync if a token
 * refresh, sign-in or sign-out happens after page load.
 *
 * Profile data is owned by React Query (`useQuery` below) so it follows
 * the same caching + refetch rules as binders/cards. No more sessionStorage
 * shadowing.
 */
export function AuthProvider({ initialUser, children }) {
  const [user, setUser] = useState(initialUser ?? null);
  const router = useRouter();
  const queryClient = useQueryClient();

  // ── Mirror auth state events into local state + cache ─────────────────────
  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);

      if (event === 'SIGNED_OUT') {
        queryClient.clear();
        router.replace('/login');
        return;
      }

      if (event === 'SIGNED_IN') {
        router.refresh();
      }
      // TOKEN_REFRESHED / USER_UPDATED: just keep `user` in sync — no nav.
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);

  // ── Profile query ─────────────────────────────────────────────────────────
  // Single source of truth for the profile row. Auto-creates one on first
  // sign-in (Google OAuth users won't have a profile until we make one).
  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: existing, error } = await getProfile(user.id);
      if (error && error.code !== 'PGRST116') throw error;
      if (existing) return existing;

      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'Trainer';
      const { data: created, error: createError } = await createProfile(user.id, name);
      if (createError) throw createError;
      return created;
    },
  });

  const profile = profileQuery.data ?? null;

  const setProfile = useCallback((next) => {
    if (!user?.id) return;
    queryClient.setQueryData(['profile', user.id], next);
  }, [queryClient, user?.id]);

  const refreshProfile = useCallback(() => {
    if (!user?.id) return;
    queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
  }, [queryClient, user?.id]);

  // ── Auth actions ──────────────────────────────────────────────────────────
  const signUp = useCallback((email, password) => authSignUp(email, password), []);
  const signIn = useCallback((email, password) => authSignIn(email, password), []);

  const signOut = useCallback(async () => {
    const { error } = await authSignOut();
    queryClient.clear();
    setUser(null);
    router.replace('/login');
    return { error };
  }, [router, queryClient]);

  // Last-resort: clear everything and force-reload to /login. Used when the
  // normal sign-out can't reach the network.
  const forceSignOut = useCallback(() => {
    queryClient.clear();
    setUser(null);
    if (typeof window !== 'undefined') window.location.replace('/login');
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        setProfile,
        refreshProfile,
        loading: profileQuery.isLoading && !!user,
        signUp,
        signIn,
        signOut,
        forceSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
