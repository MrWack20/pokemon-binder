import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signUp as authSignUp,
  signIn as authSignIn,
  signOut as authSignOut,
  onAuthStateChange,
  getCurrentUser,
} from '../services/supabaseAuth.js';
import { getProfile, createProfile } from '../services/profileService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Bootstrap: check if there's already a session on mount
  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await ensureProfile(currentUser);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Fetch or create the Supabase profile row for a user.
   * Called on every sign-in and auth state change.
   */
  async function ensureProfile(currentUser) {
    const { data: existingProfile } = await getProfile(currentUser.id);
    if (existingProfile) {
      setProfile(existingProfile);
    } else {
      // First sign-up: create the profile row
      const displayName =
        currentUser.user_metadata?.full_name ||
        currentUser.user_metadata?.name ||
        currentUser.email?.split('@')[0] ||
        'Trainer';
      const { data: newProfile } = await createProfile(currentUser.id, displayName);
      setProfile(newProfile);
    }
  }

  async function signUp(email, password) {
    const { data, error } = await authSignUp(email, password);
    return { data, error };
  }

  async function signIn(email, password) {
    const { data, error } = await authSignIn(email, password);
    return { data, error };
  }

  async function signOut() {
    const { error } = await authSignOut();
    if (!error) {
      setUser(null);
      setProfile(null);
    }
    return { error };
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Convenience hook — throws if used outside AuthProvider */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
