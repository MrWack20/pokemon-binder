import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signUp as authSignUp,
  signIn as authSignIn,
  signOut as authSignOut,
  onAuthStateChange,
} from '../services/supabaseAuth.js';
import { getProfile, createProfile } from '../services/profileService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety net: if Supabase never fires (missing env vars, network error),
    // stop the spinner after 8 seconds so the user at least reaches the login page.
    const timeout = setTimeout(() => setLoading(false), 8000);

    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      clearTimeout(timeout);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        try {
          await ensureProfile(currentUser);
        } catch (err) {
          console.error('ensureProfile failed:', err);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
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
